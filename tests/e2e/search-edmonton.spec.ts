import { expect, test } from '@playwright/test';

// Parses displayed counts such as "3.8k results", "1,234 results", "123 results"
// or "Upcoming (3,838)" into a number (3.8k -> 3800).
function parseCount(text: string): number {
  const match = /(\d[\d,]*(?:\.\d+)?)([km])?\b/i.exec(text);
  if (!match?.[1]) {
    throw new Error(`No count found in "${text}"`);
  }
  const multiplier = { k: 1_000, m: 1_000_000 }[(match[2] ?? '').toLowerCase()] ?? 1;
  return Math.round(Number(match[1].replace(/,/g, '')) * multiplier);
}

type Lot = { title: string; location: string | null; closing: string | null };

test.describe('Edmonton search results', () => {
  test.beforeEach(async ({ page }) => {
    // Results are server-rendered, so DOMContentLoaded is enough; the Upcoming button
    // signals that the results UI is ready.
    await page.goto('/search?freeText=Edmonton', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /^Upcoming/ })).toBeVisible();
  });

  test('shows the Edmonton search context and a positive result total', async ({ page }) => {
    await expect(page.getByRole('textbox', { name: 'Search', exact: true })).toHaveValue(
      'Edmonton',
    );

    const summary = page.getByTestId('search-count-header');
    await expect(summary).toContainText('Edmonton');

    // The summary is abbreviated ("3.8k results"); the Upcoming button has the exact count.
    // Both are dynamic, so only require them to be positive.
    const total = parseCount(await summary.innerText());
    const upcoming = parseCount(
      await page.getByRole('button', { name: /^Upcoming/ }).innerText(),
    );
    console.log(`[SEARCH] total=${total} upcoming=${upcoming}`);

    expect(total).toBeGreaterThan(0);
    expect(upcoming).toBeGreaterThan(0);
  });

  test('renders valid first-page lot information', async ({ page }) => {
    const cards = page.getByTestId(/^searchResultItemCard-/);
    await expect(cards).not.toHaveCount(0);

    // One bulk extraction instead of per-card locator round trips.
    const lots = await cards.evaluateAll((els): Lot[] =>
      els.map((el) => {
        const text = (selector: string) => el.querySelector(selector)?.textContent?.trim() ?? null;
        return {
          title: text('[data-testid="item-card-title-link"]') ?? '',
          location: text('p[title]'),
          closing: text('[data-testid="end-date-section"]'),
        };
      }),
    );
    console.log(`[SEARCH] first titles=${JSON.stringify(lots.slice(0, 5).map((l) => l.title))}`);

    expect(lots.length).toBeGreaterThan(0);
    expect(lots.filter((lot) => lot.title === '')).toEqual([]);
    // Location and closing are optional, but must not be blank when shown.
    expect(lots.filter((lot) => lot.location === '')).toEqual([]);
    expect(lots.filter((lot) => lot.closing === '')).toEqual([]);
    // ...but the selectors must still match at least some current cards.
    expect(lots.some((lot) => Boolean(lot.location))).toBe(true);
    expect(lots.some((lot) => Boolean(lot.closing))).toBe(true);
  });
});
