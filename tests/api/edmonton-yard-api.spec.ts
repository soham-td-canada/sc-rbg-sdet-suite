import { expect, test } from '@playwright/test';
import { isNonEmptyString, readPageProps } from '../support/page-data';

// /lp/[slug] is server-rendered by Next.js (getServerSideProps); the yard data is read from
// the embedded page data rather than from a separate public API.
type YardDetails = {
  name: unknown;
  address: { city: unknown; provinceStateCode: unknown; country: unknown; countryCode: unknown };
};
type UpcomingEvent = { event_advertised_name: unknown; event_start_date: unknown };
type Category = { categoryLocalized: unknown; totalAssets: unknown };
type ItemGroup = { categories: unknown };

test.describe('API 2 - Edmonton yard page JSON', () => {
  test('validates Edmonton yard payload', async ({ page }) => {
    const { pageProps, query } = await readPageProps(page, '/lp/edmonton-ab');
    expect(query?.slug).toBe('edmonton-ab');

    // Yard identity
    const yardDetails: YardDetails = pageProps.yardDetails;
    expect(yardDetails, 'props.pageProps.yardDetails').toMatchObject({
      name: 'Edmonton',
      address: {
        city: 'Nisku',
        provinceStateCode: 'AB',
        country: 'Canada',
        countryCode: 'CAN',
      },
    });

    // Upcoming events: dynamic, but at least one must exist.
    const upcomingEvents = pageProps.upcomingEvents;
    expect(Array.isArray(upcomingEvents), 'props.pageProps.upcomingEvents should be an array').toBe(
      true,
    );
    const events: UpcomingEvent[] = upcomingEvents;
    expect(events.length).toBeGreaterThan(0);

    const eventProblems = events.flatMap((event, index) => {
      const issues: string[] = [];
      if (!isNonEmptyString(event?.event_advertised_name)) issues.push('event_advertised_name');
      if (
        !isNonEmptyString(event?.event_start_date) ||
        Number.isNaN(Date.parse(event.event_start_date as string))
      ) {
        issues.push('event_start_date');
      }
      return issues.length > 0 ? [`#${index}: ${issues.join(', ')}`] : [];
    });
    expect(eventProblems, 'invalid upcoming events').toEqual([]);

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
      if (
        typeof category?.totalAssets !== 'number' ||
        !Number.isInteger(category.totalAssets) ||
        category.totalAssets <= 0
      ) {
        issues.push('totalAssets');
      }
      return issues.length > 0 ? [`#${index}: ${issues.join(', ')}`] : [];
    });
    expect(categoryProblems, 'invalid categories').toEqual([]);

    // Names can carry stray whitespace, so de-duplicate on the trimmed value.
    const distinctCategories = new Set(
      categories.map((category) => (category.categoryLocalized as string).trim()),
    );
    expect(distinctCategories.size).toBeGreaterThan(5);

    console.log(
      `[API2] events=${events.length} groups=${groups.length} flattenedCategories=${categories.length} distinctCategories=${distinctCategories.size}`,
    );
  });
});
