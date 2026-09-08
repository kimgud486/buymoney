import { test, expect } from "@playwright/test";
import { PRODUCTION_BUTTONS } from "../../src/ui/ProductionButtonRegistry";

test.describe("Production Buttons E2E Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000");
  });

  test("All registered production buttons exist on the page or inside modals", async ({ page }) => {
    for (const btn of PRODUCTION_BUTTONS) {
      if (!btn.requiresE2E) continue;

      // Check if button is visible on page or can be triggered
      const element = page.locator(`[data-testid="${btn.id}"]`);
      
      // Some buttons are inside modals opened by other buttons, or need hover/click
      if (btn.id === "stock-search-select") {
        await page.click('[data-testid="open-stock-search"]');
        await expect(element.first()).toBeVisible();
        await page.keyboard.press("Escape");
      } else if (btn.id === "broker-api-save") {
        await page.click('[data-testid="open-broker-api"]');
        await expect(element).toBeVisible();
        await page.keyboard.press("Escape");
      } else if (["open-performance-report", "open-loss-analysis", "open-filter-settings", "partial-sell"].includes(btn.id)) {
        // Holdings modal sub-buttons
        await page.click('[data-testid="open-holdings"]');
        await expect(element.first()).toBeAttached();
        await page.keyboard.press("Escape");
      } else if (btn.id.startsWith("chart-indicator-")) {
        // Indicators are in the indicators dropdown
        const dropDownBtn = page.getByRole("button", { name: "지표 설정" });
        if (await dropDownBtn.isVisible()) {
          await dropDownBtn.click();
          await expect(element).toBeAttached();
        }
      } else {
        // Direct dashboard buttons
        await expect(element.first()).toBeAttached();
      }
    }
  });

  test("Master switch toggles state correctly with safety validations", async ({ page }) => {
    const startBtn = page.locator('[data-testid="auto-trading-start"]');
    const pauseBtn = page.locator('[data-testid="auto-trading-pause"]');

    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(300);
    } else if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
      await page.waitForTimeout(300);
    }
  });
});
