'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { buildMeterPopoverModel, orderedTools } = require('../../src/electron/meterPopoverModel');
const { DEFAULT_CLIENTS } = require('../../src/shared/clientTracking');
const { DEFAULT_LIMIT_PROVIDER_IDS } = require('../../src/shared/limits/providers');

const SIX = ['cursor', 'grok', 'claude', 'codex', 'opencode', 'dsh'];
const defaults = { clients: DEFAULT_CLIENTS, limitProviders: DEFAULT_LIMIT_PROVIDER_IDS.join(','), currency: 'USD' };

function window(fields) {
  return { kind: 'billing', label: '', used: null, limit: null, remaining: null, usedPercent: null, remainingPercent: null, resetsAt: null, showMeter: true, ...fields };
}

function module(model, id) {
  return model.modules.find((entry) => entry.id === id);
}

test('the popover lists the six tools in catalog order with catalog labels', () => {
  const model = buildMeterPopoverModel({ stats: null, settings: defaults });
  assert.deepEqual(model.modules.map((entry) => entry.id), SIX);
  assert.deepEqual(model.modules.map((entry) => entry.label), ['Cursor', 'Grok', 'Claude Code', 'Codex', 'OpenCode', 'DeepSeek']);
  assert.deepEqual(model.modules.map((entry) => entry.providerId), DEFAULT_LIMIT_PROVIDER_IDS);
});

test('saved display order and hidden tools are respected, untracked tools never appear', () => {
  const tools = orderedTools({ clients: 'cursor,grok,claude,hermes', clientDisplayOrder: 'claude,cursor', hiddenClients: 'grok' });
  assert.deepEqual(tools.map((client) => client.id), ['claude', 'cursor', 'hermes']);
});

test('before the first reading nothing is shown as zero', () => {
  const model = buildMeterPopoverModel({ stats: null, settings: defaults });
  for (const entry of model.modules) {
    assert.equal(entry.usage.state, 'loading', entry.id);
    assert.equal(entry.quota.state, 'loading', entry.id);
    assert.deepEqual(entry.quota.groups, [], entry.id);
  }
  assert.equal(model.updatedAt, null);
});

test('usage and limits stay separate facts', () => {
  const stats = {
    periods: { today: { clients: { claude: 12_345 }, clientCosts: { claude: 1.5 } } },
    limits: { providers: [{ provider: 'claude', status: 'ok', windows: [window({ kind: 'session', usedPercent: 30 })] }] }
  };
  const claude = module(buildMeterPopoverModel({ stats, settings: defaults }), 'claude');
  assert.equal(claude.usage.tokens, 12_345);
  assert.equal(claude.usage.costUsd, 1.5);
  assert.equal(claude.usage.tokensText, '12.3K');
  assert.equal(claude.usage.costText, '$1.50');
  assert.deepEqual(claude.quota.groups[0].rows, [{ type: 'meter', label: 'Session', usedPercent: 30, resetsAt: null }]);
});

test('cost is shown to the cent, with tiny amounts marked instead of rounded to zero', () => {
  const stats = { periods: { today: { clients: { cursor: 10, grok: 10 }, clientCosts: { cursor: 0.004, grok: 0 } } } };
  const model = buildMeterPopoverModel({ stats, settings: defaults });
  assert.equal(module(model, 'cursor').usage.costText, '<$0.01');
  assert.equal(module(model, 'grok').usage.costText, '$0.00');
});

test('each provider window is its own meter with the exact provider value, never summed', () => {
  const stats = {
    periods: { today: { clients: {}, clientCosts: {} } },
    limits: {
      providers: [{
        provider: 'cursor',
        status: 'ok',
        windows: [
          window({ label: 'Cursor Models', usedPercent: 41.6, resetsAt: '2026-10-01T00:00:00.000Z' }),
          window({ label: 'Other Models', usedPercent: 7 }),
          window({ label: 'On-demand spend', metric: 'spend', used: 3.25, currency: 'USD', showMeter: false })
        ]
      }]
    }
  };
  const cursor = module(buildMeterPopoverModel({ stats, settings: defaults }), 'cursor');
  assert.equal(cursor.quota.state, 'ok');
  assert.deepEqual(cursor.quota.groups[0].rows, [
    { type: 'meter', label: 'Cursor Models', usedPercent: 41.6, resetsAt: '2026-10-01T00:00:00.000Z' },
    { type: 'meter', label: 'Other Models', usedPercent: 7, resetsAt: null },
    { type: 'amount', label: 'On-demand spend', amountText: '$3.25' }
  ]);
  assert.equal(cursor.usage.tokens, 0, 'no tokens today is a real usage figure');
});

test('a window without a percentage is unavailable text, not an empty meter', () => {
  const stats = {
    periods: { today: {} },
    limits: { providers: [{ provider: 'grok', status: 'ok', windows: [window({ label: 'Weekly', kind: 'weekly', usedPercent: null })] }] }
  };
  const grok = module(buildMeterPopoverModel({ stats, settings: defaults }), 'grok');
  assert.equal(grok.quota.state, 'unavailable');
  assert.equal(grok.quota.text, 'Unavailable');
  for (const group of grok.quota.groups) {
    for (const row of group.rows) assert.notEqual(row.type, 'meter');
  }
});

test('non-ok provider statuses render as states with guidance', () => {
  const cases = [
    ['notConfigured', 'notConfigured', 'Not configured'],
    ['unauthorized', 'unauthorized', 'Sign in required'],
    ['rateLimited', 'rateLimited', 'Unavailable'],
    ['error', 'unavailable', 'Unavailable'],
    ['disabled', 'off', 'Quota off']
  ];
  for (const [status, state, text] of cases) {
    const stats = { periods: { today: {} }, limits: { providers: [{ provider: 'codex', status, windows: [window({ usedPercent: 50 })] }] } };
    const codex = module(buildMeterPopoverModel({ stats, settings: defaults }), 'codex');
    assert.equal(codex.quota.state, state, status);
    assert.equal(codex.quota.text, text, status);
    assert.deepEqual(codex.quota.groups, [], `${status} must not surface a meter`);
  }
  const stats = { limits: { providers: [{ provider: 'cursor', status: 'notConfigured', windows: [] }] } };
  assert.equal(module(buildMeterPopoverModel({ stats, settings: defaults }), 'cursor').quota.hint, 'Sign in to Cursor in Settings.');
});

test('a provider switched off in Settings says so instead of loading forever', () => {
  const model = buildMeterPopoverModel({ stats: null, settings: { ...defaults, limitProviders: 'cursor' } });
  assert.equal(module(model, 'cursor').quota.state, 'loading');
  assert.equal(module(model, 'grok').quota.state, 'off');
  const off = buildMeterPopoverModel({ stats: null, settings: { ...defaults, limitsEnabled: false } });
  assert.ok(off.modules.every((entry) => entry.quota.state === 'off'));
});

test('DeepSeek balance is an amount, not a meter', () => {
  const stats = {
    periods: { today: {} },
    limits: { providers: [{ provider: 'deepseek', status: 'ok', windows: [window({ label: 'Balance', metric: 'credits', remaining: 12.5, currency: 'CNY' })] }] }
  };
  const deepseek = module(buildMeterPopoverModel({ stats, settings: defaults }), 'dsh');
  assert.deepEqual(deepseek.quota.groups[0].rows, [{ type: 'amount', label: 'Balance', amountText: '¥12.50' }]);
});

test('several accounts keep separate groups and honour email masking', () => {
  const stats = {
    periods: { today: {} },
    limits: {
      providers: [
        { provider: 'codex', status: 'ok', accountLabel: 'dev@example.com', windows: [window({ kind: 'session', usedPercent: 10 })] },
        { provider: 'codex', status: 'unauthorized', accountLabel: 'ops@example.com', windows: [] }
      ]
    }
  };
  const codex = module(buildMeterPopoverModel({ stats, settings: { ...defaults, maskLimitAccountEmails: true } }), 'codex');
  assert.equal(codex.quota.state, 'ok');
  assert.deepEqual(codex.quota.groups.map((group) => group.caption), ['d•••@example.com', 'o•••@example.com']);
  assert.equal(codex.quota.groups[1].rows[0].type, 'state');
});

test('tool marks come from the vendor presentation table', () => {
  const model = buildMeterPopoverModel({ stats: null, settings: defaults });
  assert.deepEqual(module(model, 'grok').mark, { file: 'xai', color: null });
  assert.deepEqual(module(model, 'claude').mark, { file: 'claude', color: '#cc7c5e' });
});
