import { expect, test } from '@playwright/test';
import { expectValidSearchResponse, postSearch } from '../support/search-api';

test('POST /api/search returns the Edmonton search contract', async ({ request }) => {
  const response = await postSearch(request, { freeText: 'Edmonton' });

  const { body, total, records } = await expectValidSearchResponse(response);

  expect(body.requests.freeText).toBe('Edmonton');

  console.log(`[API SEARCH] total=${total}`);
  console.log(
    `[API SEARCH] first 5 titles=${JSON.stringify(
      records.slice(0, 5).map((record) => record.assetDescription),
    )}`,
  );
});
