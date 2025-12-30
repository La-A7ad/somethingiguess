import { test, expect } from "@playwright/test";

test("offline create, then sync and persist", async ({ page }) => {
  await page.goto("/");

  // add list
  await page.getByLabel("new-list-title").fill("Todo");
  await page.getByLabel("add-list").click();
  await expect(page.getByText("Todo")).toBeVisible();

  // add card
  await page.getByLabel("add-card").first().click();
  await page.getByLabel("new-card-title").fill("Task 1");
  await page.getByLabel("inline-save").click();
  await expect(page.getByText("Task 1")).toBeVisible();

  // open card and edit
  await page.getByLabel(/card-/).first().click();
  await page.getByLabel("card-description").fill("Hello");
  await page.getByLabel("save-card").click();

  // force offline and create another card (queued)
  await page.getByLabel("force-offline").check();
  await page.getByLabel("add-card").first().click();
  await page.getByLabel("new-card-title").fill("Offline Task");
  await page.getByLabel("inline-save").click();
  await expect(page.getByText("Offline Task")).toBeVisible();

  // go back online and sync
  await page.getByLabel("force-offline").uncheck();
  await page.getByLabel("sync-now").click();

  // reload to ensure persistence
  await page.reload();
  await expect(page.getByText("Task 1")).toBeVisible();
  await expect(page.getByText("Offline Task")).toBeVisible();
});
