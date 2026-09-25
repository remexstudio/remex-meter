'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { CLIENT_CATALOG, DEFAULT_CLIENT_IDS } = require('../../src/shared/clientCatalog');
const {
  DEFAULT_LIMIT_PROVIDER_IDS,
  LIMIT_PROVIDER_CATALOG,
  limitProviderForClient
} = require('../../src/shared/limits/providers');

const rootDir = path.join(__dirname, '..', '..');

// docs/PROVIDERS.md is the hand-authored list of the six Remex Meter tools, so
// it is the cross-check for the catalogs (the upstream README table is kept
// verbatim and no longer describes this product's defaults).
function providersTable() {
  return fs.readFileSync(path.join(rootDir, 'docs', 'PROVIDERS.md'), 'utf8')
    .split('\n')
    .filter((line) => /^\| \d+ \|/.test(line))
    .map((line) => {
      const cells = line.split('|').map((cell) => cell.trim());
      const firstCode = (cell) => cell.match(/`([^`]+)`/)?.[1] || '';
      return { order: Number(cells[1]), tool: cells[2], client: firstCode(cells[3]), provider: firstCode(cells[4]) };
    });
}

test('docs/PROVIDERS.md lists the six tools in default order', () => {
  assert.deepEqual(providersTable().map((row) => row.tool), [
    'Cursor', 'Grok', 'Claude Code', 'Codex', 'OpenCode', 'DeepSeek'
  ]);
});

test('default-tracked clients match docs/PROVIDERS.md', () => {
  const rows = providersTable();
  assert.deepEqual([...DEFAULT_CLIENT_IDS], rows.map((row) => row.client));
  const labels = new Map(CLIENT_CATALOG.map((client) => [client.id, client.label]));
  for (const row of rows) assert.equal(labels.get(row.client), row.tool, row.client);
});

test('default-enabled limits providers match docs/PROVIDERS.md', () => {
  const rows = providersTable();
  assert.deepEqual([...DEFAULT_LIMIT_PROVIDER_IDS], rows.map((row) => row.provider));
  assert.deepEqual(
    LIMIT_PROVIDER_CATALOG.slice(0, rows.length).map((provider) => provider.id),
    rows.map((row) => row.provider)
  );
  for (const row of rows) assert.equal(limitProviderForClient(row.client), row.provider, row.client);
});
