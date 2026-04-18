jest.mock('../../utils/db', () => ({
    prisma: {
        artist: { findMany: jest.fn() },
        album: { findMany: jest.fn() },
        track: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
        trackLyrics: { findUnique: jest.fn(), findFirst: jest.fn(), upsert: jest.fn() },
    },
}));

jest.mock('../../services/search', () => ({
    searchService: {
        searchArtists: jest.fn(),
        searchAlbums: jest.fn(),
        searchTracks: jest.fn(),
    },
}));

jest.mock('../../utils/logger', () => ({
    logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../services/lrclib', () => ({
    lrclibService: {
        fetchLyrics: jest.fn(),
    },
}));

jest.mock('../../services/rateLimiter', () => ({
    rateLimiter: {
        execute: jest.fn(async (_key: string, fn: () => Promise<unknown>) => fn()),
    },
}));

import express from 'express';
import request from 'supertest';
import { prisma } from '../../utils/db';
import { searchService } from '../../services/search';
import { lrclibService } from '../../services/lrclib';
import { searchRouter } from '../subsonic/search';
import { lyricsRouter } from '../subsonic/lyrics';

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        (req as any).user = { id: 'user-1', username: 'chambers', role: 'user' };
        res.locals.subsonicRequestId = 'test-request-id';
        next();
    });
    app.use('/', searchRouter);
    app.use('/', lyricsRouter);
    return app;
}

describe('Subsonic search routes', () => {
    let app: express.Application;

    beforeAll(() => {
        app = makeApp();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('search3 returns paged library data for quoted-empty query', async () => {
        (prisma.artist.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'artist-1',
                name: 'Alpha Artist',
                displayName: null,
                heroUrl: null,
                libraryAlbumCount: 3,
            },
        ]);

        (prisma.album.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'album-1',
                title: 'Alpha Album',
                displayTitle: null,
                year: 2024,
                coverUrl: null,
                userCoverUrl: null,
                artistId: 'artist-1',
                _count: { tracks: 2 },
                artist: {
                    name: 'Alpha Artist',
                    displayName: null,
                    genres: ['Rock'],
                    userGenres: [],
                },
            },
        ]);

        (prisma.track.findMany as jest.Mock).mockResolvedValue([
            {
                id: 'track-1',
                title: 'Alpha Song',
                trackNo: 1,
                discNumber: null,
                duration: 240,
                filePath: '/music/a.flac',
                mime: 'audio/flac',
                fileSize: 123456,
                album: {
                    id: 'album-1',
                    title: 'Alpha Album',
                    displayTitle: null,
                    year: 2024,
                    artistId: 'artist-1',
                    artist: {
                        name: 'Alpha Artist',
                        displayName: null,
                        genres: ['Rock'],
                        userGenres: [],
                    },
                },
            },
        ]);

        const res = await request(app)
            .get('/search3.view')
            .query({
                query: '""',
                artistOffset: '0',
                artistCount: '1',
                albumOffset: '0',
                albumCount: '1',
                songOffset: '0',
                songCount: '1',
                f: 'json',
            });

        expect(res.status).toBe(200);
        expect(res.body['subsonic-response'].status).toBe('ok');

        const result = res.body['subsonic-response'].searchResult3;
        expect(result.artist).toHaveLength(1);
        expect(result.album).toHaveLength(1);
        expect(result.song).toHaveLength(1);

        expect(searchService.searchArtists).not.toHaveBeenCalled();
        expect(searchService.searchAlbums).not.toHaveBeenCalled();
        expect(searchService.searchTracks).not.toHaveBeenCalled();
    });

    it('search2 keeps empty-query behavior and returns empty result payload', async () => {
        const res = await request(app)
            .get('/search2.view')
            .query({
                query: '""',
                artistOffset: '0',
                artistCount: '1',
                albumOffset: '0',
                albumCount: '1',
                songOffset: '0',
                songCount: '1',
                f: 'json',
            });

        expect(res.status).toBe(200);
        expect(res.body['subsonic-response'].status).toBe('ok');
        expect(res.body['subsonic-response'].searchResult).toEqual({});

        expect(prisma.artist.findMany).not.toHaveBeenCalled();
        expect(prisma.album.findMany).not.toHaveBeenCalled();
        expect(prisma.track.findMany).not.toHaveBeenCalled();
    });
});

describe('Subsonic lyrics routes', () => {
    let app: express.Application;

    beforeAll(() => {
        app = makeApp();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('getLyricsBySongId falls back to same-artist same-title lyrics when direct track lyrics are missing', async () => {
        (prisma.track.findUnique as jest.Mock).mockResolvedValue({
            id: 'track-a',
            title: 'Same Song',
            duration: 200,
            album: {
                title: 'Same Album',
                artistId: 'artist-1',
                artist: { name: 'Alpha Artist', displayName: null },
            },
        });

        (prisma.trackLyrics.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.trackLyrics.findFirst as jest.Mock).mockResolvedValue({
            track_id: 'track-b',
            plain_lyrics: 'line one\nline two',
            synced_lyrics: null,
        });

        const res = await request(app)
            .get('/getLyricsBySongId.view')
            .query({ id: 'track-a', f: 'json' });

        expect(res.status).toBe(200);
        expect(res.body['subsonic-response'].status).toBe('ok');

        const list = res.body['subsonic-response'].lyricsList;
        expect(list.structuredLyrics).toHaveLength(1);
        expect(list.structuredLyrics[0].displayTitle).toBe('Same Song');
        expect(list.structuredLyrics[0].line).toEqual([
            { value: 'line one' },
            { value: 'line two' },
        ]);

        expect(prisma.trackLyrics.findFirst).toHaveBeenCalled();
        expect(lrclibService.fetchLyrics).not.toHaveBeenCalled();
    });

    it('getLyricsBySongId fetches and stores lyrics from LRCLIB when db lyrics are missing', async () => {
        (prisma.track.findUnique as jest.Mock).mockResolvedValue({
            id: 'track-a',
            title: 'Same Song',
            duration: 200,
            album: {
                title: 'Same Album',
                artistId: 'artist-1',
                artist: { name: 'Alpha Artist', displayName: null },
            },
        });

        (prisma.trackLyrics.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.trackLyrics.findFirst as jest.Mock).mockResolvedValue(null);
        (lrclibService.fetchLyrics as jest.Mock).mockResolvedValue({
            id: 42,
            plainLyrics: 'api line one\napi line two',
            syncedLyrics: null,
        });
        (prisma.trackLyrics.upsert as jest.Mock).mockResolvedValue({
            track_id: 'track-a',
            plain_lyrics: 'api line one\napi line two',
            synced_lyrics: null,
            source: 'lrclib',
        });

        const res = await request(app)
            .get('/getLyricsBySongId.view')
            .query({ id: 'track-a', f: 'json' });

        expect(res.status).toBe(200);
        expect(res.body['subsonic-response'].status).toBe('ok');

        const list = res.body['subsonic-response'].lyricsList;
        expect(list.structuredLyrics).toHaveLength(1);
        expect(list.structuredLyrics[0].displayTitle).toBe('Same Song');
        expect(list.structuredLyrics[0].line).toEqual([
            { value: 'api line one' },
            { value: 'api line two' },
        ]);

        expect(lrclibService.fetchLyrics).toHaveBeenCalledWith(
            'Same Song',
            'Alpha Artist',
            'Same Album',
            200
        );
        expect(prisma.trackLyrics.upsert).toHaveBeenCalled();
    });
});
