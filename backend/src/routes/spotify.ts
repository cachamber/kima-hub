import { Router } from "express";
import { withRetry } from "../utils/async";
import { logger } from "../utils/logger";
import { requireAuthOrToken } from "../middleware/auth";
import { safeError } from "../utils/errors";
import { z } from "zod";
import { spotifyService } from "../services/spotify";
import { spotifyImportService } from "../services/spotifyImport";
import { deezerService } from "../services/deezer";
import { readSessionLog, getSessionLogPath } from "../utils/playlistLogger";

const router = Router();

// All routes require authentication
router.use(requireAuthOrToken);

// Validation schemas
const parseUrlSchema = z.object({
    url: z.string().url(),
});

const importSchema = z.object({
    spotifyPlaylistId: z.string(),
    url: z.string().url().optional(),
    playlistName: z.string().min(1).max(200),
    albumMbidsToDownload: z.array(z.string()),
    previewJobId: z.string().optional(),
});

/**
 * POST /api/spotify/parse
 * Parse a Spotify URL and return basic info
 */
router.post("/parse", async (req, res) => {
    try {
        const { url } = parseUrlSchema.parse(req.body);

        const parsed = spotifyService.parseUrl(url);
        if (!parsed) {
            return res.status(400).json({
                error: "Invalid Spotify URL. Please provide a valid playlist URL.",
            });
        }

        // For now, only support playlists
        if (parsed.type !== "playlist") {
            return res.status(400).json({
                error: `Only playlist imports are supported. Got: ${parsed.type}`,
            });
        }

        res.json({
            type: parsed.type,
            id: parsed.id,
            url: `https://open.spotify.com/playlist/${parsed.id}`,
        });
    } catch (error) {
        if (error instanceof Error && error.name === "ZodError") {
            return res.status(400).json({ error: "Invalid request body" });
        }
        safeError(res, "Spotify parse", error);
    }
});

/**
 * POST /api/spotify/preview/start
 * Start a background preview job and return a job ID immediately.
 * Progress is streamed via SSE (preview:progress / preview:complete).
 */
router.post("/preview/start", async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { url } = parseUrlSchema.parse(req.body);
        logger.debug(`[Playlist Import] Starting preview job for: ${url}`);
        const { jobId } = await spotifyImportService.startPreviewJob(url, req.user.id);
        res.json({ jobId });
    } catch (error) {
        if (error instanceof Error && error.name === "ZodError") {
            return res.status(400).json({ error: "Invalid request body" });
        }
        safeError(res, "Playlist preview start", error);
    }
});

/**
 * GET /api/spotify/preview/:jobId
 * Poll for a completed preview result stored in Redis.
 * Returns { status: "pending" } while the background job is still running.
 */
router.get("/preview/:jobId", async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { jobId } = req.params;
        const result = await spotifyImportService.getPreviewResult(jobId);
        if (!result) {
            return res.json({ status: "pending" });
        }
        if (result.userId && result.userId !== req.user.id) {
            return res.status(403).json({ error: "Not authorized to view this preview" });
        }
        res.json(result);
    } catch (error) {
        safeError(res, "Playlist preview fetch", error);
    }
});

/**
 * POST /api/spotify/import
 * Start importing a Spotify playlist
 */
router.post("/import", async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { spotifyPlaylistId, url, playlistName, albumMbidsToDownload, previewJobId } =
            importSchema.parse(req.body);
        const userId = req.user.id;

        let preview;
        if (previewJobId) {
            // Use cached preview from the async preview job
            const stored = await spotifyImportService.getPreviewResult(previewJobId);
            if (!stored || stored.status !== "completed" || !stored.preview) {
                return res.status(400).json({
                    error: "Preview not ready or expired. Please generate a new preview.",
                });
            }
            if (stored.userId && stored.userId !== userId) {
                return res.status(403).json({ error: "Not authorized to use this preview" });
            }
            preview = stored.preview;
        } else {
            // Fallback: regenerate synchronously (backwards compatibility)
            const effectiveUrl =
                url?.trim() ||
                `https://open.spotify.com/playlist/${spotifyPlaylistId}`;

            if (effectiveUrl.includes("deezer.com")) {
                const deezerMatch = effectiveUrl.match(/playlist[\/:](\d+)/);
                if (!deezerMatch) {
                    return res
                        .status(400)
                        .json({ error: "Invalid Deezer playlist URL" });
                }
                const playlistId = deezerMatch[1];
                const deezerPlaylist = await withRetry(() => deezerService.getPlaylist(playlistId));
                if (!deezerPlaylist) {
                    return res
                        .status(404)
                        .json({ error: "Deezer playlist not found" });
                }
                preview = await spotifyImportService.generatePreviewFromDeezer(deezerPlaylist);
            } else {
                preview = await spotifyImportService.generatePreview(effectiveUrl);
            }
        }

        logger.debug(
            `[Spotify Import] Starting import for user ${userId}: ${playlistName}`
        );
        logger.debug(
            `[Spotify Import] Downloading ${albumMbidsToDownload.length} albums`
        );

        const job = await spotifyImportService.startImport(
            userId,
            spotifyPlaylistId,
            playlistName,
            albumMbidsToDownload,
            preview
        );

        res.json({
            jobId: job.id,
            status: job.status,
            message: "Import started",
        });
    } catch (error) {
        if (error instanceof Error && error.name === "ZodError") {
            return res.status(400).json({ error: "Invalid request body" });
        }
        safeError(res, "Spotify import", error);
    }
});

/**
 * GET /api/spotify/import/:jobId/status
 * Get the status of an import job
 */
router.get("/import/:jobId/status", async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { jobId } = req.params;
        const userId = req.user.id;

        const job = await spotifyImportService.getJob(jobId);
        if (!job) {
            return res.status(404).json({ error: "Import job not found" });
        }

        // Ensure user owns this job
        if (job.userId !== userId) {
            return res
                .status(403)
                .json({ error: "Not authorized to view this job" });
        }

        res.json(job);
    } catch (error) {
        safeError(res, "Spotify job status", error);
    }
});

/**
 * GET /api/spotify/imports
 * Get all import jobs for the current user
 */
router.get("/imports", async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const userId = req.user.id;
        const jobs = await spotifyImportService.getUserJobs(userId);
        res.json(jobs);
    } catch (error) {
        safeError(res, "Spotify imports", error);
    }
});

/**
 * POST /api/spotify/import/:jobId/refresh
 * Re-match pending tracks and add newly downloaded ones to the playlist
 */
router.post("/import/:jobId/refresh", async (req, res) => {
    try {
        const { jobId } = req.params;
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        const userId = req.user.id;

        const job = await spotifyImportService.getJob(jobId);
        if (!job) {
            return res.status(404).json({ error: "Import job not found" });
        }

        // Ensure user owns this job
        if (job.userId !== userId) {
            return res
                .status(403)
                .json({ error: "Not authorized to refresh this job" });
        }

        const result = await spotifyImportService.refreshJobMatches(jobId);

        res.json({
            message:
                result.added > 0
                    ? `Added ${result.added} newly downloaded track(s)`
                    : "No new tracks found yet. Albums may still be downloading.",
            added: result.added,
            total: result.total,
        });
    } catch (error) {
        safeError(res, "Spotify refresh", error);
    }
});

/**
 * POST /api/spotify/import/:jobId/cancel
 * Cancel an import job and create playlist with whatever succeeded
 */
router.post("/import/:jobId/cancel", async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user!.id;

        const job = await spotifyImportService.getJob(jobId);
        if (!job) {
            return res.status(404).json({ error: "Import job not found" });
        }

        // Ensure user owns this job
        if (job.userId !== userId) {
            return res
                .status(403)
                .json({ error: "Not authorized to cancel this job" });
        }

        const result = await spotifyImportService.cancelJob(jobId);

        res.json({
            message: result.playlistCreated
                ? `Import cancelled. Playlist created with ${result.tracksMatched} track(s).`
                : "Import cancelled. No tracks were downloaded.",
            playlistId: result.playlistId,
            tracksMatched: result.tracksMatched,
        });
    } catch (error) {
        safeError(res, "Spotify cancel", error);
    }
});

/**
 * GET /api/spotify/import/session-log
 * Get the current session log for debugging import issues
 */
router.get("/import/session-log", async (req, res) => {
    try {
        const log = readSessionLog();
        const logPath = getSessionLogPath();

        res.json({
            path: logPath,
            content: log,
        });
    } catch (error) {
        safeError(res, "Session log", error);
    }
});

export default router;
