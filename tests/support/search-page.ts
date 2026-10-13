import { expect, type Page } from '@playwright/test';

// Opens the Search page for a query and waits until the Search application is ready.
// Results are server-rendered, so DOMContentLoaded is enough; the Upcoming button signals
// that the results UI is ready.
export async function openSearch(page: Page, query: string): Promise<void> {
  await page.goto(`/search?freeText=${encodeURIComponent(query)}`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('button', { name: /^Upcoming/ })).toBeVisible();
}
