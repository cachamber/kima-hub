import { describe, it, expect, beforeEach, afterAll, jest } from '@jest/globals';

// Mock p-queue to avoid ESM issues
jest.mock('p-queue', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn((fn: any) => fn()),
    concurrency: 4,
    size: 0,
    pending: 0,
  }));
});

// Mock external services to isolate deduplication logic
jest.mock('../../src/services/soulseek', () => ({
  soulseekService: {
    isAvailable: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
  },
}));

jest.mock('../../src/services/musicbrainz', () => ({
  musicBrainzService: {
    getAlbumTracks: jest.fn<() => Promise<any[]>>().mockResolvedValue([]),
  },
}));

jest.mock('../../src/services/lastfm', () => ({
  lastFmService: {
    getArtistCorrection: jest.fn<() => Promise<any>>().mockResolvedValue(null),
    getAlbumInfo: jest.fn<() => Promise<any>>().mockResolvedValue(null),
  },
}));

jest.mock('../../src/utils/systemSettings', () => ({
  getSystemSettings: jest.fn<() => Promise<any>>().mockResolvedValue({
    musicPath: '/music',
    downloadPath: '/downloads',
    soulseekConcurrentDownloads: 4,
    lidarrEnabled: false,
    downloadSource: 'soulseek',
  }),
}));

import { acquisitionService } from '../../src/services/acquisitionService';
import { prisma } from '../../src/utils/db';
import { redisClient } from '../../src/utils/redis';

describe('AcquisitionService - Deduplication', () => {
  const testUserId = 'test-user-dedup';
  const testBatchId = 'test-batch-dedup';

  beforeEach(async () => {
    // Clean up test data
    await prisma.downloadJob.deleteMany({
      where: {
        userId: testUserId,
      },
    });

    // Ensure test user exists
    await prisma.user.upsert({
      where: { id: testUserId },
      create: {
        id: testUserId,
        username: `test-user-${Date.now()}`,
        passwordHash: 'test-hash',
        role: 'user',
      },
      update: {},
    });

    // Create test batch
    await prisma.discoveryBatch.upsert({
      where: { id: testBatchId },
      create: {
        id: testBatchId,
        userId: testUserId,
        weekStart: new Date(),
        targetSongCount: 40,
        status: 'downloading',
      },
      update: {},
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.downloadJob.deleteMany({
      where: {
        userId: testUserId,
      },
    });
    await prisma.discoveryBatch.deleteMany({
      where: {
        id: testBatchId,
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: testUserId,
      },
    });

    // Close connections
    await redisClient.quit();
    await prisma.$disconnect();
  });

  it('should not create duplicate download jobs for same album', async () => {
    const albumMbid = 'test-mbid-123';

    // Test by directly calling the private createDownloadJob method
    // This isolates the deduplication logic from the full acquisition flow
    const createJob = async () => {
      return await (acquisitionService as any).createDownloadJob(
        {
          albumTitle: 'Test Album',
          artistName: 'Test Artist',
          mbid: albumMbid,
        },
        {
          userId: testUserId,
          discoveryBatchId: testBatchId,
        }
      );
    };

    // Create same job twice concurrently
    const promises = [createJob(), createJob()];

    const results = await Promise.allSettled(promises);

    // Both should complete (one creates, one returns existing)
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled.length).toBe(2);

    // If both succeeded, they should return the same job ID
    if (fulfilled.length === 2) {
      const job1 = (fulfilled[0] as any).value;
      const job2 = (fulfilled[1] as any).value;
      expect(job1.id).toBe(job2.id);
    }

    // Verify only one job exists in DB
    const jobs = await prisma.downloadJob.findMany({
      where: {
        targetMbid: albumMbid,
        userId: testUserId,
        discoveryBatchId: testBatchId,
      },
    });
    expect(jobs.length).toBe(1);
  });

  it('should allow creating job for same album with different batchId', async () => {
    const albumMbid = 'test-mbid-456';
    const request = {
      albumTitle: 'Test Album 2',
      artistName: 'Test Artist 2',
      mbid: albumMbid,
    };

    // Create second batch
    const testBatchId2 = 'test-batch-dedup-2';
    await prisma.discoveryBatch.create({
      data: {
        id: testBatchId2,
        userId: testUserId,
        weekStart: new Date(),
        targetSongCount: 40,
        status: 'downloading',
      },
    });

    // Create job in first batch
    await (acquisitionService as any).createDownloadJob(request, {
      userId: testUserId,
      discoveryBatchId: testBatchId,
    });

    // Create job in second batch (should succeed)
    await (acquisitionService as any).createDownloadJob(request, {
      userId: testUserId,
      discoveryBatchId: testBatchId2,
    });

    // Verify two jobs exist (different batches)
    const jobs = await prisma.downloadJob.findMany({
      where: {
        targetMbid: albumMbid,
        userId: testUserId,
      },
    });
    expect(jobs.length).toBe(2);

    // Clean up
    await prisma.discoveryBatch.delete({
      where: { id: testBatchId2 },
    });
  });

  it('should allow creating new job after previous job completes', async () => {
    const albumMbid = 'test-mbid-789';
    const request = {
      albumTitle: 'Test Album 3',
      artistName: 'Test Artist 3',
      mbid: albumMbid,
    };
    const context = {
      userId: testUserId,
      discoveryBatchId: testBatchId,
    };

    // Create first job
    await (acquisitionService as any).createDownloadJob(request, context);

    // Mark it as completed
    const job = await prisma.downloadJob.findFirst({
      where: {
        targetMbid: albumMbid,
        userId: testUserId,
        discoveryBatchId: testBatchId,
      },
    });
    await prisma.downloadJob.update({
      where: { id: job!.id },
      data: { status: 'completed' },
    });

    // Create second job (should succeed - previous is completed)
    await (acquisitionService as any).createDownloadJob(request, context);

    // Verify two jobs exist (one completed, one pending)
    const jobs = await prisma.downloadJob.findMany({
      where: {
        targetMbid: albumMbid,
        userId: testUserId,
        discoveryBatchId: testBatchId,
      },
    });
    expect(jobs.length).toBe(2);
    expect(jobs.filter((j) => j.status === 'completed').length).toBe(1);
    expect(
      jobs.filter((j) => j.status === 'pending' || j.status === 'downloading')
        .length
    ).toBe(1);
  });
});
