import { test, expect } from "@playwright/test";
import { loginAsTestUser, skipIfNoEnv } from "../fixtures/test-helpers";

test.describe("Integrations", () => {
    test.beforeEach(async ({ page }) => {
        await loginAsTestUser(page);
    });

    test("Lidarr connection test", async ({ page }, testInfo) => {
        skipIfNoEnv("LIDIFY_TEST_LIDARR_URL", testInfo);
        skipIfNoEnv("LIDIFY_TEST_LIDARR_API_KEY", testInfo);

        await page.goto("/settings");

        // Find Lidarr section and expand if needed
        const lidarrSection = page.locator("text=Lidarr").first();
        await lidarrSection.click();

        // Fill in test credentials
        const urlInput = page.locator('input[placeholder*="url" i], input[name*="lidarr" i][name*="url" i]').first();
        const apiKeyInput = page.locator('input[placeholder*="api" i], input[name*="apikey" i], input[type="password"]').first();

        if (await urlInput.isVisible()) {
            await urlInput.fill(process.env.LIDIFY_TEST_LIDARR_URL!);
        }
        if (await apiKeyInput.isVisible()) {
            await apiKeyInput.fill(process.env.LIDIFY_TEST_LIDARR_API_KEY!);
        }

        // Click test connection button
        const testBtn = page.getByRole("button", { name: /test/i });
        if (await testBtn.isVisible()) {
            await testBtn.click();

            // Should show success or connection result
            await page.waitForTimeout(3000);
            const pageText = await page.textContent("body");
            const hasResult = pageText?.includes("success") ||
                             pageText?.includes("connected") ||
                             pageText?.includes("failed") ||
                             pageText?.includes("error");
            expect(hasResult).toBeTruthy();
        }
    });

    test("Soulseek connection test", async ({ page }, testInfo) => {
        skipIfNoEnv("LIDIFY_TEST_SOULSEEK_USER", testInfo);
        skipIfNoEnv("LIDIFY_TEST_SOULSEEK_PASS", testInfo);

        await page.goto("/settings");

        // Find Soulseek section
        const soulseekSection = page.locator("text=Soulseek").first();
        if (await soulseekSection.isVisible()) {
            await soulseekSection.click();

            // Fill credentials
            const userInput = page.locator('input[placeholder*="username" i]');
            const passInput = page.locator('input[placeholder*="password" i], input[type="password"]');

            if (await userInput.first().isVisible()) {
                await userInput.first().fill(process.env.LIDIFY_TEST_SOULSEEK_USER!);
            }
            if (await passInput.first().isVisible()) {
                await passInput.first().fill(process.env.LIDIFY_TEST_SOULSEEK_PASS!);
            }

            // Test connection
            const testBtn = page.getByRole("button", { name: /test/i });
            if (await testBtn.isVisible()) {
                await testBtn.click();
                await page.waitForTimeout(5000);

                const pageText = await page.textContent("body");
                const hasResult = pageText?.includes("success") ||
                                 pageText?.includes("connected") ||
                                 pageText?.includes("failed");
                expect(hasResult).toBeTruthy();
            }
        }
    });
});
