import { expect, test, type Page } from '@playwright/test';

// Each country section is an <h4> followed by a <ul aria-label="<country>">.
const countryList = (page: Page, country: string) =>
  page.getByRole('list', { name: country, exact: true });

test.describe('Locations directory', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lp');
  });

  test('shows the heading, over-60 intro text and satellite note', async ({ page }) => {
    const main = page.getByRole('main');

    await expect(main.getByRole('heading', { name: 'Locations', level: 1 })).toBeVisible();
    await expect(
      main.getByText(/over 60 permanent auction sites and local yards/),
    ).toBeVisible();
    await expect(
      main.getByText(/Satellite sites are represented by an asterisk\.\*/),
    ).toBeVisible();
  });

  test('lists the expected countries, starting with the United States and Canada', async ({
    page,
  }) => {
    const countryHeadings = page.getByRole('main').getByRole('heading', { level: 4 });
    await expect(countryHeadings.nth(0)).toHaveText('United States');
    await expect(countryHeadings.nth(1)).toHaveText('Canada');

    // The UAE section is rendered with the heading "UAE".
    for (const country of [
      'United States',
      'Canada',
      'Australia',
      'United Kingdom',
      'Netherlands',
      'UAE',
    ]) {
      await expect(
        page.getByRole('heading', { name: country, level: 4, exact: true }),
      ).toBeVisible();
      await expect(countryList(page, country).getByRole('listitem')).not.toHaveCount(0);
    }
  });

  test('United States lists more than 20 locations including key yards', async ({ page }) => {
    const usSites = countryList(page, 'United States');

    await expect.poll(() => usSites.getByRole('listitem').count()).toBeGreaterThan(20);
    for (const city of ['Phoenix', 'Salt Lake City', 'Houston', 'Las Vegas', 'Atlanta']) {
      await expect(usSites.getByRole('link', { name: city })).toBeVisible();
    }
  });

  test('Canada lists more than 10 locations including key yards', async ({ page }) => {
    const canadaSites = countryList(page, 'Canada');

    await expect.poll(() => canadaSites.getByRole('listitem').count()).toBeGreaterThan(10);
    for (const city of ['Edmonton', 'Montreal', 'Toronto', 'Regina', 'Saskatoon']) {
      await expect(canadaSites.getByRole('link', { name: city })).toBeVisible();
    }
  });

  test('marks satellite sites with a trailing asterisk and counts both site types', async ({
    page,
  }) => {
    // A satellite site has no dedicated marker in the DOM: its link text ends in "*".
    const directoryLinks = page.getByRole('main').getByRole('list').getByRole('link');
    const satellite = directoryLinks.filter({ hasText: /\*$/ });
    const permanent = directoryLinks.filter({ hasNotText: /\*$/ });

    await expect.poll(() => satellite.count()).toBeGreaterThan(15);
    await expect.poll(() => permanent.count()).toBeGreaterThan(25);
    expect((await satellite.count()) + (await permanent.count())).toBeGreaterThan(60);

    const usSites = countryList(page, 'United States');
    await expect(usSites.getByRole('link', { name: /^San Antonio.*\*$/ })).toBeVisible();
    await expect(usSites.getByRole('link', { name: /^Phoenix[^*]*$/ })).toBeVisible();

    const canadaSites = countryList(page, 'Canada');
    await expect(canadaSites.getByRole('link', { name: /^Calgary.*\*$/ })).toBeVisible();
    await expect(canadaSites.getByRole('link', { name: /^Edmonton[^*]*$/ })).toBeVisible();
  });

  test('switches from Auction sites to Local representatives', async ({ page }) => {
    const auctionSitesTab = page.getByRole('tab', { name: 'Auction sites', exact: true });
    const localRepsTab = page.getByRole('tab', { name: 'Local representatives', exact: true });
    const searchPrompt = page.getByRole('tabpanel').getByText('Search for representatives');

    await expect(auctionSitesTab).toBeVisible();
    await expect(localRepsTab).toBeVisible();
    await expect(searchPrompt).toBeHidden();

    await localRepsTab.click();

    await expect(localRepsTab).toHaveAttribute('aria-selected', 'true');
    await expect(searchPrompt).toBeVisible();
  });
});
