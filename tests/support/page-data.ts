import { expect, type Page } from '@playwright/test';

// Navigates to a server-rendered Next.js page and returns the page data embedded in
// script#__NEXT_DATA__. Fails if the script is missing or blank, its JSON is malformed,
// or props.pageProps is not an object.
export async function readPageProps(
  page: Page,
  path: string,
): Promise<{ pageProps: Record<string, any>; query: any }> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });

  const text = await page.locator('script#__NEXT_DATA__').textContent();
  expect(text?.trim(), '__NEXT_DATA__ script should not be empty').toBeTruthy();

  const nextData = JSON.parse(text as string);
  const pageProps = nextData?.props?.pageProps;
  expect(
    pageProps !== null && typeof pageProps === 'object' && !Array.isArray(pageProps),
    'props.pageProps should be an object',
  ).toBe(true);

  return { pageProps, query: nextData.query };
}

export const isNonEmptyString = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '';
