'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { EventEmitter } = require('node:events');

const {
  POPOVER_WIDTH,
  appearanceState,
  createMeterPopover,
  popoverKeyCommand
} = require('../../src/electron/meterPopover');
const motionPreference = require('../../src/electron/motionPreference');
const { buildMeterMenuTemplate } = require('../../src/electron/tray');

const ROOT = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function fakeElectron({ reduceTransparency = false } = {}) {
  const windows = [];
  const handlers = new Map();
  const listeners = new Map();
  class BrowserWindow extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.visible = false;
      this.destroyed = false;
      this.vibrancy = [];
      this.bounds = null;
      this.sent = [];
      this.webContents = Object.assign(new EventEmitter(), {
        send: (channel, payload) => this.sent.push([channel, payload]),
        isLoading: () => false,
        setWindowOpenHandler() {}
      });
      windows.push(this);
    }
    loadFile(file) { this.file = file; }
    setAlwaysOnTop(flag, level) { this.alwaysOnTop = [flag, level]; }
    setBounds(bounds) { this.bounds = bounds; }
    setVibrancy(value) { this.vibrancy.push(value); }
    isVisible() { return this.visible; }
    isDestroyed() { return this.destroyed; }
    show() { this.visible = true; this.emit('show'); }
    focus() {}
    hide() { this.visible = false; this.emit('hide'); }
    destroy() { this.destroyed = true; }
  }
  const nativeTheme = Object.assign(new EventEmitter(), {
    prefersReducedTransparency: reduceTransparency,
    shouldUseHighContrastColors: false,
    shouldUseDarkColors: true
  });
  const display = { bounds: { x: 0, y: 0, width: 1512, height: 982 }, workArea: { x: 0, y: 25, width: 1512, height: 944 } };
  return {
    windows,
    handlers,
    listeners,
    electron: {
      BrowserWindow,
      nativeTheme,
      shell: { openExternal() {} },
      systemPreferences: { getAnimationSettings: () => ({ prefersReducedMotion: false }) },
      screen: {
        getCursorScreenPoint: () => ({ x: 1200, y: 10 }),
        getDisplayNearestPoint: () => display
      },
      ipcMain: {
        handle: (channel, fn) => handlers.set(channel, fn),
        removeHandler: (channel) => handlers.delete(channel),
        on: (channel, fn) => listeners.set(channel, fn),
        removeListener: (channel) => listeners.delete(channel)
      }
    }
  };
}

function tray() {
  return { getBounds: () => ({ x: 1180, y: 0, width: 24, height: 24 }) };
}

test('the popover window is built with the real popover material', () => {
  const fake = fakeElectron();
  const popover = createMeterPopover({ electron: fake.electron, getTray: tray, getState: () => ({ model: { modules: [] } }), onCommand() {}, platform: 'darwin' });
  popover.show({ x: 1190, y: 10 });
  const [win] = fake.windows;
  assert.equal(win.options.vibrancy, 'popover');
  assert.equal(win.options.visualEffectState, 'active');
  assert.equal(win.options.transparent, true);
  assert.equal(win.options.backgroundColor, '#00000000');
  assert.equal(win.options.frame, false);
  assert.equal(win.options.resizable, false);
  assert.equal(win.options.webPreferences.contextIsolation, true);
  assert.equal(win.options.webPreferences.nodeIntegration, false);
  assert.equal(win.options.webPreferences.sandbox, true);
  assert.match(win.options.webPreferences.preload, /meterPreload\.js$/);
  assert.match(win.file, /renderer[\\/]meter[\\/]popover\.html$/);
  assert.equal(win.bounds.width, POPOVER_WIDTH);
  assert.ok(POPOVER_WIDTH >= 280 && POPOVER_WIDTH <= 360);
  assert.deepEqual(win.alwaysOnTop, [true, 'pop-up-menu']);
  assert.equal(win.vibrancy.at(-1), 'popover', 'material attached while shown');
  popover.hide();
  assert.equal(win.vibrancy.at(-1), null, 'material detached while hidden');
});

test('Reduce Transparency detaches the material and asks for a solid background', () => {
  const fake = fakeElectron({ reduceTransparency: true });
  const popover = createMeterPopover({ electron: fake.electron, getTray: tray, getState: () => ({ model: { modules: [] } }), onCommand() {}, platform: 'darwin' });
  popover.show();
  const [win] = fake.windows;
  assert.equal(win.vibrancy.at(-1), null);
  const state = fake.handlers.get('meter:getState')({ sender: win.webContents });
  assert.equal(state.appearance.nativeMaterial, false);
  assert.equal(state.appearance.reduceTransparency, true);
});

test('appearance follows Increase Contrast and the motion preference', () => {
  const base = { nativeTheme: { shouldUseHighContrastColors: true }, systemPreferences: { getAnimationSettings: () => ({ prefersReducedMotion: true }) }, motionPreference, platform: 'darwin' };
  assert.equal(appearanceState({ ...base, reduceMotionPreference: 'system' }).reduceMotion, true);
  assert.equal(appearanceState({ ...base, reduceMotionPreference: 'off' }).reduceMotion, false);
  assert.equal(appearanceState({ ...base, reduceMotionPreference: 'system' }).increaseContrast, true);
  assert.equal(appearanceState({ ...base, platform: 'linux' }).nativeMaterial, false);
});

test('only the popover renderer can read its state or send commands', () => {
  const fake = fakeElectron();
  const commands = [];
  const popover = createMeterPopover({ electron: fake.electron, getTray: tray, getState: () => ({ model: { modules: [] } }), onCommand: (name) => commands.push(name), platform: 'darwin' });
  popover.show();
  const [win] = fake.windows;
  const stranger = { sender: {} };
  assert.equal(fake.handlers.get('meter:getState')(stranger), null);
  fake.listeners.get('meter:command')(stranger, 'quit');
  fake.listeners.get('meter:command')({ sender: win.webContents }, 'rm -rf');
  fake.listeners.get('meter:command')({ sender: win.webContents }, 'settings');
  assert.deepEqual(commands, ['settings']);
  assert.equal(win.visible, false, 'opening Settings closes the popover');
});

test('keyboard: Escape closes, Command-comma opens Settings', () => {
  assert.equal(popoverKeyCommand({ type: 'keyDown', key: 'Escape' }), 'hide');
  assert.equal(popoverKeyCommand({ type: 'keyDown', key: ',', meta: true }), 'settings');
  assert.equal(popoverKeyCommand({ type: 'keyDown', key: 'r', meta: true }), 'refresh');
  assert.equal(popoverKeyCommand({ type: 'keyDown', key: 'q', meta: true }), 'quit');
  assert.equal(popoverKeyCommand({ type: 'keyDown', key: 'w', meta: true }), 'hide');
  assert.equal(popoverKeyCommand({ type: 'keyUp', key: 'Escape' }), '');
  assert.equal(popoverKeyCommand({ type: 'keyDown', key: 'a' }), '');
});

test('blur hides the popover after the opening click settles', async () => {
  const fake = fakeElectron();
  const popover = createMeterPopover({ electron: fake.electron, getTray: tray, getState: () => ({}), onCommand() {}, platform: 'darwin' });
  popover.show();
  const [win] = fake.windows;
  win.emit('blur');
  assert.equal(win.visible, true, 'the click that opened it must not close it');
  await new Promise((resolve) => setTimeout(resolve, 300));
  win.emit('blur');
  assert.equal(win.visible, false);
  popover.destroy();
});

test('the macOS status item menu carries only app-level commands', () => {
  const calls = [];
  const template = buildMeterMenuTemplate({
    onRefresh: () => calls.push('refresh'),
    onOpenSettings: () => calls.push('settings'),
    onAbout: () => calls.push('about'),
    onQuit: () => calls.push('quit')
  });
  assert.deepEqual(template.map((item) => item.label || item.type), ['Refresh', 'separator', 'Settings…', 'About Remex Meter', 'separator', 'Quit Remex Meter']);
  for (const item of template) item.click?.();
  assert.deepEqual(calls, ['refresh', 'settings', 'about', 'quit']);
  assert.equal(template.find((item) => item.label === 'Settings…').accelerator, 'Command+,');
});

test('main routes the macOS status item to the Meter popover', () => {
  const main = read('src/electron/main.js');
  assert.match(main, /function handleTrayToggle\(_tray, clickPoint = null\) \{\s+if \(process\.platform === 'darwin'\) \{\s+ensureMeterPopover\(\)\.toggle\(clickPoint\);/);
  assert.match(main, /buildMenuTemplate: buildMeterMenuTemplate/);
  assert.match(main, /trayMode: process\.platform === 'darwin'/);
});

test('popover styles keep CSS blur as a fallback only and honour accessibility settings', () => {
  const css = read('src/electron/renderer/meter/popover.css');
  const blurRules = css.split('}').filter((rule) => rule.includes('backdrop-filter'));
  assert.equal(blurRules.length, 1);
  assert.match(blurRules[0], /body\.material-fallback \.popover/);
  assert.match(css, /body\.material-solid \.popover \{ background: var\(--solid-background\); \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.contrast-more/);
  assert.match(css, /font-variant-numeric: tabular-nums/);
  assert.match(css, /-apple-system/);
  assert.doesNotMatch(css.split('body.material-')[0], /html, body \{[^}]*background: (?!transparent)/);
});

test('popover markup is a labelled dialog and meters expose values only when they exist', () => {
  const html = read('src/electron/renderer/meter/popover.html');
  assert.match(html, /role="dialog" aria-labelledby="popoverTitle"/);
  assert.match(html, /Content-Security-Policy/);
  const js = read('src/electron/renderer/meter/popover.js');
  assert.match(js, /setAttribute\('role', 'meter'\)/);
  assert.equal((js.match(/aria-valuenow/g) || []).length, 1, 'only meter rows set aria-valuenow');
  assert.doesNotMatch(js, /innerHTML/);
});

test('the popover bridge exposes nothing beyond state and commands', () => {
  const preload = read('src/electron/meterPreload.js');
  const channels = [...preload.matchAll(/'(meter:[a-zA-Z]+)'/g)].map((match) => match[1]).sort();
  assert.deepEqual(channels, ['meter:command', 'meter:getState', 'meter:opened', 'meter:state', 'meter:state', 'meter:opened'].sort());
});
