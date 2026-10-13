import { expect, test } from '@playwright/test';
import { expectValidSearchResponse, postSearch } from '../support/search-api';

test.describe('POST /api/search negative contracts', () => {
  test('rejects a malformed JSON body with 400', async ({ request }) => {
    // A Buffer is sent as-is, so Playwright does not serialize it into valid JSON.
    const response = await request.post('/api/search', {
      headers: { 'Content-Type': 'application/json' },
      data: Buffer.from('{"freeText": "Edmonton"'),
    });

    const text = await response.text();
    console.log(`[API-NEG] malformed JSON -> status=${response.status()}`);

    expect(response.status()).toBe(400);
    expect(text).toContain('Invalid JSON');
  });

  test('handles an invalid pagination offset gracefully', async ({ request }) => {
    const response = await postSearch(request, { freeText: 'Edmonton', from: 'abc' });

    const { body, total, records } = await expectValidSearchResponse(response);

    // The bad offset must not be echoed back as if it had been applied.
    expect(body.requests.freeText).toBe('Edmonton');
    expect(body.requests.from).not.toBe('abc');

    console.log(
      `[API-NEG] invalid from -> status=${response.status()} total=${total} records=${records.length}`,
    );
  });
});
