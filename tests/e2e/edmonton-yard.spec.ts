import { expect, test } from '@playwright/test';

test.describe('Edmonton yard page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lp/edmonton-ab');
  });

  // Everything except the Representatives tab lives in the "Details" tabpanel.
  // Each section's heading sits in a plain wrapper <div> that also holds its content,
  // so heading.locator('..') is the narrowest section container.

  test('shows yard identity, address, hours and phone', async ({ page }) => {
    const details = page.getByRole('tabpanel', { name: 'Details', exact: true });
    const detailSection = (heading: string) =>
      details.getByRole('heading', { name: heading, level: 6, exact: true }).locator('..');

    await expect(page).toHaveTitle(/^Edmonton Heavy Equipment Auctions/);
    // The page has no h1; its identity heading is an h3 inside <main>.
    await expect(
      page.getByRole('main').getByRole('heading', { name: 'Edmonton', level: 3, exact: true }),
    ).toBeVisible();

    const address = detailSection('Address');
    await expect(address).toContainText('1500 Sparrow Drive');
    await expect(address).toContainText('Nisku, AB');
    await expect(address).toContainText('T9E 8H6');

    await expect(detailSection('Office hours')).toContainText(
      /Mon\s*-\s*Fri,?\s*\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M/,
    );

    const phone = detailSection('Contacts').getByTestId('contact-phone-link');
    await expect(phone).toBeVisible();
    await expect(phone).toHaveAttribute('href', /^tel:\+?\d{10,}$/);
  });

  test('lists upcoming auction events with dates and titles', async ({ page }) => {
    const eventsSection = page
      .getByRole('heading', { name: 'Auction events', level: 4, exact: true })
      .locator('..');
    const events = eventsSection.getByRole('listitem');

    await expect(eventsSection).toBeVisible();
    await expect(events).not.toHaveCount(0);
    const eventCount = await events.count();

    // Every event card must itself contain a non-empty date and a non-empty h5 title.
    const completeEvents = events
      .filter({ has: page.getByTestId(/^auction-card-date-range-/).filter({ hasText: /\S/ }) })
      .filter({ has: page.getByRole('heading', { level: 5 }).filter({ hasText: /\S/ }) });
    await expect(completeEvents).toHaveCount(eventCount);
  });

  test('shows meaningful About this yard content', async ({ page }) => {
    const about = page
      .getByRole('heading', { name: 'About this yard', level: 4, exact: true })
      .locator('..');

    await expect(about).toBeVisible();
    // toContainText normalises whitespace, including the non-breaking spaces in this copy.
    for (const concept of [/weekdays?/i, /drop-?\s?off/i, /inspect/i, /pick-?\s?up/i]) {
      await expect(about).toContainText(concept);
    }
  });

  test('lists yard item categories with quantities', async ({ page }) => {
    // heading -> header row -> section that also holds the carousel of category cards
    const itemsSection = page
      .getByRole('heading', { name: 'Items in yard', level: 4, exact: true })
      .locator('../..');
    // A category card is a link containing an h6 name and a <p> quantity ("See all" has neither).
    const cards = itemsSection
      .getByRole('link')
      .filter({ has: page.getByRole('heading', { level: 6 }) });

    // The carousel renders every card into the DOM, so no arrow interaction is needed.
    await expect.poll(() => cards.count()).toBeGreaterThan(5);

    const names = (await cards.getByRole('heading', { level: 6 }).allTextContents()).map((t) =>
      t.trim(),
    );
    const quantities = (await cards.getByRole('paragraph').allTextContents()).map((t) =>
      t.trim(),
    );

    expect(names).not.toContain('');
    expect(quantities).toHaveLength(names.length);
    expect(quantities.filter((q) => !/^\d[\d,]* items?$/.test(q))).toEqual([]);
    expect(names).toContain('Excavators');
    // Inventory is dynamic: require any one of several categories seen in production.
    const otherExpected = [
      'Truck Tractors',
      'Skid Steer Attachments',
      'Agricultural Tractors',
      'Harvesting Equipment',
      'Tools',
    ];
    expect(otherExpected.filter((category) => names.includes(category))).not.toEqual([]);
  });

  test('shows the seller CTA and phone', async ({ page }) => {
    const seller = page.getByTestId('seller-form-body');

    await expect(page.getByRole('link', { name: 'Sell Now', exact: true })).toBeVisible();
    await expect(seller).toBeVisible();
    await expect(
      seller.getByRole('heading', { name: 'Become a seller', level: 6, exact: true }),
    ).toBeVisible();

    // The seller number may change: match a phone-number-shaped link, then prove it is a tel: link.
    const sellerPhone = seller.getByRole('link', { name: /^\+?[\d\s().-]{7,}$/ });
    await expect(sellerPhone).toBeVisible();
    await expect(sellerPhone).toHaveAttribute('href', /^tel:/);
  });

  test('shows representatives with region and contact information', async ({ page }) => {
    await page.getByRole('tab', { name: 'Representatives', exact: true }).click();

    const panel = page.getByRole('tabpanel', { name: 'Representatives', exact: true });
    await expect(panel).toBeVisible();

    // Each representative's name is an h4.
    const repNames = panel.getByRole('heading', { level: 4 });
    await expect.poll(() => repNames.count()).toBeGreaterThanOrEqual(1);
    expect((await repNames.allTextContents()).map((n) => n.trim())).not.toContain('');

    // Territory is the h6 in the row led by a location icon. Not every rep has one,
    // so only require that at least one rep lists a meaningful territory.
    const territories = await panel.getByTestId('LocationOnIcon').locator('..').allTextContents();
    expect(territories.filter((t) => /[A-Za-z]{3,}/.test(t))).not.toEqual([]);

    await expect(panel.locator('a[href^="tel:"]')).not.toHaveCount(0);
    await expect(panel.locator('a[href^="mailto:"]')).not.toHaveCount(0);
  });
});
