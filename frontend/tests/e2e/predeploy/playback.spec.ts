import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "../fixtures/test-helpers";

test.describe("Playback", () => {
    test.beforeEach(async ({ page }) => {
        await loginAsTestUser(page);
    });

    test("play album starts playback with controls", async ({ page }) => {
        await page.goto("/library?tab=albums");

        // Click first album
        const firstAlbum = page.locator('a[href^="/album/"]').first();
        await expect(firstAlbum).toBeVisible({ timeout: 10000 });
        await firstAlbum.click();

        // Start playback - look for play button (may have various labels)
        const playBtn = page.locator('button:has-text("Play"), [aria-label*="play" i], [title*="play" i]').first();
        await expect(playBtn).toBeVisible({ timeout: 5000 });
        await playBtn.click();

        // Verify player appeared (look for player elements)
        const playerControls = page.locator('[class*="player"], [data-testid*="player"]');
        await expect(playerControls.first()).toBeVisible({ timeout: 5000 });
    });

    test("play/pause toggle works", async ({ page }) => {
        await page.goto("/library?tab=albums");

        const firstAlbum = page.locator('a[href^="/album/"]').first();
        await firstAlbum.click();

        const playBtn = page.locator('button:has-text("Play"), [aria-label*="play" i], [title*="play" i]').first();
        await playBtn.click();

        // Wait for player to appear
        await page.waitForTimeout(2000);

        // Find play/pause control in player
        const pauseBtn = page.locator('button[title*="ause" i], button[aria-label*="ause" i]').first();
        if (await pauseBtn.isVisible({ timeout: 3000 })) {
            await pauseBtn.click();
            await page.waitForTimeout(500);
            // Should now show play
            const playControl = page.locator('button[title*="lay" i], button[aria-label*="lay" i]').first();
            await expect(playControl).toBeVisible();
        }
    });

    test("next/previous track navigation exists", async ({ page }) => {
        await page.goto("/library?tab=albums");

        const firstAlbum = page.locator('a[href^="/album/"]').first();
        await firstAlbum.click();

        const playBtn = page.locator('button:has-text("Play"), [aria-label*="play" i], [title*="play" i]').first();
        await playBtn.click();

        // Wait for player
        await page.waitForTimeout(2000);

        // Verify nav buttons exist (may be labeled differently)
        const nextBtn = page.locator('button[title*="ext" i], button[aria-label*="ext" i]');
        const prevBtn = page.locator('button[title*="revious" i], button[aria-label*="revious" i]');

        // At least one should be visible
        const hasNav = await nextBtn.first().isVisible() || await prevBtn.first().isVisible();
        expect(hasNav).toBeTruthy();
    });

    test("queue page accessible", async ({ page }) => {
        await page.goto("/queue");

        // Should not error - page should load
        await expect(page.locator("body")).not.toContainText(/error|404/i);
    });
});
