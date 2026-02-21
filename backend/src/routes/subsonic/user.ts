import { Router } from "express";
import { prisma } from "../../utils/db";
import { subsonicOk, subsonicError, SubsonicError } from "../../utils/subsonicResponse";
import { mapSong, firstArtistGenre, wrap, parseIntParam } from "./mappers";

export const userRouter = Router();

// ===================== USER =====================

userRouter.all("/getUser.view", wrap(async (req, res) => {
    const requested = req.query.username as string | undefined;
    if (requested && requested !== req.user!.username) {
        return subsonicError(req, res, SubsonicError.NOT_AUTHORIZED, "Access denied");
    }
    return subsonicOk(req, res, {
        user: {
            "@_username": req.user!.username,
            "@_scrobblingEnabled": true,
            "@_adminRole": req.user!.role === "admin",
            "@_settingsRole": true,
            "@_downloadRole": true,
            "@_uploadRole": false,
            "@_playlistRole": true,
            "@_coverArtRole": false,
            "@_commentRole": false,
            "@_podcastRole": false,
            "@_streamRole": true,
            "@_jukeboxRole": false,
            "@_shareRole": false,
            folder: [1],
        },
    });
}));

// ===================== STARRED =====================

userRouter.all(["/getStarred2.view", "/getStarred.view"], wrap(async (req, res) => {
    const userId = req.user!.id;
    const liked = await prisma.likedTrack.findMany({
        where: { userId },
        include: {
            track: {
                include: {
                    album: {
                        include: {
                            artist: { select: { id: true, name: true, displayName: true, genres: true, userGenres: true } },
                        },
                    },
                },
            },
        },
        orderBy: { likedAt: "desc" },
    });

    const key = req.path.includes("getStarred2") ? "starred2" : "starred";
    return subsonicOk(req, res, {
        [key]: {
            ...(liked.length > 0 ? {
                song: liked.map((l) => {
                    const t = l.track;
                    const artistName = t.album.artist.displayName || t.album.artist.name;
                    const genre = firstArtistGenre(t.album.artist.genres, t.album.artist.userGenres);
                    return {
                        ...mapSong(t, t.album, artistName, t.album.artist.id, genre),
                        "@_starred": l.likedAt.toISOString(),
                    };
                }),
            } : {}),
        },
    });
}));

// star.view — only track starring (Kima's LikedTrack model); albumId/artistId params silently ignored
userRouter.all("/star.view", wrap(async (req, res) => {
    const userId = req.user!.id;
    const raw = req.query.id;
    const ids: string[] = Array.isArray(raw) ? (raw as string[]) : raw ? [raw as string] : [];

    for (const trackId of ids) {
        await prisma.likedTrack
            .upsert({
                where: { userId_trackId: { userId, trackId } },
                create: { userId, trackId },
                update: {},
            })
            .catch(() => {}); // Absorbs FK violation if trackId doesn't exist
    }
    return subsonicOk(req, res);
}));

userRouter.all("/unstar.view", wrap(async (req, res) => {
    const userId = req.user!.id;
    const raw = req.query.id;
    const ids: string[] = Array.isArray(raw) ? (raw as string[]) : raw ? [raw as string] : [];

    if (ids.length > 0) {
        await prisma.likedTrack.deleteMany({
            where: { userId, trackId: { in: ids } },
        });
    }
    return subsonicOk(req, res);
}));

// ===================== ARTIST INFO =====================

userRouter.all(["/getArtistInfo2.view", "/getArtistInfo.view"], wrap(async (req, res) => {
    const id = req.query.id as string | undefined;
    if (!id) return subsonicError(req, res, SubsonicError.MISSING_PARAM, "Required parameter is missing: id");

    const count = Math.min(parseIntParam(req.query.count as string | undefined, 20), 50);

    const artist = await prisma.artist.findUnique({
        where: { id },
        select: {
            id: true,
            mbid: true,
            summary: true,
            userSummary: true,
            heroUrl: true,
            similarArtistsJson: true,
        },
    });
    if (!artist) return subsonicError(req, res, SubsonicError.NOT_FOUND, "Artist not found");

    const rawSimilar = (artist.similarArtistsJson as Array<{ name: string; mbid?: string; match: number }>) || [];
    const resolvedSimilar: Array<{ id: string; name: string; coverArt: string }> = [];

    if (rawSimilar.length > 0) {
        const top = rawSimilar.slice(0, count);
        const mbids = top.filter((s) => s.mbid).map((s) => s.mbid as string);
        const names = top.map((s) => s.name.toLowerCase());

        const candidates = await prisma.artist.findMany({
            where: {
                OR: [
                    ...(mbids.length > 0 ? [{ mbid: { in: mbids } }] : []),
                    { normalizedName: { in: names } },
                ],
            },
            select: { id: true, name: true, displayName: true, mbid: true, normalizedName: true },
            take: count * 2,
        });

        const usedIds = new Set<string>();
        for (const s of top) {
            const found = candidates.find(
                (a) => !usedIds.has(a.id) &&
                    ((s.mbid && a.mbid === s.mbid) || a.normalizedName === s.name.toLowerCase())
            );
            if (found) {
                usedIds.add(found.id);
                resolvedSimilar.push({
                    id: found.id,
                    name: found.displayName || found.name,
                    coverArt: `ar-${found.id}`,
                });
            }
        }
    }

    const infoKey = req.path.includes("getArtistInfo2") ? "artistInfo2" : "artistInfo";
    return subsonicOk(req, res, {
        [infoKey]: {
            biography: artist.userSummary || artist.summary || undefined,
            musicBrainzId: artist.mbid || undefined,
            "@_coverArt": `ar-${artist.id}`,
            "@_largeImageUrl": artist.heroUrl || undefined,
            "@_smallImageUrl": artist.heroUrl || undefined,
            "@_mediumImageUrl": artist.heroUrl || undefined,
            ...(resolvedSimilar.length > 0 ? {
                similarArtist: resolvedSimilar.map((s) => ({
                    "@_id": s.id,
                    "@_name": s.name,
                    "@_coverArt": s.coverArt,
                })),
            } : {}),
        },
    });
}));
