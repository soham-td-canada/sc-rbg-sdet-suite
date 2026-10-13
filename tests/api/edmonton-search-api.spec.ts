import { expect, test } from '@playwright/test';

test('POST /api/search returns the Edmonton search contract', async ({ request }) => {
  const response = await request.post('/api/search', {
    data: {
      freeText: 'Edmonton',
    },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');

  const body = await response.json();
  for (const [name, value] of Object.entries({
    body,
    results: body?.results,
    requests: body?.requests,
  })) {
    expect(
      value !== null && typeof value === 'object' && !Array.isArray(value),
      `${name} should be an object`,
    ).toBe(true);
  }

  // Totals are dynamic: only require a positive number.
  const total = body.results.totalAmount;
  expect(typeof total).toBe('number');
  expect(total).toBeGreaterThan(0);

  // Record count is not a contract: require at least one record, and validate every record returned.
  const records = body.results.records;
  expect(Array.isArray(records)).toBe(true);
  expect(records.length).toBeGreaterThan(0);
  const invalidRecordIndexes = records.flatMap((record: any, index: number) =>
    typeof record?.assetDescription === 'string' && record.assetDescription.trim() !== ''
      ? []
      : [index],
  );
  expect(invalidRecordIndexes, 'records without a non-empty assetDescription').toEqual([]);

  // The response echoes the request it served.
  expect(body.requests.freeText).toBe('Edmonton');

  console.log(`[API SEARCH] total=${total}`);
  console.log(
    `[API SEARCH] first titles=${JSON.stringify(
      records.slice(0, 5).map((record: any) => record.assetDescription),
    )}`,
  );
});
