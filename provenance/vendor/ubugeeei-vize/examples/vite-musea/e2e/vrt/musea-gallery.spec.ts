import { test, expect } from "@playwright/test";

const COMPONENTS = [
  "Button",
  "Badge",
  "Card",
  "Input",
  "Alert",
  "Avatar",
] as const;

test.describe("musea gallery", () => {
  test("gallery top page", async ({ page }) => {
    await page.goto("/__musea__");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("gallery-top.png");
  });

  for (const component of COMPONENTS) {
    test(`component - ${component}`, async ({ page }) => {
      await page.goto("/__musea__");
      await page.waitForLoadState("networkidle");

      // Gallery sidebar uses <li class="art-item"> with <span> text, not <a> links
      await page
        .locator(".art-item", { hasText: component })
        .first()
        .click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(
        `component-${component.toLowerCase()}.png`,
      );
    });
  }
});
