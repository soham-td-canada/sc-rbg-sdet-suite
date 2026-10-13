import { expect, test } from '@playwright/test';
import { openSearch } from '../support/search-page';

test('shows a no-exact-matches message with fallback results for an impossible query', async ({
  page,
}) => {
  const query = 'zzzzqxjv9999';
  await openSearch(page, query);

  await expect(page.getByRole('textbox', { name: 'Search', exact: true })).toHaveValue(query);

  const noMatches = page.getByTestId('zero-exact-matches-title');
  await expect(noMatches).toBeVisible();
  await expect(noMatches).toContainText(query);

  await expect(
    page.getByRole('heading', { level: 3, name: 'Results matching fewer words' }),
  ).toBeVisible();

  // Fallback results are dynamic: require some cards, and none whose title is the query.
  const cards = page.getByTestId(/^searchResultItemCard-/);
  await expect(cards).not.toHaveCount(0);
  const cardCount = await cards.count();
  console.log(`[E2E-NEG] fallback cards=${cardCount}`);

  const titles = await cards.getByTestId('item-card-title-link').allTextContents();
  expect(titles.length).toBeGreaterThan(0);
  expect(titles.filter((title) => title.toLowerCase().includes(query.toLowerCase()))).toEqual([]);
});
