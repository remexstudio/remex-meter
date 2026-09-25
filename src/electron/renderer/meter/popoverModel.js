'use strict';

// View model for the Meter popover: one module per tracked tool, in the
// configured order, built only from the catalogs and the normalized stats the
// main process already publishes. Nothing here knows about a specific tool
// except the pool declarations below, which are data from docs/POOLS.md.
//
// Pure data in, pure data out: no DOM and no Node built-ins, so the popover can
// load it as a plain <script> and node:test can require it.
(function exposeMeterPopoverModel(root, factory) {
  const node = typeof module === 'object' && module.exports;
  const api = factory({
    clientCatalog: node ? require('../../../shared/clientCatalog') : root.TokenMonitorClientCatalog,
    limitProviders: node ? require('../../../shared/limits/providers') : root.TokenMonitorLimitProviders,
    balanceDisplay: node ? require('../../../shared/limits/balanceDisplay') : root.TokenMonitorLimitBalanceDisplay,
    windowLabels: node ? require('../../../shared/limits/windowLabels') : root.TokenMonitorLimitWindowLabels,
    vendorPresentation: node ? require('../../../shared/vendorPresentation') : root.TokenMonitorVendorPresentation
  });
  if (node) module.exports = api;
  if (root) root.RemexMeterPopoverModel = api;
})(typeof window !== 'undefined' ? window : null, function createMeterPopoverModel(deps) {
  const { CLIENT_CATALOG, DEFAULT_CLIENT_IDS } = deps.clientCatalog;
  const { DEFAULT_LIMIT_PROVIDER_IDS, LIMIT_PROVIDER_LABELS, limitProviderForClient } = deps.limitProviders;
  const { creditsAmount, creditsCurrency, formatMoney, isCreditsWindow } = deps.balanceDisplay;
  const { limitWindowLabel } = deps.windowLabels;
  const { ROW_ICON_MASKS, VENDOR_PRESENTATION, vendorColors } = deps.vendorPresentation;
  const VENDOR_BY_ID = new Map(VENDOR_PRESENTATION.map((entry) => [entry.id, entry]));

  // Pools a provider meters separately (docs/POOLS.md). A pool with no
  // identified source renders as unavailable, and `replacesWindows` hides the
  // provider's own windows because none of them is any of the pools.
  const POOL_DECLARATIONS = Object.freeze({
    grok: Object.freeze({
      replacesWindows: true,
      pools: Object.freeze([
        Object.freeze({ label: 'Grok Heavy Weekly', source: null }),
        Object.freeze({ label: 'Grok Bolt Weekly', source: null })
      ])
    })
  });

  const PROVIDER_STATES = Object.freeze({
    disabled: { state: 'off', text: 'Limits off' },
    notConfigured: { state: 'notConfigured', text: 'Not configured' },
    unauthorized: { state: 'signIn', text: 'Sign in required' },
    rateLimited: { state: 'unavailable', text: 'Rate limited' },
    sourceRateLimited: { state: 'unavailable', text: 'Rate limited' },
    unavailable: { state: 'unavailable', text: 'Unavailable' },
    error: { state: 'unavailable', text: 'Unavailable' }
  });

  function csv(value) {
    return String(value ?? '').split(',').map((part) => part.trim().toLowerCase()).filter(Boolean);
  }

  function finite(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function orderedToolIds(settings = {}) {
    const known = CLIENT_CATALOG.map((client) => client.id);
    const knownSet = new Set(known);
    const tracked = new Set(settings.clients === undefined || settings.clients === null
      ? DEFAULT_CLIENT_IDS
      : csv(settings.clients));
    const hidden = new Set(csv(settings.hiddenClients));
    const seen = new Set();
    const order = [];
    for (const id of [...csv(settings.clientDisplayOrder), ...known]) {
      if (!knownSet.has(id) || seen.has(id)) continue;
      seen.add(id);
      if (tracked.has(id) && !hidden.has(id)) order.push(id);
    }
    return order;
  }

  function enabledProviderIds(settings = {}) {
    if (settings.limitsEnabled === false) return new Set();
    return new Set(settings.limitProviders === undefined || settings.limitProviders === null
      ? DEFAULT_LIMIT_PROVIDER_IDS
      : csv(settings.limitProviders));
  }

  function formatAge(ms) {
    const minutes = Math.max(0, Math.round(ms / 60000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours} h ago`;
    return `${Math.round(hours / 24)} d ago`;
  }

  function formatReset(resetsAt, now) {
    const time = Date.parse(String(resetsAt || ''));
    if (!Number.isFinite(time)) return '';
    const diff = time - now;
    if (diff <= 0) return 'Resetting';
    if (diff < 60 * 60 * 1000) return `Resets in ${Math.max(1, Math.round(diff / 60000))} min`;
    const date = new Date(time);
    const withinWeek = diff < 6 * 24 * 60 * 60 * 1000;
    const text = new Intl.DateTimeFormat('en-US', withinWeek
      ? { weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
      : { month: 'short', day: 'numeric' }).format(date);
    return `Resets ${text.replace(',', '')}`;
  }

  function stateRow(label, state, text) {
    return { kind: 'state', label, state, stateText: text };
  }

  function windowRow(providerId, provider, window, now) {
    const label = limitWindowLabel(providerId, window, 'Quota');
    const reset = formatReset(window.resetsAt, now);
    if (isCreditsWindow(window) || window.metric === 'spend') {
      const spend = window.metric === 'spend';
      const amount = spend ? finite(window.used) : creditsAmount(provider, window);
      if (amount === null) return stateRow(label, 'unavailable', 'Unavailable');
      const currency = spend ? String(window.currency || 'USD') : creditsCurrency(provider, window);
      const limit = spend ? finite(window.limit) : null;
      const amountText = limit === null
        ? formatMoney(amount, currency)
        : `${formatMoney(amount, currency)} of ${formatMoney(limit, currency)}`;
      return { kind: 'amount', label, amountText, resetText: reset };
    }
    const usedPercent = finite(window.usedPercent);
    if (usedPercent === null || window.showMeter === false) {
      return stateRow(label, 'unavailable', 'Unavailable');
    }
    const clamped = Math.max(0, Math.min(100, usedPercent));
    return {
      kind: 'meter',
      label,
      usedPercent: clamped,
      level: clamped >= 90 ? 'critical' : clamped >= 75 ? 'warning' : 'normal',
      resetText: reset
    };
  }

  function providerRows(providerId, provider, now) {
    const pools = POOL_DECLARATIONS[providerId];
    const rows = pools
      ? pools.pools.map((pool) => stateRow(pool.label, 'unavailable', 'Unavailable'))
      : [];
    if (!pools?.replacesWindows) {
      for (const window of provider.windows || []) rows.push(windowRow(providerId, provider, window, now));
    }
    return rows;
  }

  function accountSection(providerId, provider, showAccount, now) {
    const section = {
      accountLabel: showAccount ? String(provider.accountLabel || '').trim() : '',
      state: 'ok',
      stateText: '',
      stale: null,
      rows: []
    };
    const status = String(provider.status || 'error');
    if (status !== 'ok') {
      const mapped = PROVIDER_STATES[status] || PROVIDER_STATES.error;
      section.state = mapped.state;
      section.stateText = mapped.text;
      return section;
    }
    section.rows = providerRows(providerId, provider, now);
    if (section.rows.length === 0) {
      section.state = 'unavailable';
      section.stateText = 'Unavailable';
    }
    if (provider.stale) {
      const updated = Date.parse(String(provider.updatedAt || ''));
      section.stale = Number.isFinite(updated) ? `Stale · updated ${formatAge(now - updated)}` : 'Stale';
    }
    return section;
  }

  function limitsFor(providerId, stats, enabled, now) {
    if (!providerId) return null;
    const label = LIMIT_PROVIDER_LABELS[providerId] || providerId;
    if (!enabled.has(providerId)) {
      return { providerId, label, state: 'off', stateText: 'Limits off', sections: [] };
    }
    const records = (Array.isArray(stats?.limits?.providers) ? stats.limits.providers : [])
      .filter((record) => String(record?.provider || '').toLowerCase() === providerId);
    if (records.length === 0) {
      return { providerId, label, state: 'pending', stateText: 'Waiting for limits', sections: [] };
    }
    const showAccount = records.length > 1;
    return {
      providerId,
      label,
      state: 'ok',
      stateText: '',
      sections: records.map((record) => accountSection(providerId, record, showAccount, now))
    };
  }

  function usageFor(id, stats) {
    const today = stats?.periods?.today;
    if (!today || typeof today !== 'object') return { state: 'pending', tokens: null, costUsd: null };
    return {
      state: 'ok',
      tokens: Math.max(0, Math.round(finite(today.clients?.[id]) ?? 0)),
      costUsd: finite(today.clientCosts?.[id])
    };
  }

  // Near-black marks (`widgetInk`) are drawn in the label colour so they stay
  // legible on a dark material; every other mark keeps its brand colour.
  function markFor(id, colors) {
    const file = ROW_ICON_MASKS[id];
    if (!file) return null;
    const entry = VENDOR_BY_ID.get(id);
    return { file: `${file}.svg`, color: entry?.widgetInk ? null : colors[id] || null };
  }

  function buildMeterModel({ stats = null, settings = {}, now = Date.now() } = {}) {
    const labels = new Map(CLIENT_CATALOG.map((client) => [client.id, client.label]));
    const colors = { ...vendorColors(), ...(settings.vendorColors || {}) };
    const enabled = enabledProviderIds(settings);
    const modules = orderedToolIds(settings).map((id) => ({
      id,
      label: labels.get(id),
      mark: markFor(id, colors),
      usage: usageFor(id, stats),
      limits: limitsFor(limitProviderForClient(id), stats, enabled, now)
    }));
    const updated = Date.parse(String(stats?.updatedAt || stats?.generatedAt || ''));
    return {
      updatedAt: Number.isFinite(updated) ? new Date(updated).toISOString() : null,
      updatedText: Number.isFinite(updated) ? `Updated ${formatAge(now - updated)}` : 'Waiting for first scan',
      modules
    };
  }

  function meterValueText(moduleLabel, row) {
    if (row.kind === 'meter') {
      return `${moduleLabel}, ${row.label}, ${Math.round(row.usedPercent)} percent used${row.resetText ? `, ${row.resetText.toLowerCase()}` : ''}`;
    }
    if (row.kind === 'amount') return `${moduleLabel}, ${row.label}, ${row.amountText}`;
    return `${moduleLabel}, ${row.label}, ${row.stateText}`;
  }

  return {
    POOL_DECLARATIONS,
    buildMeterModel,
    formatReset,
    meterValueText,
    orderedToolIds
  };
});
