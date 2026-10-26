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
  const row = claude.quota.groups[0].rows[0];
  assert.equal(row.type, 'meter');
  assert.equal(row.label, 'Session');
  assert.equal(row.usedPercent, 30);
  assert.equal(row.voiceText, 'Session, 30 percent used');
  assert.equal(row.limitId, undefined);
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
          window({ limitId: 'cursor.modePool', label: 'Cursor Models', usedPercent: 41.6, resetsAt: '2026-10-01T00:00:00.000Z' }),
          window({ limitId: 'cursor.otherModes', label: 'Other Models', usedPercent: 7 }),
          window({ limitId: 'cursor.onDemand', label: 'On-demand spend', metric: 'spend', used: 3.25, currency: 'USD', showMeter: false }),
          window({ limitId: 'cursor.grokBot', kind: 'weekly', label: 'Grok Bot', usedPercent: 12 })
        ]
      }]
    }
  };
  const cursor = module(buildMeterPopoverModel({ stats, settings: defaults, now: Date.parse('2026-10-26T00:00:00.000Z') }), 'cursor');
  assert.equal(cursor.quota.state, 'ok');
  const rows = cursor.quota.groups[0].rows;
  assert.deepEqual(rows.map((row) => [row.limitId, row.type, row.label, row.usedPercent ?? row.amountText]), [
    ['cursor.modePool', 'meter', 'Cursor Mode Pool', 41.6],
    ['cursor.otherModes', 'meter', 'Cursor Other Modes', 7],
    ['cursor.onDemand', 'amount', 'On-demand spend', '$3.25'],
    ['cursor.grokBot', 'meter', 'Grok Bot', 12]
  ]);
  assert.equal(rows[0].voiceText, 'Cursor Mode Pool, 41.6 percent used, reset due');
  assert.equal(rows[1].voiceText, 'Cursor Other Modes, 7 percent used');
  assert.equal(rows.some((row) => row.usedPercent === 24.3), false, 'pools are not averaged');
  assert.equal(cursor.usage.tokens, 0, 'no tokens today is a real usage figure');
});

test('pool rows follow limitId, never the upstream label', () => {
  const stats = {
    periods: { today: {} },
    limits: {
      providers: [{
        provider: 'cursor',
        status: 'ok',
        windows: [
          window({ limitId: 'cursor.otherModes', label: 'Cursor Models', usedPercent: 8 }),
          window({ limitId: 'cursor.modePool', label: 'Other Models', usedPercent: 80 })
        ]
      }]
    }
  };
  const rows = module(buildMeterPopoverModel({ stats, settings: defaults }), 'cursor').quota.groups[0].rows;
  assert.deepEqual(rows.map((row) => [row.limitId, row.label, row.usedPercent, row.level]), [
    ['cursor.modePool', 'Cursor Mode Pool', 80, 'warning'],
    ['cursor.otherModes', 'Cursor Other Modes', 8, 'normal']
  ]);
  assert.match(rows[0].voiceText, /Cursor Mode Pool, 80 percent used, running low/);
});

test('a label without a pool id is not adopted as that pool', () => {
  const stats = {
    periods: { today: {} },
    limits: {
      providers: [{
        provider: 'cursor',
        status: 'ok',
        windows: [window({ label: 'Cursor Models', usedPercent: 41 })]
      }]
    }
  };
  const rows = module(buildMeterPopoverModel({ stats, settings: defaults }), 'cursor').quota.groups[0].rows;
  assert.deepEqual(rows.map((row) => [row.type, row.label, row.usedPercent ?? null]), [
    ['state', 'Cursor Mode Pool', null],
    ['state', 'Cursor Other Modes', null],
    ['meter', 'Cursor Models', 41]
  ]);
  assert.equal(rows[0].voiceText.includes('0 percent'), false);
  assert.equal(rows[0].text, 'Unavailable');
});

test('Requests and Overall stay under their own names and leave both Cursor pools unavailable', () => {
  function rowsFor(limitId, label, usedPercent) {
    const stats = {
      periods: { today: {} },
      limits: { providers: [{ provider: 'cursor', status: 'ok', windows: [window({ limitId, label, usedPercent })] }] }
    };
    return module(buildMeterPopoverModel({ stats, settings: defaults }), 'cursor').quota.groups[0].rows;
  }
  for (const [limitId, label, hint] of [
    ['cursor.requests', 'Requests', 'This account reports Requests, not Mode Pool.'],
    ['cursor.overall', 'Overall', 'This account reports Overall, not Mode Pool.']
  ]) {
    const rows = rowsFor(limitId, label, 70);
    assert.deepEqual(rows.map((row) => [row.type, row.label, row.usedPercent ?? row.text]), [
      ['state', 'Cursor Mode Pool', 'Unavailable'],
      ['state', 'Cursor Other Modes', 'Unavailable'],
      ['meter', label, 70]
    ], label);
    assert.equal(rows[0].hint, hint, label);
    assert.equal(rows[1].hint, hint.replace('Mode Pool', 'Other Modes'), label);
    assert.equal(rows[0].voiceText, `Cursor Mode Pool, Unavailable. ${hint}`);
  }
});

test('Grok Heavy and Bolt stay unavailable and the credit window is not relabelled as either', () => {
  const stats = {
    periods: { today: {} },
    limits: {
      providers: [{
        provider: 'grok',
        status: 'ok',
        windows: [window({ limitId: 'grok.credits', label: 'Weekly', usedPercent: 16.5, resetsAt: '2026-11-02T00:00:00.000Z' })]
      }]
    }
  };
  const grok = module(buildMeterPopoverModel({ stats, settings: defaults, now: Date.parse('2026-10-26T00:00:00.000Z') }), 'grok');
  const rows = grok.quota.groups[0].rows;
  assert.equal(grok.quota.state, 'ok');
  assert.deepEqual(rows.map((row) => [row.limitId, row.type, row.label, row.usedPercent ?? row.text]), [
    ['grok.heavyWeekly', 'state', 'Grok Heavy Weekly', 'Unavailable'],
    ['grok.boltWeekly', 'state', 'Grok Bolt Weekly', 'Unavailable'],
    ['grok.credits', 'meter', 'Weekly', 16.5]
  ]);
  assert.equal(rows[0].hint, 'Grok does not report a separate Heavy weekly allowance.');
  assert.equal(rows[1].hint, 'Grok does not report a separate Bolt weekly allowance.');
  assert.equal(rows[0].voiceText.includes('0 percent'), false);
  assert.match(rows[2].voiceText, /^Weekly, 16\.5 percent used, resets /);
  assert.equal(rows.some((row) => row.usedPercent === 33), false);
});

test('a non-ok provider does not turn its missing pools into a zero meter', () => {
  const stats = { periods: { today: {} }, limits: { providers: [{ provider: 'cursor', status: 'unauthorized', windows: [] }] } };
  const cursor = module(buildMeterPopoverModel({ stats, settings: defaults }), 'cursor');
  assert.equal(cursor.quota.state, 'unauthorized');
  assert.equal(cursor.quota.text, 'Sign in required');
  assert.deepEqual(cursor.quota.groups, []);
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
  assert.equal(deepseek.quota.groups[0].rows[0].type, 'amount');
  assert.equal(deepseek.quota.groups[0].rows[0].amountText, '¥12.50');
  assert.equal(deepseek.quota.groups[0].rows[0].voiceText, 'Balance, ¥12.50');
  assert.equal(deepseek.quota.groups[0].rows.some((row) => row.type === 'meter'), false);
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
