import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "../fixtures/test-helpers";

test.describe("Settings", () => {
    test.beforeEach(async ({ page }) => {
        await loginAsTestUser(page);
    });

    test("settings page loads all sections", async ({ page }) => {
        await page.goto("/settings");

        await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();

        // Should have key sections
        await expect(page.locator("text=Lidarr")).toBeVisible({ timeout: 5000 });
    });

    test("feature detection shows analyzer status", async ({ page }) => {
        await page.goto("/settings");

        // Look for analyzer-related content
        const pageContent = await page.textContent("body");

        // Should mention audio analysis or vibe in some form
        const hasAnalyzerContent =
            pageContent?.includes("Audio Analysis") ||
            pageContent?.includes("Vibe") ||
            pageContent?.includes("MusicCNN") ||
            pageContent?.includes("CLAP") ||
            pageContent?.includes("lite mode");

        expect(hasAnalyzerContent).toBeTruthy();
    });
});
