'use strict';

// The Meter popover renderer. It paints whatever buildMeterModel() returns;
// every module goes through the same generic markup, so a tool is never
// special-cased here.
(function startMeterPopover() {
  const bridge = window.tokenMonitor;
  const { buildMeterModel, meterValueText } = window.RemexMeterPopoverModel;
  const compactTokens = window.TokenMonitorCompactTokens;
  const currency = window.TokenMonitorCurrency;

  const els = {
    popover: document.getElementById('popover'),
    updated: document.getElementById('updatedText'),
    modules: document.getElementById('modules'),
    refresh: document.getElementById('refreshButton'),
    settings: document.getElementById('settingsButton'),
    quit: document.getElementById('quitButton'),
    symbols: document.getElementById('stateSymbols')
  };

  const params = new URLSearchParams(window.location.search);
  const root = document.documentElement;
  root.classList.add(`material-${params.get('material') || 'css'}`);
  if (params.get('contrast') === 'more') root.classList.add('contrast-more');

  const state = { stats: null, settings: {}, refreshing: false };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function symbol(name) {
    const source = els.symbols.content.querySelector(`[data-symbol="${name}"]`)
      || els.symbols.content.querySelector('[data-symbol="unavailable"]');
    return source.cloneNode(true);
  }

  function stateLine(stateName, text, className = 'state-line') {
    const line = el('p', className);
    line.dataset.state = stateName;
    line.append(symbol(stateName), el('span', '', text));
    return line;
  }

  function usageText(usage) {
    if (usage.state !== 'ok') return 'Waiting for usage';
    const tokens = `${compactTokens.formatCompactTokens(usage.tokens, 'western', 'en')} tokens`;
    if (usage.costUsd === null) return `${tokens} today`;
    return `${tokens} · ${costText(usage.costUsd)} today`;
  }

  function costText(costUsd) {
    const code = currency.normalizeCurrency(state.settings.currency);
    const amount = currency.convertUsd(costUsd, code);
    const symbol = currency.CURRENCY_RATES[code].symbol;
    if (amount > 0 && amount < 0.01) return `<${symbol}0.01`;
    return `${symbol}${amount.toFixed(2)}`;
  }

  function markNode(mark) {
    const node = el('span', 'tool-mark');
    node.setAttribute('aria-hidden', 'true');
    if (mark) {
      const url = `url("../../../../assets/icons/${mark.file}")`;
      node.style.webkitMaskImage = url;
      node.style.maskImage = url;
      if (mark.color) node.style.backgroundColor = mark.color;
    }
    return node;
  }

  function rowNode(moduleLabel, row) {
    const item = el('div', `limit-row limit-row-${row.kind}`);
    const head = el('div', 'limit-row-head');
    head.append(el('span', 'limit-label', row.label));
    if (row.kind === 'meter') {
      head.append(el('span', 'limit-value', `${Math.round(row.usedPercent)}%`));
      item.append(head);
      const meter = el('div', 'meter');
      meter.dataset.level = row.level;
      meter.setAttribute('role', 'meter');
      meter.setAttribute('aria-valuemin', '0');
      meter.setAttribute('aria-valuemax', '100');
      meter.setAttribute('aria-valuenow', String(Math.round(row.usedPercent)));
      meter.setAttribute('aria-valuetext', meterValueText(moduleLabel, row));
      const fill = el('div', 'meter-fill');
      fill.style.width = `${row.usedPercent}%`;
      meter.append(fill);
      item.append(meter);
      if (row.level !== 'normal') item.append(stateLine(row.level, row.level === 'critical' ? 'Nearly used up' : 'Running low', 'level-line'));
    } else if (row.kind === 'amount') {
      head.append(el('span', 'limit-value', row.amountText));
      item.append(head);
      item.setAttribute('aria-label', meterValueText(moduleLabel, row));
    } else {
      item.append(head, stateLine(row.state, row.stateText));
      item.setAttribute('aria-label', meterValueText(moduleLabel, row));
    }
    if (row.resetText) item.append(el('p', 'reset-text', row.resetText));
    return item;
  }

  function moduleNode(module) {
    const section = el('section', 'tool-module');
    section.setAttribute('role', 'listitem');
    section.setAttribute('aria-label', module.label);
    const header = el('div', 'tool-header');
    const name = el('span', 'tool-name', module.label);
    header.append(markNode(module.mark), name);
    section.append(header, el('p', 'usage-text', usageText(module.usage)));

    const limits = module.limits;
    if (!limits) return section;
    if (limits.state !== 'ok') {
      section.append(stateLine(limits.state, limits.stateText));
      return section;
    }
    for (const account of limits.sections) {
      const group = el('div', 'account-group');
      if (account.accountLabel) group.append(el('p', 'account-label', account.accountLabel));
      if (account.state !== 'ok') {
        group.append(stateLine(account.state, account.stateText));
      } else {
        for (const row of account.rows) group.append(rowNode(module.label, row));
      }
      if (account.stale) group.append(stateLine('stale', account.stale));
      section.append(group);
    }
    return section;
  }

  function reportHeight() {
    const height = Math.ceil(els.popover.getBoundingClientRect().height);
    bridge.setPreferredHeight?.(height);
  }

  function render() {
    if (state.settings.currencyRatesEffective) currency.configureRates?.(state.settings.currencyRatesEffective);
    const model = buildMeterModel({ stats: state.stats, settings: state.settings, now: Date.now() });
    els.updated.textContent = state.refreshing ? 'Refreshing…' : model.updatedText;
    const nodes = model.modules.map(moduleNode);
    if (nodes.length === 0) nodes.push(stateLine('notConfigured', 'No tools are enabled. Choose tools in Settings.'));
    els.modules.replaceChildren(...nodes);
    requestAnimationFrame(reportHeight);
  }

  async function load() {
    const [settings, stats] = await Promise.all([
      bridge.getSettings().catch(() => state.settings),
      bridge.getStats().catch(() => state.stats)
    ]);
    state.settings = settings || {};
    state.stats = stats || null;
    render();
  }

  async function refreshNow() {
    if (state.refreshing) return;
    state.refreshing = true;
    els.refresh.setAttribute('aria-busy', 'true');
    render();
    try {
      state.stats = await bridge.getStats({ force: true }) || state.stats;
    } catch (_) { /* the next push repaints */ }
    state.refreshing = false;
    els.refresh.removeAttribute('aria-busy');
    render();
  }

  bridge.onStatsPush?.((payload) => {
    const stats = payload?.data?.stats;
    if (!stats) return;
    state.stats = stats;
    render();
  });
  bridge.onSettingsPush?.((settings) => {
    state.settings = settings || {};
    render();
  });
  bridge.onWindowVisibilityPush?.((visible) => {
    if (!visible) return;
    load();
    els.popover.focus();
  });

  els.refresh.addEventListener('click', refreshNow);
  els.settings.addEventListener('click', () => bridge.openSettings?.());
  els.quit.addEventListener('click', () => bridge.quit?.());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      bridge.close();
      return;
    }
    if (!event.metaKey || event.altKey || event.ctrlKey) return;
    if (event.key === ',') {
      event.preventDefault();
      bridge.openSettings?.();
    } else if (event.key.toLowerCase() === 'q') {
      event.preventDefault();
      bridge.quit?.();
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      refreshNow();
    }
  });
  setInterval(render, 60 * 1000);

  load().then(() => els.popover.focus());
})();
