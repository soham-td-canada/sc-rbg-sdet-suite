# Ritchie Bros. Test Automation

Playwright + TypeScript tests for the Ritchie Bros. Auctioneers website (<https://www.rbauction.com>), covering the Locations directory, an Edmonton yard page, and inventory search at the UI, API, and server page-data levels.

## Quick start

```bash
npm ci
npm run typecheck
npm test
```

Requires Node.js 20+ and Google Chrome. Chrome must be installed because the Playwright project uses `channel: 'chrome'` (`npx playwright install chrome` can install it).

## Coverage

**End-to-end UI** (`tests/e2e`)
- Locations directory
- Edmonton navigation and yard page
- Inventory search
- Impossible-search fallback behavior

**Direct API** (`tests/api`)
- Edmonton `POST /api/search`
- Malformed JSON handling
- Invalid pagination-offset handling

**Server page-data contracts** (`tests/api`)
- Auction Sites / Locations
- Edmonton yard

These two tests read the Next.js `script#__NEXT_DATA__` payload. They use the browser because this data is delivered as server-rendered page data rather than through a separately observed, browser-facing public API.

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Run all tests (headless) |
| `npm run test:e2e` | Browser UI tests only |
| `npm run test:api` | API and page-data tests only |
| `npm run test:headed` | Run with a visible browser |
| `npm run test:ui` | Playwright interactive UI mode |
| `npm run typecheck` | Type-check with `tsc --noEmit` |

Spec files run in parallel by default. To run serially, or to run a single spec, pass arguments through npm:

```bash
npm test -- --workers=1
npm test -- tests/e2e/locations-directory.spec.ts
```

## Live production data

The suite runs against live production. Inventory, event counts, titles, dates, category quantities, and result totals change continuously, so the tests validate stable contracts, required examples, non-empty values, and explicit data shapes instead of pinning transient values. This is intentional resilience, not loose checking. All automated interactions are read-only: nothing bids, submits seller forms, creates accounts, or otherwise changes production state.

## Project structure

```text
tests/
├── e2e/       browser-facing functional tests
├── api/       direct /api/search tests and server-rendered page-data contract tests
└── support/   shared Next.js page-data reader
```

Some files under `tests/api` use Playwright's `page` fixture, because page-data tests read data from the rendered page.

## Reports and debugging

Results print to the terminal, and an HTML report is generated in `playwright-report/`:

```bash
npx playwright show-report
```

Traces are retained on failure and available from the report.

## Environment note

The target site is Akamai-protected. The suite uses Playwright's standard `Desktop Chrome` device profile with the installed Chrome channel, which ran reliably in the development environment. Behavior can vary by network and environment.

## Design notes

- Explicit semantic selectors and explicit JSON paths.
- Dynamic production values are not hardcoded.
- No retries or arbitrary sleeps mask failures.
