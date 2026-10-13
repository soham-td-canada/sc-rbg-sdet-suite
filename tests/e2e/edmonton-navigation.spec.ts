import { expect, test } from '@playwright/test';

test('navigates from the Canada list to the Edmonton location page', async ({ page }) => {
  await page.goto('/lp');

  const canadaList = page.getByRole('list', { name: 'Canada', exact: true });
  await canadaList.getByRole('link', { name: 'Edmonton', exact: true }).click();

  await expect(page).toHaveURL(/\/lp\/edmonton-ab$/);
  // The destination page has no h1; its identity heading is an h3 inside <main>.
  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Edmonton', level: 3, exact: true }),
  ).toBeVisible();
});
