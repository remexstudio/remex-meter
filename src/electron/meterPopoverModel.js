'use strict';

// Builds what the Meter popover renders. Pure: stats and settings in, a plain
// view model out, so the rules below are tested without a window.
//
// Rules (docs/PRODUCT.md, docs/POOLS.md, docs/UI.md):
// - Tools, order and labels come from CLIENT_CATALOG / LIMIT_PROVIDER_CATALOG.
// - Usage (tokens, cost) and limits (quota) are separate facts.
// - A quota meter shows `usedPercent` exactly as the limits record carries it.
//   Nothing here averages, sums or fills in a percentage.
// - Missing data is a state with text, never 0%.
// - Every provider window is its own row under the provider's own label; the
//   named pool modules need stable window ids (issue #4) and are not built here.

const { CLIENT_CATALOG } = require('../shared/clientCatalog');
const { LIMIT_PROVIDER_CATALOG, limitProviderForClient } = require('../shared/limits/providers');
const balanceDisplay = require('../shared/limits/balanceDisplay');
const { CURRENCY_RATES, convertUsd, normalizeCurrency } = require('../shared/currency');
const { formatCompactTokens } = require('../shared/compactTokens');
const { ROW_ICON_MASKS, VENDOR_PRESENTATION, vendorColors } = require('../shared/vendorPresentation');

const KIND_LABELS = Object.freeze({
  session: 'Session',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  billing: 'Billing'
});

const QUOTA_STATES = Object.freeze({
  off: { text: 'Quota off', hint: (label) => `Turn on ${label} limits in Settings.`, symbol: 'off' },
  loading: { text: 'Checking…', hint: () => '', symbol: 'stale' },
  notConfigured: { text: 'Not configured', hint: (label) => `Sign in to ${label} in Settings.`, symbol: 'signIn' },
  unauthorized: { text: 'Sign in required', hint: (label) => `Sign in to ${label} again in Settings.`, symbol: 'signIn' },
  rateLimited: { text: 'Unavailable', hint: () => 'The provider is limiting requests. Meter will retry.', symbol: 'warning' },
  unavailable: { text: 'Unavailable', hint: () => 'The provider did not return quota data.', symbol: 'warning' },
  empty: { text: 'No quota reported', hint: () => '', symbol: 'warning' }
});

const STATUS_TO_STATE = Object.freeze({
  disabled: 'off',
  notConfigured: 'notConfigured',
  unauthorized: 'unauthorized',
  rateLimited: 'rateLimited',
  sourceRateLimited: 'rateLimited',
  unavailable: 'unavailable',
  error: 'unavailable'
});

function csv(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
  return String(value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function maskEmail(value) {
  const text = String(value || '');
  const at = text.indexOf('@');
  if (at <= 0) return text;
  return `${text[0]}•••${text.slice(at)}`;
}

// Tracked tools in the user's saved display order, then catalog order.
function orderedTools(settings = {}) {
  const tracked = new Set(csv(settings.clients));
  const hidden = new Set(csv(settings.hiddenClients));
  const catalog = CLIENT_CATALOG.filter((client) => tracked.has(client.id) && !hidden.has(client.id));
  const rank = new Map(csv(settings.clientDisplayOrder).map((id, index) => [id, index]));
  return catalog
    .map((client, index) => ({ client, index }))
    .sort((a, b) => {
      const ra = rank.has(a.client.id) ? rank.get(a.client.id) : Number.MAX_SAFE_INTEGER;
      const rb = rank.has(b.client.id) ? rank.get(b.client.id) : Number.MAX_SAFE_INTEGER;
      return ra - rb || a.index - b.index;
    })
    .map(({ client }) => client);
}

// Two decimals suit a glanceable row; the Home view keeps upstream's finer
// precision for small amounts.
function compactCost(costUsd, currency) {
  const code = normalizeCurrency(currency);
  const amount = convertUsd(costUsd, code);
  const symbol = CURRENCY_RATES[code].symbol;
  if (amount > 0 && amount < 0.01) return `<${symbol}0.01`;
  return `${symbol}${amount.toFixed(2)}`;
}

// A client absent from a completed today scan used no tokens today; that is a
// real zero for usage. Before the first scan there is nothing to show.
function usageFor(stats, clientId, currency) {
  const today = stats?.periods?.today;
  if (!today) return { state: 'loading' };
  const tokens = finite(today.clients?.[clientId]) ?? 0;
  const costUsd = finite(today.clientCosts?.[clientId]) ?? 0;
  return {
    state: 'ok',
    tokens,
    costUsd,
    tokensText: formatCompactTokens(tokens, 'western', 'en'),
    costText: compactCost(costUsd, currency)
  };
}

function windowLabel(window) {
  return String(window?.label || '').trim() || KIND_LABELS[window?.kind] || 'Quota';
}

function windowRow(provider, window) {
  const label = windowLabel(window);
  if (window.metric === 'credits') {
    const amount = balanceDisplay.creditsAmount(provider, window);
    if (amount === null) return { type: 'state', label, state: 'unavailable', text: QUOTA_STATES.unavailable.text };
    return { type: 'amount', label, amountText: balanceDisplay.formatMoney(amount, balanceDisplay.creditsCurrency(provider, window)) };
  }
  if (window.metric === 'spend') {
    const amount = finite(window.used);
    if (amount === null) return { type: 'state', label, state: 'unavailable', text: QUOTA_STATES.unavailable.text };
    return { type: 'amount', label, amountText: balanceDisplay.formatMoney(amount, window.currency || 'USD') };
  }
  if (window.showMeter === false) return null;
  const usedPercent = finite(window.usedPercent);
  if (usedPercent === null) return { type: 'state', label, state: 'unavailable', text: QUOTA_STATES.unavailable.text };
  return {
    type: 'meter',
    label,
    usedPercent,
    resetsAt: window.resetsAt || null
  };
}

function quotaState(state, label, extra = {}) {
  const spec = QUOTA_STATES[state];
  return { state, text: spec.text, hint: spec.hint(label), symbol: spec.symbol, groups: [], ...extra };
}

function quotaFor(stats, providerId, label, enabledProviders, options) {
  if (!providerId) return null;
  if (!enabledProviders.has(providerId)) return quotaState('off', label);
  const records = (stats?.limits?.providers || []).filter((record) => record?.provider === providerId);
  if (records.length === 0) return quotaState('loading', label);

  const groups = [];
  const problems = [];
  for (const record of records) {
    const caption = records.length > 1
      ? (options.maskAccountEmails ? maskEmail(record.accountLabel) : String(record.accountLabel || ''))
      : '';
    if (record.status !== 'ok') {
      problems.push(STATUS_TO_STATE[record.status] || 'unavailable');
      if (records.length > 1) {
        const state = STATUS_TO_STATE[record.status] || 'unavailable';
        groups.push({ caption, stale: false, rows: [{ type: 'state', label: caption || label, state, text: QUOTA_STATES[state].text }] });
      }
      continue;
    }
    const rows = (record.windows || []).map((window) => windowRow(record, window)).filter(Boolean);
    groups.push({ caption, stale: record.stale === true, updatedAt: record.updatedAt || null, rows });
  }

  const hasValues = groups.some((group) => group.rows.some((row) => row.type !== 'state'));
  if (!hasValues) {
    const hasStateRows = groups.some((group) => group.rows.length > 0);
    const state = problems[0] || (hasStateRows ? 'unavailable' : 'empty');
    return quotaState(state, label, hasStateRows ? { groups } : {});
  }
  const stale = groups.some((group) => group.stale);
  return { state: 'ok', text: '', hint: '', symbol: stale ? 'stale' : '', stale, groups };
}

const INK_MARKS = new Set(VENDOR_PRESENTATION.filter((entry) => entry.widgetInk).map((entry) => entry.id));

// Brand colour belongs to the tool mark only. Near-black marks are drawn in the
// label colour so they stay visible on a dark material.
function markFor(id) {
  const file = ROW_ICON_MASKS[id];
  if (!file) return null;
  const color = vendorColors()[id] || null;
  return { file, color: INK_MARKS.has(id) ? null : color };
}

function latestUpdate(stats) {
  const stamps = [stats?.generatedAt, stats?.updatedAt, ...(stats?.limits?.providers || []).map((p) => p?.updatedAt)]
    .map((value) => Date.parse(value || ''))
    .filter(Number.isFinite);
  return stamps.length ? new Date(Math.max(...stamps)).toISOString() : null;
}

function buildMeterPopoverModel({ stats = null, settings = {} } = {}) {
  const enabledProviders = new Set(settings.limitsEnabled === false ? [] : csv(settings.limitProviders));
  const providerLabels = Object.fromEntries(LIMIT_PROVIDER_CATALOG.map((p) => [p.id, p.settingsLabel || p.label]));
  const modules = orderedTools(settings).map((client) => {
    const providerId = limitProviderForClient(client.id);
    return {
      id: client.id,
      label: client.label,
      mark: markFor(client.id),
      providerId,
      usage: usageFor(stats, client.id, settings.currency || 'USD'),
      quota: quotaFor(stats, providerId, providerLabels[providerId] || client.label, enabledProviders, {
        maskAccountEmails: settings.maskLimitAccountEmails === true
      })
    };
  });
  return {
    currency: String(settings.currency || 'USD'),
    updatedAt: latestUpdate(stats),
    modules
  };
}

module.exports = {
  QUOTA_STATES,
  buildMeterPopoverModel,
  orderedTools
};
