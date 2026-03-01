import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { audioEngine } from "@/lib/audio-engine";

interface PreviewableTrack {
    id: string;
    title: string;
    previewUrl?: string | null;
}

export function useTrackPreview<T extends PreviewableTrack>() {
    const { toast } = useToast();
    const [previewTrack, setPreviewTrack] = useState<string | null>(null);
    const [previewPlaying, setPreviewPlaying] = useState(false);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const mainPlayerWasPausedRef = useRef(false);
    const previewRequestIdRef = useRef(0);
    const noPreviewTrackIdsRef = useRef<Set<string>>(new Set());
    const toastShownForNoPreviewRef = useRef<Set<string>>(new Set());
    const inFlightTrackIdRef = useRef<string | null>(null);

    const logPreviewDebug = (
        message: string,
        details?: Record<string, unknown>
    ) => {
        if (details) {
            console.debug(`[PreviewDebug] ${message}`, details);
            return;
        }
        console.debug(`[PreviewDebug] ${message}`);
    };

    const isAbortError = (err: unknown) => {
        if (!err || typeof err !== "object") return false;
        const e = err as Record<string, unknown>;
        const name = typeof e.name === "string" ? e.name : "";
        const code = typeof e.code === "number" ? e.code : undefined;
        const message = typeof e.message === "string" ? e.message : "";
        return (
            name === "AbortError" ||
            code === 20 ||
            message.includes("interrupted by a call to pause")
        );
    };

    const showNoPreviewToast = (trackId: string) => {
        if (toastShownForNoPreviewRef.current.has(trackId)) return;
        toastShownForNoPreviewRef.current.add(trackId);
        toast.info("No Deezer preview available");
    };

    const handlePreview = async (
        track: T,
        artistName: string,
        e: React.MouseEvent
    ) => {
        e.stopPropagation();
        logPreviewDebug("Preview requested", {
            trackId: track.id,
            trackTitle: track.title,
            artistName,
            hasInlinePreviewUrl: !!track.previewUrl,
            previewTrack,
            previewPlaying,
        });

        // If the same track is playing, pause it
        if (previewTrack === track.id && previewPlaying) {
            logPreviewDebug("Pausing currently playing preview", {
                trackId: track.id,
            });
            previewAudioRef.current?.pause();
            setPreviewPlaying(false);
            return;
        }

        // If the same track is paused, resume it
        if (previewTrack === track.id && !previewPlaying && previewAudioRef.current) {
            try {
                logPreviewDebug("Resuming paused preview", { trackId: track.id });
                await previewAudioRef.current.play();
            } catch (err: unknown) {
                if (isAbortError(err)) return;
                console.error("Preview error:", err);
            }
            setPreviewPlaying(true);
            return;
        }

        // Different track -- stop current and fully destroy old Audio element
        if (previewAudioRef.current) {
            logPreviewDebug("Stopping previous preview before starting new one", {
                previousTrackId: previewTrack,
                nextTrackId: track.id,
            });
            previewAudioRef.current.pause();
            previewAudioRef.current.src = "";
            previewAudioRef.current.load();
            previewAudioRef.current = null;
        }

        try {
            if (inFlightTrackIdRef.current === track.id) return;
            if (
                noPreviewTrackIdsRef.current.has(track.id) &&
                !track.previewUrl
            ) {
                logPreviewDebug("Skipping request: track marked no-preview", {
                    trackId: track.id,
                    trackTitle: track.title,
                });
                showNoPreviewToast(track.id);
                return;
            }

            const requestId = ++previewRequestIdRef.current;
            inFlightTrackIdRef.current = track.id;

            let resolvedPreviewUrl = track.previewUrl || null;

            if (!resolvedPreviewUrl) {
                logPreviewDebug("Fetching preview URL from API", {
                    trackId: track.id,
                    trackTitle: track.title,
                    artistName,
                });
                const response = await api.getTrackPreview(artistName, track.title);
                if (requestId !== previewRequestIdRef.current) return;
                resolvedPreviewUrl = response.previewUrl || null;
                logPreviewDebug("Preview URL fetch result", {
                    trackId: track.id,
                    hasPreviewUrl: !!resolvedPreviewUrl,
                    previewUrl: resolvedPreviewUrl,
                });

                if (!resolvedPreviewUrl) {
                    noPreviewTrackIdsRef.current.add(track.id);
                    showNoPreviewToast(track.id);
                    return;
                }
            } else {
                logPreviewDebug("Using inline preview URL", {
                    trackId: track.id,
                    previewUrl: resolvedPreviewUrl,
                });
            }

            if (audioEngine.isPlaying()) {
                audioEngine.pause();
                mainPlayerWasPausedRef.current = true;
            }

            const audio = new Audio(resolvedPreviewUrl);
            previewAudioRef.current = audio;

            audio.oncanplay = () => {
                logPreviewDebug("Audio can play", {
                    trackId: track.id,
                    src: audio.currentSrc || audio.src,
                    readyState: audio.readyState,
                    networkState: audio.networkState,
                });
            };

            audio.onloadedmetadata = () => {
                logPreviewDebug("Audio metadata loaded", {
                    trackId: track.id,
                    src: audio.currentSrc || audio.src,
                    duration: audio.duration,
                });
            };

            audio.onended = () => {
                logPreviewDebug("Preview ended", {
                    trackId: track.id,
                    src: audio.currentSrc || audio.src,
                });
                setPreviewPlaying(false);
                setPreviewTrack(null);
                if (mainPlayerWasPausedRef.current) {
                    audioEngine.play();
                    mainPlayerWasPausedRef.current = false;
                }
            };

            audio.onerror = () => {
                logPreviewDebug("Audio playback error", {
                    trackId: track.id,
                    src: audio.currentSrc || audio.src,
                    errorCode: audio.error?.code,
                    errorMessage: audio.error?.message,
                    readyState: audio.readyState,
                    networkState: audio.networkState,
                });
                toast.error("Failed to play preview");
                setPreviewPlaying(false);
                setPreviewTrack(null);
                if (mainPlayerWasPausedRef.current) {
                    audioEngine.play();
                    mainPlayerWasPausedRef.current = false;
                }
            };

            try {
                logPreviewDebug("Starting audio.play()", {
                    trackId: track.id,
                    src: audio.currentSrc || audio.src,
                });
                await audio.play();
            } catch (err: unknown) {
                if (isAbortError(err)) return;
                logPreviewDebug("audio.play() rejected", {
                    trackId: track.id,
                    src: audio.currentSrc || audio.src,
                    error:
                        err instanceof Error
                            ? { name: err.name, message: err.message }
                            : { value: String(err) },
                });
                throw err;
            }

            logPreviewDebug("Preview started", {
                trackId: track.id,
                src: audio.currentSrc || audio.src,
            });
            setPreviewTrack(track.id);
            setPreviewPlaying(true);
        } catch (error: unknown) {
            if (isAbortError(error)) return;
            logPreviewDebug("Preview request failed", {
                trackId: track.id,
                trackTitle: track.title,
                error:
                    error instanceof Error
                        ? { name: error.name, message: error.message }
                        : { value: String(error) },
            });
            if (
                typeof error === "object" &&
                error !== null &&
                (((error as Record<string, unknown>).error as unknown) ===
                    "Preview not found" ||
                    /preview not found/i.test(
                        String((error as Record<string, unknown>).message || "")
                    ))
            ) {
                noPreviewTrackIdsRef.current.add(track.id);
                showNoPreviewToast(track.id);
                return;
            }
            console.error("Failed to play preview:", error);
            toast.error("Failed to play preview");
            setPreviewPlaying(false);
            setPreviewTrack(null);
        } finally {
            if (inFlightTrackIdRef.current === track.id) {
                inFlightTrackIdRef.current = null;
            }
        }
    };

    useEffect(() => {
        const stopPreview = () => {
            if (previewAudioRef.current) {
                previewAudioRef.current.pause();
                previewAudioRef.current.src = "";
                previewAudioRef.current.load();
                previewAudioRef.current = null;
                setPreviewPlaying(false);
                setPreviewTrack(null);
                mainPlayerWasPausedRef.current = false;
            }
        };

        audioEngine.on("play", stopPreview);
        return () => {
            audioEngine.off("play", stopPreview);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (previewAudioRef.current) {
                previewAudioRef.current.pause();
                previewAudioRef.current.src = "";
                previewAudioRef.current.load();
                previewAudioRef.current = null;
            }
            if (mainPlayerWasPausedRef.current) {
                audioEngine.play();
                mainPlayerWasPausedRef.current = false;
            }
        };
    }, []);

    return {
        previewTrack,
        previewPlaying,
        handlePreview,
    };
}
