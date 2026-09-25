'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

let trackingApi = {};
try {
  trackingApi = require('../../src/shared/clientTracking');
} catch (_) {}

const { DEFAULT_CLIENTS, KNOWN_CLIENTS, clientsCsvForSetting } = trackingApi;
const rootDir = path.join(__dirname, '..', '..');

test('clientsCsvForSetting uses defaults only for missing settings', () => {
  assert.equal(typeof DEFAULT_CLIENTS, 'string');
  assert.equal(typeof clientsCsvForSetting, 'function');
  assert.equal(clientsCsvForSetting(undefined), DEFAULT_CLIENTS);
  assert.equal(clientsCsvForSetting(null), DEFAULT_CLIENTS);
});

test('only the six Remex Meter tools are tracked by default', () => {
  assert.deepEqual(DEFAULT_CLIENTS.split(','), ['cursor', 'grok', 'claude', 'codex', 'opencode', 'dsh']);
  for (const client of ['cline', 'amp', 'hermes', 'mimo', 'qodercn']) {
    assert.ok(!DEFAULT_CLIENTS.split(',').includes(client), `${client} stays opt-in`);
  }
});

test('KNOWN_CLIENTS is a superset of DEFAULT_CLIENTS and still includes opt-in qodercn', () => {
  // Display-preference normalization (hide/pin/reorder) keys off the KNOWN list, not
  // the default-tracked list — so an opt-in client like qodercn must stay here or its
  // prefs get silently dropped on save/read.
  const known = KNOWN_CLIENTS.split(',');
  assert.ok(known.includes('mimo'), 'mimo must remain a known client');
  assert.ok(known.includes('qodercn'), 'qodercn must remain a known client');
  for (const client of DEFAULT_CLIENTS.split(',')) {
    assert.ok(known.includes(client), `${client} (default-tracked) must also be known`);
  }
});

test('documented client CSV follows the canonical catalog order', () => {
  const envExample = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf8');
  const documented = envExample.match(/^TOKEN_MONITOR_CLIENTS=(.*)$/m)?.[1].split(',') || [];
  const documentedSet = new Set(documented);
  assert.deepEqual(
    documented,
    KNOWN_CLIENTS.split(',').filter((id) => documentedSet.has(id))
  );
});

// "default tracked clients are supported by tokscale or a native adapter" —
// this contract lives in scripts/verify-vendored-tokscale-clients.js instead
// of here. It has to run against the real vendored tokscale binary
// (vendor-tokscale.yml), not the plain npm-installed one: a client can be
// merged upstream and pinned into the vendor build well before it's in a
// tagged npm release (dsh, cherrystudio), so checking the npm binary here
// would just be testing an executable packaged releases don't ship.

test('clientsCsvForSetting preserves explicit empty tracked-tool selection', () => {
  assert.equal(clientsCsvForSetting(''), '');
  assert.equal(clientsCsvForSetting('  '), '');
});

test('clientsCsvForSetting normalizes saved client csv values', () => {
  assert.equal(clientsCsvForSetting(' Claude , Codex,,hermes '), 'claude,codex,hermes');
  assert.equal(clientsCsvForSetting('kilocode,kilo'), 'kilo');
});

test('a saved micode selection migrates to the mimo client id', () => {
  // The tracked-client id was renamed off tokscale's `micode`, which is a
  // fossil of the path typo upstream fixed in its PR #784. Saved settings
  // written before the rename must not silently lose the tool: this one alias
  // covers `clients`, `clientDisplayOrder`, `hiddenClients` and
  // `pinnedClients`, since main.js routes all four through normalizeClientsCsv.
  assert.equal(clientsCsvForSetting('claude,micode'), 'claude,mimo');
  assert.equal(clientsCsvForSetting('micode,mimo'), 'mimo');
});
