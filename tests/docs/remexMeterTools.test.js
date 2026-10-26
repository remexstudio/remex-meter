'use strict';

// The six Remex Meter tools are written down by hand in docs/PROVIDERS.md and
// README.md. The catalogs are the source of truth for the app; these tests keep
// the hand-authored lists from drifting away from them.

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

const ROOT = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function providersTable() {
  return read('docs/PROVIDERS.md')
    .split('\n')
    .filter((line) => /^\| \d+ \|/.test(line))
    .map((line) => {
      const cells = line.split('|').map((cell) => cell.trim());
      return {
        order: Number(cells[1]),
        tool: cells[2],
        client: cells[3].match(/`([^`]+)`/)[1],
        provider: cells[4].match(/`([^`]+)`/)[1]
      };
    });
}

test('docs/PROVIDERS.md lists the default tracked clients in catalog order', () => {
  const rows = providersTable();
  assert.deepEqual(rows.map((row) => row.order), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(rows.map((row) => row.client), [...DEFAULT_CLIENT_IDS]);
  assert.deepEqual(CLIENT_CATALOG.slice(0, 6).map((client) => client.id), [...DEFAULT_CLIENT_IDS]);
});

test('docs/PROVIDERS.md lists the default limits providers in catalog order', () => {
  const rows = providersTable();
  assert.deepEqual(rows.map((row) => row.provider), [...DEFAULT_LIMIT_PROVIDER_IDS]);
  assert.deepEqual(LIMIT_PROVIDER_CATALOG.slice(0, 6).map((provider) => provider.id), [...DEFAULT_LIMIT_PROVIDER_IDS]);
  for (const row of rows) {
    assert.equal(limitProviderForClient(row.client), row.provider, row.tool);
  }
});

test('README and PROVIDERS name the six tools the same way, and the catalog labels match', () => {
  const readmeTools = read('README.md')
    .split('\n')
    .filter((line) => /^\d+\. /.test(line))
    .map((line) => line.replace(/^\d+\. /, '').trim());
  const rows = providersTable();
  assert.deepEqual(readmeTools, rows.map((row) => row.tool));
  const labels = Object.fromEntries(CLIENT_CATALOG.map((client) => [client.id, client.label]));
  assert.deepEqual(rows.map((row) => labels[row.client]), readmeTools);
});
