import { expect, test } from '@playwright/test';

test.describe('POST /api/search negative contracts', () => {
  test('rejects a malformed JSON body with 400', async ({ request }) => {
    // A Buffer is sent as-is, so Playwright does not serialize it into valid JSON.
    const response = await request.post('/api/search', {
      headers: { 'Content-Type': 'application/json' },
      data: Buffer.from('{"freeText": "Edmonton"'),
    });

    const text = await response.text();
    console.log(`[API-NEG] malformed JSON -> status=${response.status()} body=${JSON.stringify(text.slice(0, 80))}`);

    expect(response.status()).toBe(400);
    expect(text).toContain('Invalid JSON');
  });

  test('handles an invalid pagination offset gracefully', async ({ request }) => {
    const response = await request.post('/api/search', {
      data: {
        freeText: 'Edmonton',
        from: 'abc',
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

    // Totals and record counts are dynamic: only require them to be usable.
    const total = body.results.totalAmount;
    expect(typeof total).toBe('number');
    expect(total).toBeGreaterThan(0);

    const records = body.results.records;
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
    const invalidRecordIndexes = records.flatMap((record: any, index: number) =>
      typeof record?.assetDescription === 'string' && record.assetDescription.trim() !== ''
        ? []
        : [index],
    );
    expect(invalidRecordIndexes, 'records without a non-empty assetDescription').toEqual([]);

    // The bad offset must not be echoed back as if it had been applied.
    expect(body.requests.freeText).toBe('Edmonton');
    expect(body.requests.from).not.toBe('abc');

    console.log(
      `[API-NEG] invalid from -> status=${response.status()} total=${total} records=${records.length}`,
    );
  });
});
