import { expect, test } from '@playwright/test';
import { isNonEmptyString, readPageProps } from '../support/page-data';

// /lp is server-rendered by Next.js (getServerSideProps); its locations are not served by a
// separate public API, so this contract is read from the embedded page data instead.
type Yard = {
  name: unknown;
  type: unknown;
  address: { country: unknown; countryCode: unknown };
};

test.describe('API 1 - Auction sites page JSON', () => {
  test('validates auction sites payload', async ({ page }) => {
    const { pageProps } = await readPageProps(page, '/lp');
    expect(Array.isArray(pageProps.yards), 'props.pageProps.yards should be an array').toBe(true);
    const yards: Yard[] = pageProps.yards;
    expect(yards.length).toBeGreaterThan(60);

    // Every record has a name, a known type, and a country. Other fields can be null.
    const problems = yards.flatMap((yard, index) => {
      const issues: string[] = [];
      if (!isNonEmptyString(yard?.name)) issues.push('name');
      if (yard?.type !== 'Permanent' && yard?.type !== 'Satellite') issues.push('type');
      if (typeof yard?.address !== 'object' || yard.address === null) {
        issues.push('address');
      } else {
        if (!isNonEmptyString(yard.address.country)) issues.push('address.country');
        if (!isNonEmptyString(yard.address.countryCode)) issues.push('address.countryCode');
      }
      return issues.length > 0 ? [`#${index} ${JSON.stringify(yard?.name)}: ${issues.join(', ')}`] : [];
    });
    expect(problems, 'invalid location records').toEqual([]);

    const countries = [...new Set(yards.map((yard) => yard.address.country as string))];
    expect(countries.length).toBeGreaterThan(8);
    expect(countries).toContain('Canada');
    expect(countries).toContain('United States');

    // Permanent vs satellite comes from the explicit `type` field, not the UI's "*".
    for (const [name, country, type] of [
      ['Edmonton', 'Canada', 'Permanent'],
      ['Phoenix', 'United States', 'Permanent'],
      ['Calgary, AB', 'Canada', 'Satellite'],
      ['San Antonio', 'United States', 'Satellite'],
    ]) {
      const yard = yards.find((candidate) => candidate.name === name);
      expect(yard, `${name} record`).toMatchObject({ type, address: { country } });
    }

    const permanent = yards.filter((yard) => yard.type === 'Permanent').length;
    const satellite = yards.filter((yard) => yard.type === 'Satellite').length;
    expect(permanent).toBeGreaterThan(25);
    expect(satellite).toBeGreaterThan(15);

    console.log(
      `[API1] locations=${yards.length} satellite=${satellite} permanent=${permanent} countries=${countries.length}`,
    );
  });
});
