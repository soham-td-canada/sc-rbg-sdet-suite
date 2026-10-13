import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';

export type SearchRecord = { assetDescription: string };

// Sends a normal JSON search request. Scenarios that need a raw or malformed body
// should call request.post directly.
export async function postSearch(
  request: APIRequestContext,
  data: Record<string, unknown>,
): Promise<APIResponse> {
  return request.post('/api/search', { data });
}

// Shared assertions for a successful search response. Returns the parsed pieces so each test
// can add its own scenario-specific checks and logging.
export async function expectValidSearchResponse(
  response: APIResponse,
): Promise<{ body: any; total: number; records: SearchRecord[] }> {
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

  return { body, total, records };
}
