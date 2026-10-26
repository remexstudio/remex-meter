'use strict';

// Renders the view model built by src/electron/meterPopoverModel.js. It never
// computes a quota: a meter's value is the model's `usedPercent`, and any row
// without one is rendered as text.
(function meterPopover() {
  const api = window.remexMeter;
  const LOCALE = 'en-US';
  const WARNING_AT = 75;
  const CRITICAL_AT = 90;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SYMBOL_PATHS = {
    warning: ['M8 2.2 14.2 13H1.8Z', 'M8 6.5v3', 'M8 11.3v.2'],
    signIn: ['M8 8.2a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z', 'M3.4 13.4c.9-2 2.6-3 4.6-3s3.7 1 4.6 3'],
    stale: ['M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12Z', 'M8 4.8V8l2.2 1.4'],
    off: ['M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12Z', 'M3.8 12.2 12.2 3.8']
  };

  const els = {
    popover: document.getElementById('popover'),
    updated: document.getElementById('popoverUpdated'),
    modules: document.getElementById('modules'),
    refresh: document.getElementById('refreshButton'),
    settings: document.getElementById('settingsButton'),
    quit: document.getElementById('quitButton')
  };
  let refreshTimer = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function symbol(name) {
    const paths = SYMBOL_PATHS[name];
    if (!paths) return null;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'symbol');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('aria-hidden', 'true');
    for (const d of paths) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    }
    return svg;
  }

  function timeText(date) {
    return date.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
  }

  function updatedText(iso) {
    const time = Date.parse(iso || '');
    if (!Number.isFinite(time)) return 'Waiting for the first reading';
    const age = Date.now() - time;
    if (age < 60_000) return 'Updated just now';
    return `Updated ${timeText(new Date(time))}`;
  }

  function resetText(iso) {
    const time = Date.parse(iso || '');
    if (!Number.isFinite(time)) return '';
    const delta = time - Date.now();
    if (delta <= 0) return 'Reset due';
    const minutes = Math.round(delta / 60_000);
    if (minutes < 60) return `Resets in ${Math.max(1, minutes)} min`;
    if (minutes < 24 * 60) {
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      return rest ? `Resets in ${hours} h ${rest} min` : `Resets in ${hours} h`;
    }
    const date = new Date(time);
    const day = date.toLocaleDateString(LOCALE, { weekday: 'short', month: 'short', day: 'numeric' });
    return `Resets ${day}, ${timeText(date)}`;
  }

  function level(usedPercent) {
    if (usedPercent >= CRITICAL_AT) return 'critical';
    if (usedPercent >= WARNING_AT) return 'warning';
    return 'normal';
  }

  function meterRow(module, row) {
    const used = Number(row.usedPercent);
    const shown = Math.round(used);
    const rowLevel = level(used);
    const reset = resetText(row.resetsAt);
    const node = el('div', `row level-${rowLevel}`);
    node.setAttribute('role', 'listitem');

    const line = el('div', 'row-line');
    line.appendChild(el('span', 'row-label', row.label));
    const value = el('span', 'row-value');
    if (rowLevel !== 'normal') value.appendChild(symbol('warning'));
    value.appendChild(el('span', '', `${shown}% used`));
    line.appendChild(value);
    node.appendChild(line);

    const meter = el('div', 'meter');
    meter.setAttribute('role', 'meter');
    meter.setAttribute('aria-valuemin', '0');
    meter.setAttribute('aria-valuemax', '100');
    meter.setAttribute('aria-valuenow', String(Math.max(0, Math.min(100, used))));
    const cue = rowLevel === 'critical' ? ', at or near the limit' : rowLevel === 'warning' ? ', running low' : '';
    meter.setAttribute('aria-valuetext', `${module.label} ${row.label}, ${shown} percent used${cue}${reset ? `, ${reset.toLowerCase()}` : ''}`);
    const fill = el('div', 'meter-fill');
    fill.style.width = `${Math.max(0, Math.min(100, used))}%`;
    meter.appendChild(fill);
    node.appendChild(meter);

    if (reset) node.appendChild(el('div', 'row-reset', reset));
    return node;
  }

  function amountRow(row) {
    const node = el('div', 'row');
    node.setAttribute('role', 'listitem');
    const line = el('div', 'row-line');
    line.appendChild(el('span', 'row-label', row.label));
    line.appendChild(el('span', 'row-value', row.amountText));
    node.appendChild(line);
    return node;
  }

  function stateRow(row) {
    const node = el('div', 'row');
    node.setAttribute('role', 'listitem');
    const line = el('div', 'row-line');
    line.appendChild(el('span', 'row-label', row.label));
    const value = el('span', 'row-value secondary');
    value.appendChild(symbol('warning'));
    value.appendChild(el('span', '', row.text));
    line.appendChild(value);
    node.appendChild(line);
    return node;
  }

  function stateLine(quota) {
    const node = el('div', 'state');
    const glyph = symbol(quota.symbol);
    if (glyph) node.appendChild(glyph);
    const text = el('span');
    text.appendChild(el('strong', '', quota.text));
    if (quota.hint) text.appendChild(document.createTextNode(` ${quota.hint}`));
    node.appendChild(text);
    return node;
  }

  function usageText(usage) {
    if (!usage || usage.state !== 'ok') return 'No usage yet';
    return `${usage.tokensText} tokens · ${usage.costText} today`;
  }

  function renderModule(module) {
    const node = el('section', 'module');
    node.setAttribute('role', 'listitem');
    node.setAttribute('aria-label', module.label);

    const head = el('div', 'module-head');
    const mark = el('span', 'mark');
    mark.setAttribute('aria-hidden', 'true');
    if (module.mark?.file) {
      const url = `url("../../../../assets/icons/${module.mark.file}.svg")`;
      mark.style.webkitMaskImage = url;
      mark.style.maskImage = url;
      if (module.mark.color) mark.style.backgroundColor = module.mark.color;
    }
    head.appendChild(mark);
    head.appendChild(el('span', 'module-name', module.label));
    head.appendChild(el('span', 'usage', usageText(module.usage)));
    node.appendChild(head);

    const quota = module.quota;
    if (!quota) return node;
    if (quota.groups?.length) {
      const rows = el('div', 'rows');
      rows.setAttribute('role', 'list');
      rows.setAttribute('aria-label', `${module.label} limits`);
      for (const group of quota.groups) {
        if (group.caption) rows.appendChild(el('div', 'group-caption', group.caption));
        for (const row of group.rows) {
          if (row.type === 'meter') rows.appendChild(meterRow(module, row));
          else if (row.type === 'amount') rows.appendChild(amountRow(row));
          else rows.appendChild(stateRow(row));
        }
      }
      node.appendChild(rows);
    }
    if (quota.state !== 'ok') node.appendChild(stateLine(quota));
    else if (quota.stale) node.appendChild(stateLine({ symbol: 'stale', text: 'Stale', hint: 'Showing the last reading.' }));
    return node;
  }

  function applyAppearance(appearance = {}) {
    const body = document.body.classList;
    body.toggle('material-native', appearance.nativeMaterial === true);
    body.toggle('material-solid', appearance.reduceTransparency === true);
    body.toggle('material-fallback', appearance.nativeMaterial !== true && appearance.reduceTransparency !== true);
    body.toggle('contrast-more', appearance.increaseContrast === true);
    body.toggle('motion-reduced', appearance.reduceMotion === true);
  }

  function render(state) {
    if (!state) return;
    applyAppearance(state.appearance);
    document.body.classList.remove('refreshing');
    clearTimeout(refreshTimer);
    els.updated.textContent = updatedText(state.model?.updatedAt);
    const modules = state.model?.modules || [];
    const fragment = document.createDocumentFragment();
    if (modules.length === 0) {
      fragment.appendChild(el('p', 'empty', 'No tools are tracked. Choose tools in Settings.'));
    }
    for (const module of modules) fragment.appendChild(renderModule(module));
    els.modules.replaceChildren(fragment);
  }

  els.refresh.addEventListener('click', () => {
    document.body.classList.add('refreshing');
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => document.body.classList.remove('refreshing'), 15_000);
    api.command('refresh');
  });
  els.settings.addEventListener('click', () => api.command('settings'));
  els.quit.addEventListener('click', () => api.command('quit'));

  api.onState(render);
  api.onOpened(() => els.popover.focus());
  api.getState().then(render);
}());
