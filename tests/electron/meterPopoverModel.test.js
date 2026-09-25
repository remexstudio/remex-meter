'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  POOL_DECLARATIONS,
  buildMeterModel,
  formatReset,
  meterValueText,
  orderedToolIds
} = require('../../src/electron/renderer/meter/popoverModel');
const { DEFAULT_CLIENT_IDS } = require('../../src/shared/clientCatalog');

const NOW = Date.parse('2026-09-25T10:00:00.000Z');

function stats(overrides = {}) {
  return {
    updatedAt: '2026-09-25T09:58:00.000Z',
    periods: {
      today: {
        clients: { cursor: 1200, claude: 45_000, dsh: 0 },
        clientCosts: { cursor: 0.12, claude: 1.5 }
      }
    },
    limits: { providers: [] },
    ...overrides
  };
}

function moduleById(model, id) {
  return model.modules.find((module) => module.id === id);
}

test('a fresh install shows the six tools in catalog order', () => {
  const model = buildMeterModel({ stats: stats(), settings: {}, now: NOW });
  assert.deepEqual(model.modules.map((module) => module.id), [...DEFAULT_CLIENT_IDS]);
  assert.deepEqual(model.modules.map((module) => module.label), [
    'Cursor', 'Grok', 'Claude Code', 'Codex', 'OpenCode', 'DeepSeek'
  ]);
  assert.equal(model.updatedText, 'Updated 2 min ago');
});

test('modules follow the saved order, tracked set and hidden list', () => {
  assert.deepEqual(orderedToolIds({
    clients: 'codex,cursor,claude,amp',
    clientDisplayOrder: 'claude,codex',
    hiddenClients: 'cursor'
  }), ['claude', 'codex', 'amp']);
  assert.deepEqual(orderedToolIds({ clients: '' }), []);
});

test('usage comes from the today period and limits stay a separate fact', () => {
  const model = buildMeterModel({ stats: stats(), settings: {}, now: NOW });
  assert.deepEqual(moduleById(model, 'claude').usage, { state: 'ok', tokens: 45_000, costUsd: 1.5 });
  assert.deepEqual(moduleById(model, 'dsh').usage, { state: 'ok', tokens: 0, costUsd: null });
  assert.equal(moduleById(model, 'claude').limits.state, 'pending');
  assert.equal(moduleById(model, 'claude').limits.stateText, 'Waiting for limits');
  const empty = buildMeterModel({ stats: null, settings: {}, now: NOW });
  assert.equal(moduleById(empty, 'claude').usage.state, 'pending');
  assert.equal(empty.updatedText, 'Waiting for first scan');
});

test('non-ok provider statuses render as states, never as a meter', () => {
  const model = buildMeterModel({
    stats: stats({
      limits: {
        providers: [
          { provider: 'claude', status: 'unauthorized', windows: [{ kind: 'weekly', usedPercent: 0 }] },
          { provider: 'codex', status: 'notConfigured', windows: [] },
          { provider: 'opencode', status: 'error', windows: [] }
        ]
      }
    }),
    settings: {},
    now: NOW
  });
  const sections = (id) => moduleById(model, id).limits.sections;
  assert.deepEqual(sections('claude').map((section) => [section.state, section.stateText, section.rows.length]), [['signIn', 'Sign in required', 0]]);
  assert.deepEqual(sections('codex').map((section) => [section.state, section.stateText]), [['notConfigured', 'Not configured']]);
  assert.deepEqual(sections('opencode').map((section) => [section.state, section.stateText]), [['unavailable', 'Unavailable']]);
});

test('a window without a percentage is unavailable, not zero', () => {
  const model = buildMeterModel({
    stats: stats({
      limits: {
        providers: [{
          provider: 'codex',
          status: 'ok',
          windows: [
            { kind: 'session', usedPercent: 42, resetsAt: '2026-09-25T10:30:00.000Z' },
            { kind: 'weekly', usedPercent: null }
          ]
        }]
      }
    }),
    settings: {},
    now: NOW
  });
  const [session, weekly] = moduleById(model, 'codex').limits.sections[0].rows;
  assert.deepEqual(session, { kind: 'meter', label: 'Session', usedPercent: 42, level: 'normal', resetText: 'Resets in 30 min' });
  assert.deepEqual(weekly, { kind: 'state', label: 'Weekly', state: 'unavailable', stateText: 'Unavailable' });
  assert.equal(meterValueText('Codex', session), 'Codex, Session, 42 percent used, resets in 30 min');
  assert.equal(meterValueText('Codex', weekly), 'Codex, Weekly, Unavailable');
});

test('Cursor pools stay separate windows and are never summed', () => {
  const model = buildMeterModel({
    stats: stats({
      limits: {
        providers: [{
          provider: 'cursor',
          status: 'ok',
          windows: [
            { kind: 'billing', label: 'Cursor Models', usedPercent: 30 },
            { kind: 'billing', label: 'Other Models', usedPercent: 80 },
            { kind: 'billing', label: 'On-demand spend', metric: 'spend', used: 4.5, currency: 'USD' }
          ]
        }]
      }
    }),
    settings: {},
    now: NOW
  });
  const rows = moduleById(model, 'cursor').limits.sections[0].rows;
  assert.deepEqual(rows.map((row) => [row.kind, row.label, row.usedPercent ?? row.amountText]), [
    ['meter', 'Cursor Models', 30],
    ['meter', 'Other Models', 80],
    ['amount', 'On-demand spend', '$4.50']
  ]);
  assert.equal(rows[1].level, 'warning');
});

test('Grok Heavy and Bolt pools render unavailable until a source exists', () => {
  assert.deepEqual(POOL_DECLARATIONS.grok.pools.map((pool) => [pool.label, pool.source]), [
    ['Grok Heavy Weekly', null],
    ['Grok Bolt Weekly', null]
  ]);
  const model = buildMeterModel({
    stats: stats({
      limits: { providers: [{ provider: 'grok', status: 'ok', windows: [{ kind: 'weekly', label: 'Weekly', usedPercent: 12 }] }] }
    }),
    settings: {},
    now: NOW
  });
  assert.deepEqual(moduleById(model, 'grok').limits.sections[0].rows, [
    { kind: 'state', label: 'Grok Heavy Weekly', state: 'unavailable', stateText: 'Unavailable' },
    { kind: 'state', label: 'Grok Bolt Weekly', state: 'unavailable', stateText: 'Unavailable' }
  ]);
});

test('DeepSeek balance is an amount, not a percentage meter', () => {
  const model = buildMeterModel({
    stats: stats({
      limits: {
        providers: [{
          provider: 'deepseek',
          status: 'ok',
          windows: [{ kind: 'billing', label: 'Balance', metric: 'credits', remaining: 12.34, currency: 'CNY', usedPercent: null }]
        }]
      }
    }),
    settings: {},
    now: NOW
  });
  const [row] = moduleById(model, 'dsh').limits.sections[0].rows;
  assert.equal(row.kind, 'amount');
  assert.equal(row.amountText, '¥12.34');
  assert.equal('usedPercent' in row, false);
});

test('disabled limits and multiple accounts are explicit', () => {
  const off = buildMeterModel({ stats: stats(), settings: { limitProviders: 'codex' }, now: NOW });
  assert.equal(moduleById(off, 'cursor').limits.state, 'off');
  assert.equal(moduleById(off, 'cursor').limits.stateText, 'Limits off');
  const accounts = buildMeterModel({
    stats: stats({
      limits: {
        providers: [
          { provider: 'codex', status: 'ok', accountLabel: 'Work', windows: [{ kind: 'weekly', usedPercent: 10 }] },
          { provider: 'codex', status: 'ok', accountLabel: 'Personal', stale: true, updatedAt: '2026-09-25T09:00:00.000Z', windows: [{ kind: 'weekly', usedPercent: 20 }] }
        ]
      }
    }),
    settings: {},
    now: NOW
  });
  const sections = moduleById(accounts, 'codex').limits.sections;
  assert.deepEqual(sections.map((section) => section.accountLabel), ['Work', 'Personal']);
  assert.equal(sections[1].stale, 'Stale · updated 1 h ago');
});

test('reset text never invents a time', () => {
  assert.equal(formatReset(null, NOW), '');
  assert.equal(formatReset('not a date', NOW), '');
  assert.equal(formatReset('2026-09-25T09:00:00.000Z', NOW), 'Resetting');
  assert.match(formatReset('2026-09-27T10:00:00.000Z', NOW), /^Resets [A-Z][a-z]{2} \d{2}:\d{2}$/);
  assert.match(formatReset('2026-10-20T10:00:00.000Z', NOW), /^Resets Oct \d{1,2}$/);
});

test('the popover renderer has no tool-specific markup', () => {
  const dir = path.join(__dirname, '..', '..', 'src', 'electron', 'renderer', 'meter');
  const renderer = ['popover.html', 'popover.js', 'popover.css']
    .map((file) => fs.readFileSync(path.join(dir, file), 'utf8'))
    .join('\n');
  for (const id of ['cursor', 'grok', 'claude', 'codex', 'opencode', 'deepseek', 'dsh']) {
    assert.doesNotMatch(renderer, new RegExp(`['"\`.#-]${id}\\b`, 'i'), id);
  }
});
