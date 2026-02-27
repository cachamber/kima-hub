import { api } from "@/lib/api";
import { useAudioControls } from "@/lib/audio-context";
import { useDownloadContext } from "@/lib/download-context";
import {
    type DownloadedFile,
    fetchTrackForLocalSave,
    saveFilesAsZip,
    triggerDownload,
} from "@/lib/local-save";
import { shuffleArray } from "@/utils/shuffle";
import { useToast } from "@/lib/toast-context";
import { Album, Track } from "../types";

function getTrackNumber(track: Track): number {
    const maybeTrack = track as Track & { trackNo?: number };
    return track.trackNumber || maybeTrack.trackNo || track.displayTrackNo || 0;
}

export function useAlbumActions() {
    const { toast } = useToast();
    // Use controls-only hook to avoid re-renders from playback state changes
    const {
        playTracks,
        playTrack: playTrackAudio,
        addToQueue: addToQueueAudio,
    } = useAudioControls();
    const { addPendingDownload, isPendingByMbid } = useDownloadContext();

    const playAlbum = (album: Album | null, startIndex: number = 0) => {
        if (!album) {
            toast.error("Album data not available");
            return;
        }

        const formattedTracks =
            album.tracks &&
            album.tracks.map((track) => ({
                id: track.id,
                title: track.title,
                duration: track.duration,
                artist: {
                    name: track.artist?.name || album.artist?.name || "",
                    id: track.artist?.id || album.artist?.id || "",
                },
                album: {
                    title: album.title,
                    id: album.id,
                    coverArt: album.coverArt || album.coverUrl,
                },
            }));

        if (formattedTracks) {
            playTracks(formattedTracks, startIndex);
        }
    };

    const shufflePlay = (album: Album | null) => {
        if (!album) {
            toast.error("Album data not available");
            return;
        }

        const formattedTracks =
            album.tracks &&
            album.tracks.map((track) => ({
                id: track.id,
                title: track.title,
                duration: track.duration,
                artist: {
                    name: track.artist?.name || album.artist?.name || "",
                    id: track.artist?.id || album.artist?.id || "",
                },
                album: {
                    title: album.title,
                    id: album.id,
                    coverArt: album.coverArt || album.coverUrl,
                },
            }));

        if (formattedTracks) {
            // Shuffle the tracks array
            const shuffled = shuffleArray(formattedTracks);
            playTracks(shuffled, 0);
        }
    };

    const playTrack = (track: Track, album: Album | null) => {
        if (!album) {
            toast.error("Album data not available");
            return;
        }

        const formattedTrack = {
            id: track.id,
            title: track.title,
            duration: track.duration,
            artist: {
                name: track.artist?.name || album.artist?.name || "",
                id: track.artist?.id || album.artist?.id || "",
            },
            album: {
                title: album.title,
                id: album.id,
                coverArt: album.coverArt || album.coverUrl,
            },
        };

        playTrackAudio(formattedTrack);
    };

    const addToQueue = (track: Track, album: Album | null) => {
        if (!album) {
            toast.error("Album data not available");
            return;
        }

        const formattedTrack = {
            id: track.id,
            title: track.title,
            duration: track.duration,
            artist: {
                name: track.artist?.name || album.artist?.name || "",
                id: track.artist?.id || album.artist?.id || "",
            },
            album: {
                title: album.title,
                id: album.id,
                coverArt: album.coverArt || album.coverUrl,
            },
        };

        addToQueueAudio(formattedTrack);
        toast.success(`Added "${track.title}" to queue`);
    };

    const downloadAlbum = async (album: Album | null, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }

        if (!album) {
            toast.error("Album data not available");
            return;
        }

        const mbid = album.rgMbid || album.mbid || album.id;
        if (!mbid) {
            toast.error("Album MBID not available");
            return;
        }

        if (isPendingByMbid(mbid)) {
            toast.info("Album is already being downloaded");
            return;
        }

        try {
            addPendingDownload("album", album.title, mbid);

            toast.info(`Preparing download: "${album.title}"...`);

            await api.downloadAlbum(
                album.artist?.name || "Unknown Artist",
                album.title,
                mbid
            );

            toast.success(`Downloading "${album.title}"`);
        } catch {
            toast.error("Failed to start album download");
        }
    };

    const saveTrackLocally = async (
        track: Track,
        album: Album | null,
        options?: { silent?: boolean }
    ) => {
        if (!album) {
            if (!options?.silent) {
                toast.error("Album data not available");
            }
            return;
        }

        if (!track?.id) {
            if (!options?.silent) {
                toast.error("Track data not available");
            }
            return;
        }

        const trackNo = getTrackNumber(track) || 1;
        const trackPrefix = trackNo > 0 ? `${String(trackNo).padStart(2, "0")} - ` : "";
        const filename = `${album.artist?.name || "Unknown Artist"} - ${album.title} - ${trackPrefix}${track.displayTitle || track.title}`;

        try {
            const file = await fetchTrackForLocalSave(track.id, filename);
            triggerDownload(file.blob, file.filename);
            if (!options?.silent) {
                toast.success(`Saved "${track.displayTitle || track.title}" locally`);
            }
        } catch {
            if (!options?.silent) {
                toast.error(`Failed to save "${track.displayTitle || track.title}"`);
            }
            throw new Error("Failed to save track");
        }
    };

    const saveAlbumLocally = async (album: Album | null) => {
        if (!album) {
            toast.error("Album data not available");
            return;
        }

        const tracks = album.tracks || [];
        if (!tracks.length) {
            toast.error("No tracks available to save");
            return;
        }

        if (tracks.length === 1) {
            await saveTrackLocally(tracks[0], album);
            return;
        }

        toast.info(`Saving ${tracks.length} track${tracks.length === 1 ? "" : "s"} from "${album.title}"`);

        const files: DownloadedFile[] = [];
        let failed = 0;
        const artistName = album.artist?.name || "Unknown Artist";
        const albumTitle = album.title;

        for (const track of tracks) {
            const trackNo = getTrackNumber(track);
            const trackPrefix =
                trackNo > 0 ? `${String(trackNo).padStart(2, "0")} - ` : "";
            const filename = `${album.artist?.name || "Unknown Artist"} - ${album.title} - ${trackPrefix}${track.displayTitle || track.title}`;

            try {
                const file = await fetchTrackForLocalSave(track.id, filename);
                const extension = file.filename.split(".").pop() || "mp3";
                const trackZipName =
                    trackPrefix +
                    (track.displayTitle || track.title || "Unknown Track");
                files.push({
                    ...file,
                    zipPath: `${artistName}/${albumTitle}/${trackZipName}.${extension}`,
                });
            } catch {
                failed += 1;
            }
        }

        if (!files.length) {
            toast.error(`Failed to save tracks from "${album.title}"`);
            return;
        }

        if (tracks.length > 1) {
            toast.info("Creating zip...");
            await saveFilesAsZip(
                files,
                `${album.artist?.name || "Unknown Artist"} - ${album.title}`
            );
        } else {
            triggerDownload(files[0].blob, files[0].filename);
        }

        if (failed === 0) {
            toast.success(
                `Saved ${files.length} track${files.length === 1 ? "" : "s"} from "${album.title}"`
            );
            return;
        }

        toast.warning(
            `Saved ${files.length}, failed ${failed} track${failed === 1 ? "" : "s"}`
        );
    };

    return {
        playAlbum,
        shufflePlay,
        playTrack,
        addToQueue,
        downloadAlbum,
        saveTrackLocally,
        saveAlbumLocally,
    };
}
