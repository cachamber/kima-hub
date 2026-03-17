import { test, expect } from "@playwright/test";
import { loginAsTestUser, getAuthToken } from "./fixtures/test-helpers";

// ---------------------------------------------------------------------------
// Regression tests for POST /api/browse/playlists/parse
// Covers the URL routing logic added/fixed as part of issue #155.
// ---------------------------------------------------------------------------

test.describe("Import URL parsing", () => {
    test.beforeEach(async ({ page }) => {
        await loginAsTestUser(page);
    });

    async function parse(page: Parameters<typeof loginAsTestUser>[0], url: string) {
        const token = await getAuthToken(page);
        return page.request.post("/api/browse/playlists/parse", {
            data: { url },
            headers: { Authorization: `Bearer ${token}` },
        });
    }

    test("Deezer playlist URL is parsed correctly", async ({ page }) => {
        const res = await parse(page, "https://www.deezer.com/playlist/1313621735");
        expect(res.ok()).toBe(true);
        const data = await res.json() as { source: string; type: string; id: string };
        expect(data.source).toBe("deezer");
        expect(data.type).toBe("playlist");
        expect(data.id).toBe("1313621735");
    });

    test("Spotify playlist URL is parsed correctly", async ({ page }) => {
        const res = await parse(page, "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M");
        expect(res.ok()).toBe(true);
        const data = await res.json() as { source: string; type: string; id: string };
        expect(data.source).toBe("spotify");
        expect(data.type).toBe("playlist");
        expect(data.id).toBe("37i9dQZF1DXcBWIGoYBM5M");
    });

    // Regression for #155 -- YouTube Music URLs were silently rejected before the fix
    test("YouTube Music playlist URL is parsed correctly", async ({ page }) => {
        const res = await parse(page, "https://music.youtube.com/playlist?list=PLRBp0Fe2GpgmgoscNFLxNyBVSFVdYmFbR");
        expect(res.ok()).toBe(true);
        const data = await res.json() as { source: string; type: string; id: string };
        expect(data.source).toBe("youtube");
        expect(data.type).toBe("playlist");
        expect(data.id).toBe("PLRBp0Fe2GpgmgoscNFLxNyBVSFVdYmFbR");
    });

    test("youtube.com playlist URL is parsed correctly", async ({ page }) => {
        const res = await parse(page, "https://www.youtube.com/playlist?list=PLRBp0Fe2GpgmgoscNFLxNyBVSFVdYmFbR");
        expect(res.ok()).toBe(true);
        const data = await res.json() as { source: string; type: string; id: string };
        expect(data.source).toBe("youtube");
        expect(data.type).toBe("playlist");
        expect(data.id).toBe("PLRBp0Fe2GpgmgoscNFLxNyBVSFVdYmFbR");
    });

    test("invalid URL returns 400", async ({ page }) => {
        const res = await parse(page, "https://soundcloud.com/artist/track");
        expect(res.status()).toBe(400);
        const data = await res.json() as { error: string };
        expect(data.error).toMatch(/YouTube/i);
    });

    test("missing URL body returns 400", async ({ page }) => {
        const token = await getAuthToken(page);
        const res = await page.request.post("/api/browse/playlists/parse", {
            data: {},
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(res.status()).toBe(400);
    });
});
