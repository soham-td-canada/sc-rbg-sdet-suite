import { expect, test } from '@playwright/test';
import { isNonEmptyString, readPageProps } from '../support/page-data';

// /lp/[slug] is server-rendered by Next.js (getServerSideProps); the yard data is read from
// the embedded page data rather than from a separate public API.
type YardDetails = {
  name: unknown;
  address: {
    addressLine1: unknown;
    city: unknown;
    provinceStateCode: unknown;
    zipPostalCode: unknown;
    country: unknown;
    countryCode: unknown;
  };
  contactPhone: unknown;
  pickupHoursFrom: unknown;
  pickupHoursTo: unknown;
};
type UpcomingEvent = {
  event_advertised_name: unknown;
  event_start_date: unknown;
  event_end_date_time: unknown;
};
type Category = { categoryLocalized: unknown; totalAssets: unknown };
type ItemGroup = { categories: unknown };

test.describe('API 2 - Edmonton yard page JSON', () => {
  test('validates Edmonton yard payload', async ({ page }) => {
    const { pageProps, query } = await readPageProps(page, '/lp/edmonton-ab');
    expect(query?.slug).toBe('edmonton-ab');

    const yardDetails: YardDetails = pageProps.yardDetails;
    expect(yardDetails, 'props.pageProps.yardDetails').toMatchObject({
      name: 'Edmonton',
      address: {
        addressLine1: expect.stringContaining('1500 Sparrow Drive'),
        city: 'Nisku',
        provinceStateCode: 'AB',
        zipPostalCode: expect.stringMatching(/^T9E\s*8H6$/i),
        country: 'Canada',
        countryCode: 'CAN',
      },
      // Phone and pickup hours must be present; their values are not pinned.
      contactPhone: expect.stringMatching(/\S/),
      pickupHoursFrom: expect.stringMatching(/\d{1,2}:\d{2}/),
      pickupHoursTo: expect.stringMatching(/\d{1,2}:\d{2}/),
    });

    // Upcoming events are optional: only when the yard has some must each be well-formed.
    const upcomingEvents = pageProps.upcomingEvents;
    expect(Array.isArray(upcomingEvents), 'props.pageProps.upcomingEvents should be an array').toBe(
      true,
    );
    const events: UpcomingEvent[] = upcomingEvents;

    if (events.length > 0) {
      const isValidDate = (value: unknown) =>
        isNonEmptyString(value) && !Number.isNaN(Date.parse(value as string));
      const eventProblems = events.flatMap((event, index) => {
        const issues: string[] = [];
        if (!isNonEmptyString(event?.event_advertised_name)) issues.push('event_advertised_name');
        if (!isValidDate(event?.event_start_date)) issues.push('event_start_date');
        if (!isValidDate(event?.event_end_date_time)) issues.push('event_end_date_time');
        return issues.length > 0 ? [`#${index}: ${issues.join(', ')}`] : [];
      });
      expect(eventProblems, 'invalid upcoming events').toEqual([]);

      expect(
        events.some((event) => /Edmonton|Nisku/i.test(String(event.event_advertised_name))),
        'at least one event should refer to Edmonton or Nisku',
      ).toBe(true);
    }

    // Items in yard: an array of groups, each holding categories. The same category name can
    // appear in several groups (and groups need not map to upcomingEvents), so categories are
    // only de-duplicated after flattening.
    const itemsInYard = pageProps.itemsInYard;
    expect(Array.isArray(itemsInYard), 'props.pageProps.itemsInYard should be an array').toBe(true);
    const groups: ItemGroup[] = itemsInYard;
    expect(groups.length).toBeGreaterThan(0);

    const groupsWithoutCategories = groups.flatMap((group, index) =>
      Array.isArray(group?.categories) ? [] : [index],
    );
    expect(groupsWithoutCategories, 'groups whose categories is not an array').toEqual([]);

    const categories: Category[] = groups.flatMap((group) => group.categories as Category[]);
    expect(categories.length).toBeGreaterThan(0);

    const categoryProblems = categories.flatMap((category, index) => {
      const issues: string[] = [];
      if (!isNonEmptyString(category?.categoryLocalized)) issues.push('categoryLocalized');
      // Quantities are optional; when present they must be numbers >= 0 (zero is valid).
      const quantity = category?.totalAssets;
      if (quantity !== undefined && quantity !== null) {
        if (typeof quantity !== 'number' || !(quantity >= 0)) issues.push('totalAssets');
      }
      return issues.length > 0 ? [`#${index}: ${issues.join(', ')}`] : [];
    });
    expect(categoryProblems, 'invalid categories').toEqual([]);

    // Names can carry stray whitespace, so de-duplicate on the trimmed value.
    const distinctCategories = new Set(
      categories.map((category) => (category.categoryLocalized as string).trim()),
    );
    expect(distinctCategories.size).toBeGreaterThan(5);
    expect([...distinctCategories]).toContain('Excavators');

    console.log(
      `[API2] events=${events.length} groups=${groups.length} flattenedCategories=${categories.length} distinctCategories=${distinctCategories.size}`,
    );
  });
});
