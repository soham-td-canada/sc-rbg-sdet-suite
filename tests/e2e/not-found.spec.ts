import { expect, test } from '@playwright/test';

test('shows the not-found page for a nonexistent yard', async ({ page }) => {
  // The site redirects unknown yards to /not-found, which renders as a normal 200 page,
  // so the error state is verified through the page content rather than the HTTP status.
  await page.goto('/lp/this-yard-does-not-exist', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/not-found$/);
  await expect(page).toHaveTitle(/404/i);

  const errorPage = page.getByTestId('error-page');
  await expect(errorPage).toBeVisible();
  await expect(errorPage.getByRole('heading', { level: 2, name: /never existed/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return home', exact: true })).toBeVisible();

  // No yard content is rendered.
  await expect(page.getByTestId('seller-form-body')).toHaveCount(0);
});
