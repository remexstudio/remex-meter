'use strict';

const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  NATIVE_MATERIAL,
  POPOVER_WIDTH,
  clampPopoverHeight,
  createMeterPopover,
  popoverMaterial,
  popoverQuery,
  popoverWindowOptions
} = require('../../src/electron/meterPopover');

test('the popover uses real vibrancy on macOS and CSS blur only as a fallback', () => {
  assert.equal(popoverMaterial({ platform: 'darwin' }), 'native');
  assert.equal(popoverMaterial({ platform: 'linux' }), 'css');
  assert.equal(popoverMaterial({ platform: 'darwin', reduceTransparency: true }), 'none');

  const mac = popoverWindowOptions({ platform: 'darwin', preload: '/preload.js' });
  assert.equal(mac.vibrancy, NATIVE_MATERIAL);
  assert.equal(mac.vibrancy, 'popover');
  assert.equal(mac.visualEffectState, 'active');
  assert.equal(mac.transparent, true);
  assert.equal(mac.backgroundColor, '#00000000');
  assert.equal(mac.frame, false);
  assert.equal(mac.width, POPOVER_WIDTH);
  assert.ok(POPOVER_WIDTH >= 280 && POPOVER_WIDTH <= 360);
  assert.deepEqual(
    [mac.webPreferences.contextIsolation, mac.webPreferences.nodeIntegration, mac.webPreferences.sandbox],
    [true, false, true]
  );

  const reduced = popoverWindowOptions({ platform: 'darwin', reduceTransparency: true });
  assert.equal(reduced.vibrancy, undefined);
  assert.equal(reduced.visualEffectState, 'active');
  assert.deepEqual(popoverQuery({ platform: 'darwin', reduceTransparency: true, highContrast: true }), {
    material: 'none',
    contrast: 'more'
  });
});

test('the stylesheet never stacks the CSS blur on the native material', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'electron', 'renderer', 'meter', 'popover.css'), 'utf8');
  const blurRules = css.split('}').filter((rule) => /backdrop-filter/.test(rule));
  assert.ok(blurRules.length > 0);
  for (const rule of blurRules) assert.match(rule, /html\.material-css/);
  assert.match(css, /html\.material-none \.popover \{[^}]*background: var\(--window-background\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /prefers-contrast: more/);
  assert.match(css, /font-variant-numeric: tabular-nums/);
});

test('popover height fits content up to the work area', () => {
  assert.equal(clampPopoverHeight(400, 900), 400);
  assert.equal(clampPopoverHeight(2000, 900), 892);
  assert.equal(clampPopoverHeight(10, 900), 120);
});

function fakeElectron() {
  const windows = [];
  class FakeWindow extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.visible = false;
      this.destroyed = false;
      this.vibrancy = options.vibrancy || null;
      this.sent = [];
      this.loads = [];
      this.webContents = { send: (channel, payload) => this.sent.push([channel, payload]) };
      windows.push(this);
    }
    setAlwaysOnTop(flag, level) { this.alwaysOnTop = [flag, level]; }
    loadFile(file, options) { this.loads.push([file, options]); return Promise.resolve(); }
    setBounds(bounds) { this.bounds = bounds; }
    show() { this.visible = true; }
    focus() {}
    hide() { this.visible = false; }
    isVisible() { return this.visible; }
    isDestroyed() { return this.destroyed; }
    setVibrancy(value) { this.vibrancy = value; }
    destroy() { this.destroyed = true; }
  }
  const nativeTheme = { prefersReducedTransparency: false, shouldUseHighContrastColors: false };
  const screen = {
    getCursorScreenPoint: () => ({ x: 0, y: 0 }),
    getDisplayNearestPoint: () => ({ workArea: { x: 0, y: 25, width: 1440, height: 875 } })
  };
  return { BrowserWindow: FakeWindow, nativeTheme, screen, windows };
}

test('the controller anchors, toggles, hides on blur and follows Reduce Transparency', () => {
  const electron = fakeElectron();
  const anchors = [];
  const popover = createMeterPopover({
    ...electron,
    platform: 'darwin',
    preload: '/preload.js',
    anchorBounds: (width, height, anchor) => {
      anchors.push([width, height, anchor]);
      return { x: 100, y: 30, width, height };
    }
  });

  popover.toggle({ point: { x: 120, y: 10 } });
  const [win] = electron.windows;
  assert.equal(win.visible, true);
  assert.deepEqual(win.alwaysOnTop, [true, 'pop-up-menu']);
  assert.deepEqual(win.loads[0][1].query, { material: 'native', contrast: 'standard' });
  assert.deepEqual(anchors[0], [POPOVER_WIDTH, 240, { point: { x: 120, y: 10 } }]);
  assert.deepEqual(win.sent.at(-1), ['window:visibility', true]);
  assert.equal(popover.owns(win.webContents), true);
  assert.equal(popover.owns({}), false);

  popover.setContentHeight(410);
  assert.equal(win.bounds.height, 410);

  win.emit('blur');
  assert.equal(win.visible, true, 'the opening click does not immediately blur it away');

  popover.toggle();
  assert.equal(win.visible, false);
  assert.deepEqual(win.sent.at(-1), ['window:visibility', false]);

  electron.nativeTheme.prefersReducedTransparency = true;
  popover.syncAccessibility();
  assert.equal(win.vibrancy, null);
  assert.deepEqual(win.loads.at(-1)[1].query, { material: 'none', contrast: 'standard' });

  electron.nativeTheme.prefersReducedTransparency = false;
  popover.syncAccessibility();
  assert.equal(win.vibrancy, NATIVE_MATERIAL);
  assert.equal(electron.windows.length, 1, 'one reused window, never rebuilt');
});

test('main routes the macOS status item to the Meter popover', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'electron', 'main.js'), 'utf8');
  assert.match(main, /function handleTrayToggle\(_tray, clickPoint = null\) \{\n {2}if \(process\.platform === 'darwin'\) \{[\s\S]*?ensureMeterPopover\(\)\.toggle\(\{ point: clickPoint \}\);/);
  assert.match(main, /meterPopover\?\.send\('stats:push', rendererPayload\);/);
  assert.match(main, /meterPopover\?\.send\('settings:push', payload\);/);
  assert.match(main, /nativeTheme\.on\('updated', \(\) => \{[\s\S]*?meterPopover\?\.syncAccessibility\(\);/);
  assert.match(main, /trayMode: process\.platform === 'darwin',/);
  assert.match(main, /language: 'en',/);
});
