import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { useDownloadContext } from '@/lib/download-context';
import {
  type DownloadedFile,
  fetchTrackForLocalSave,
  saveFilesAsZip,
  triggerDownload,
} from '@/lib/local-save';
import { Artist, Album } from '../types';

function getTrackNumber(track: { trackNo?: number; trackNumber?: number; displayTrackNo?: number }): number {
  return track.trackNo || track.trackNumber || track.displayTrackNo || 0;
}

export function useDownloadActions() {
  const { toast } = useToast();
  const { addPendingDownload, isPendingByMbid } = useDownloadContext();

  const downloadArtist = useCallback(
    async (artist: Artist | null) => {
      if (!artist) {
        toast.error('No artist selected');
        return;
      }

      if (!artist.mbid) {
        toast.error('Artist MBID not available');
        return;
      }

      // Check if already downloading
      if (isPendingByMbid(artist.mbid)) {
        toast.info(`${artist.name} is already being downloaded`);
        return;
      }

      try {
        // Add to pending downloads
        addPendingDownload('artist', artist.name, artist.mbid);

        toast.info(`Preparing download: "${artist.name}"...`);

        // Trigger download
        await api.downloadArtist(artist.name, artist.mbid);

        toast.success(`Downloading ${artist.name}`);
      } catch (error: unknown) {
        console.error('Failed to download artist:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to download artist');
      }
    },
    [toast, addPendingDownload, isPendingByMbid]
  );

  const downloadAlbum = useCallback(
    async (album: Album, artistName: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Get MBID (prefer rgMbid, fallback to mbid)
      const mbid = album.rgMbid || album.mbid;

      if (!mbid) {
        toast.error('Album MBID not available');
        return;
      }

      // Check if already downloading
      if (isPendingByMbid(mbid)) {
        toast.info(`${album.title} is already being downloaded`);
        return;
      }

      try {
        // Add to pending downloads
        addPendingDownload('album', `${artistName} - ${album.title}`, mbid);

        toast.info(`Preparing download: "${album.title}"...`);

        // Trigger download
        await api.downloadAlbum(artistName, album.title, mbid);

        toast.success(`Downloading ${album.title}`);
      } catch (error: unknown) {
        console.error('Failed to download album:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to download album');
      }
    },
    [toast, addPendingDownload, isPendingByMbid]
  );

  const saveAlbumLocally = useCallback(
    async (album: Album, artistName: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        const albumData = await api.getAlbum(album.id);
        const tracks = albumData?.tracks || [];

        if (!tracks.length) {
          toast.error('No tracks available to save');
          return;
        }

        const displayAlbumTitle = album.displayTitle || album.title;
        toast.info(`Saving ${tracks.length} track${tracks.length === 1 ? '' : 's'} from "${displayAlbumTitle}"`);

        if (tracks.length === 1) {
          const track = tracks[0];
          const trackNo = getTrackNumber(track);
          const trackPrefix = trackNo > 0 ? `${String(trackNo).padStart(2, '0')} - ` : '';
          const trackTitle = track.displayTitle || track.title;
          const filename = `${artistName || 'Unknown Artist'} - ${displayAlbumTitle} - ${trackPrefix}${trackTitle}`;
          const file = await fetchTrackForLocalSave(track.id, filename);
          triggerDownload(file.blob, file.filename);
          toast.success(`Saved 1 track from "${displayAlbumTitle}"`);
          return;
        }

        const files: DownloadedFile[] = [];
        let failed = 0;
        const resolvedArtistName = artistName || 'Unknown Artist';

        for (const track of tracks) {
          const trackNo = getTrackNumber(track);
          const trackPrefix = trackNo > 0 ? `${String(trackNo).padStart(2, '0')} - ` : '';
          const trackTitle = track.displayTitle || track.title;
          const filename = `${resolvedArtistName} - ${displayAlbumTitle} - ${trackPrefix}${trackTitle}`;

          try {
            const file = await fetchTrackForLocalSave(track.id, filename);
            const extension = file.filename.split('.').pop() || 'mp3';
            const trackZipName = trackPrefix + (trackTitle || 'Unknown Track');
            files.push({
              ...file,
              zipPath: `${resolvedArtistName}/${displayAlbumTitle}/${trackZipName}.${extension}`,
            });
          } catch {
            failed += 1;
          }
        }

        if (!files.length) {
          toast.error(`Failed to save tracks from "${displayAlbumTitle}"`);
          return;
        }

        if (tracks.length > 1) {
          toast.info('Creating zip...');
          await saveFilesAsZip(files, `${resolvedArtistName} - ${displayAlbumTitle}`);
        } else {
          triggerDownload(files[0].blob, files[0].filename);
        }

        if (failed === 0) {
          toast.success(`Saved ${files.length} track${files.length === 1 ? '' : 's'} from "${displayAlbumTitle}"`);
          return;
        }

        toast.warning(`Saved ${files.length}, failed ${failed} track${failed === 1 ? '' : 's'}`);
      } catch (error: unknown) {
        console.error('Failed to save album locally:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to save album locally');
      }
    },
    [toast]
  );

  return {
    downloadArtist,
    downloadAlbum,
    saveAlbumLocally,
  };
}
