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
// - Cursor and Grok pool rows are selected by limitId (docs/POOLS.md). A
//   missing pool is a text state. Other windows keep the provider's label.

const { CLIENT_CATALOG } = require('../shared/clientCatalog');
const { LIMIT_PROVIDER_CATALOG, limitProviderForClient } = require('../shared/limits/providers');
const { CURSOR_OVERALL, CURSOR_REQUESTS, POOL_MODULES } = require('../shared/limits/poolModules');
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

function withIdentity(row, window) {
  return window?.limitId ? { ...row, limitId: window.limitId } : row;
}

function windowRow(provider, window, now) {
  const label = windowLabel(window);
  if (window.metric === 'credits') {
    const amount = balanceDisplay.creditsAmount(provider, window);
    if (amount === null) return withIdentity({ type: 'state', label, state: 'unavailable', text: QUOTA_STATES.unavailable.text }, window);
    const amountText = balanceDisplay.formatMoney(amount, balanceDisplay.creditsCurrency(provider, window));
    return withIdentity({ type: 'amount', label, amountText, voiceText: `${label}, ${amountText}` }, window);
  }
  if (window.metric === 'spend') {
    const amount = finite(window.used);
    if (amount === null) return withIdentity({ type: 'state', label, state: 'unavailable', text: QUOTA_STATES.unavailable.text }, window);
    const amountText = balanceDisplay.formatMoney(amount, window.currency || 'USD');
    return withIdentity({ type: 'amount', label, amountText, voiceText: `${label}, ${amountText}` }, window);
  }
  if (window.showMeter === false) return null;
  const usedPercent = finite(window.usedPercent);
  if (usedPercent === null) {
    return withIdentity({
      type: 'state',
      label,
      state: 'unavailable',
      text: QUOTA_STATES.unavailable.text,
      symbol: QUOTA_STATES.unavailable.symbol,
      voiceText: stateVoice(label, QUOTA_STATES.unavailable.text, '')
    }, window);
  }
  const resetText = resetPhrase(window.resetsAt, now);
  return withIdentity({
    type: 'meter',
    label,
    usedPercent,
    resetsAt: window.resetsAt || null,
    resetText,
    level: meterLevel(usedPercent),
    voiceText: meterVoice(label, usedPercent, resetText)
  }, window);
}

// Pool rows come first, selected by limitId. Every other window follows under
// the label the provider gave it. A pool id that is absent becomes a text
// state and is never filled from a neighbouring window.
function rowsForRecord(record, providerId, now) {
  const windows = Array.isArray(record.windows) ? record.windows : [];
  const specs = POOL_MODULES[providerId] || [];
  const byId = new Map();
  for (const window of windows) {
    if (window?.limitId && !byId.has(window.limitId)) byId.set(window.limitId, window);
  }
  const consumed = new Set();
  const poolRows = specs.map((spec) => {
    const window = byId.get(spec.limitId);
    if (!window) return absentPoolRow(spec, windows);
    consumed.add(spec.limitId);
    const row = windowRow(record, window, now);
    if (!row || row.type !== 'meter') return absentPoolRow(spec, windows);
    const resetText = row.resetText || '';
    return {
      ...row,
      label: spec.label,
      voiceText: meterVoice(spec.label, row.usedPercent, resetText)
    };
  });
  const rest = windows
    .filter((window) => !window?.limitId || !consumed.has(window.limitId))
    .map((window) => windowRow(record, window, now))
    .filter(Boolean);
  return [...poolRows, ...rest];
}

function quotaState(state, label, extra = {}) {
  const spec = QUOTA_STATES[state];
  return { state, text: spec.text, hint: spec.hint(label), symbol: spec.symbol, groups: [], ...extra };
}

function quotaFor(stats, providerId, label, enabledProviders, options, now) {
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
    const rows = rowsForRecord(record, providerId, now);
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

const METER_WARNING_AT = 75;
const METER_CRITICAL_AT = 90;
const INK_MARKS = new Set(VENDOR_PRESENTATION.filter((entry) => entry.widgetInk).map((entry) => entry.id));

function formatPercent(value) {
  const number = Math.round(Number(value) * 10) / 10;
  if (!Number.isFinite(number)) return '';
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function meterLevel(usedPercent) {
  if (usedPercent >= METER_CRITICAL_AT) return 'critical';
  if (usedPercent >= METER_WARNING_AT) return 'warning';
  return 'normal';
}

function resetPhrase(iso, now) {
  const time = Date.parse(iso || '');
  if (!Number.isFinite(time)) return '';
  const delta = time - now;
  if (delta <= 0) return 'Reset due';
  const minutes = Math.round(delta / 60_000);
  if (minutes < 60) return `Resets in ${Math.max(1, minutes)} min`;
  if (minutes < 24 * 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `Resets in ${hours} h ${rest} min` : `Resets in ${hours} h`;
  }
  const date = new Date(time);
  const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const clock = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `Resets ${day}, ${clock}`;
}

function meterVoice(label, usedPercent, resetText) {
  const levelName = meterLevel(usedPercent);
  const cue = levelName === 'critical' ? ', at or near the limit' : levelName === 'warning' ? ', running low' : '';
  const reset = resetText ? `, ${resetText.charAt(0).toLowerCase()}${resetText.slice(1)}` : '';
  return `${label}, ${formatPercent(usedPercent)} percent used${cue}${reset}`;
}

function stateVoice(label, text, hint) {
  return hint ? `${label}, ${text}. ${hint}` : `${label}, ${text}`;
}

// Requests and Overall are the provider's own windows. Name them in the pool
// row so the unavailable state says which allowance was returned instead.
function poolAbsentHint(spec, windows) {
  const ids = new Set((windows || []).map((window) => window?.limitId).filter(Boolean));
  const named = spec.limitId === 'cursor.modePool' ? 'Mode Pool' : spec.limitId === 'cursor.otherModes' ? 'Other Modes' : '';
  if (named && ids.has(CURSOR_REQUESTS)) return `This account reports Requests, not ${named}.`;
  if (named && ids.has(CURSOR_OVERALL)) return `This account reports Overall, not ${named}.`;
  return spec.absentHint;
}

function absentPoolRow(spec, windows) {
  const hint = poolAbsentHint(spec, windows);
  return {
    type: 'state',
    limitId: spec.limitId,
    label: spec.label,
    state: 'unavailable',
    text: QUOTA_STATES.unavailable.text,
    hint,
    symbol: QUOTA_STATES.unavailable.symbol,
    voiceText: stateVoice(spec.label, QUOTA_STATES.unavailable.text, hint)
  };
}

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

function buildMeterPopoverModel({ stats = null, settings = {}, now = Date.now() } = {}) {
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
      }, now)
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
