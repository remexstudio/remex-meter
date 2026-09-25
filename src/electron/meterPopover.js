'use strict';

// The Meter popover: one frameless window anchored under the status item and
// reused for every open (docs/UI.md, apple-menubar-monitor skill).
//
// Materials: the window is built with `vibrancy` + `visualEffectState: 'active'`
// (construction-time only; Electron has no setter for the state) and then the
// material is attached or detached with setVibrancy(). Under Reduce
// Transparency the material is detached and the renderer paints a solid
// system background; the CSS blur fallback is only used where there is no
// native material at all.

const path = require('node:path');
const { popoverBounds } = require('./tray');

const POPOVER_WIDTH = 340;
const POPOVER_MIN_HEIGHT = 120;
const POPOVER_MATERIAL = 'popover';
const BLUR_HIDE_GRACE_MS = 250;
const COMMANDS = new Set(['refresh', 'settings', 'about', 'quit', 'hide']);

function appearanceState({ nativeTheme, systemPreferences, reduceMotionPreference, motionPreference, platform }) {
  const reduceTransparency = Boolean(nativeTheme?.prefersReducedTransparency);
  const systemReducedMotion = systemPreferences?.getAnimationSettings?.().prefersReducedMotion === true;
  return {
    platform,
    nativeMaterial: platform === 'darwin' && !reduceTransparency,
    reduceTransparency,
    increaseContrast: Boolean(nativeTheme?.shouldUseHighContrastColors),
    reduceMotion: motionPreference.shouldReduceMotion(reduceMotionPreference, systemReducedMotion),
    dark: Boolean(nativeTheme?.shouldUseDarkColors)
  };
}

// Keyboard handling that belongs to the popover as a whole. Returns the command
// to run, or '' when the key is not ours.
function popoverKeyCommand(input = {}) {
  if (input.type !== 'keyDown') return '';
  const key = String(input.key || '');
  const command = input.meta || input.control;
  if (key === 'Escape' && !command && !input.alt && !input.shift) return 'hide';
  if (!command || input.alt) return '';
  if (key === ',') return 'settings';
  if (key.toLowerCase() === 'r' && !input.shift) return 'refresh';
  if (key.toLowerCase() === 'q' && !input.shift) return 'quit';
  if (key.toLowerCase() === 'w' && !input.shift) return 'hide';
  return '';
}

function createMeterPopover({
  electron = require('electron'),
  getTray,
  getState,
  onCommand,
  getReduceMotionPreference = () => 'system',
  motionPreference = require('./motionPreference'),
  platform = process.platform,
  isAllowedExternalUrl = () => false
}) {
  const { BrowserWindow, ipcMain, nativeTheme, screen, shell, systemPreferences } = electron;
  let win = null;
  let suppressBlurHide = false;
  let contentHeight = 0;
  let lastClickPoint = null;

  const appearance = () => appearanceState({
    nativeTheme,
    systemPreferences,
    reduceMotionPreference: getReduceMotionPreference(),
    motionPreference,
    platform
  });

  const isOwn = (event) => Boolean(win && !win.isDestroyed() && event?.sender === win.webContents);

  function syncMaterial() {
    if (!win || win.isDestroyed() || platform !== 'darwin') return;
    const { nativeMaterial } = appearance();
    win.setVibrancy?.(nativeMaterial && win.isVisible() ? POPOVER_MATERIAL : null);
  }

  function snapshot() {
    return { ...getState(), appearance: appearance() };
  }

  function push() {
    if (!win || win.isDestroyed()) return;
    try { win.webContents.send('meter:state', snapshot()); } catch (_) {}
  }

  function place() {
    if (!win || win.isDestroyed()) return;
    const tray = getTray();
    const display = screen.getDisplayNearestPoint(lastClickPoint || screen.getCursorScreenPoint());
    const maxHeight = Math.max(POPOVER_MIN_HEIGHT, display.workArea.height - 16);
    const height = Math.min(maxHeight, Math.max(POPOVER_MIN_HEIGHT, Math.ceil(contentHeight || POPOVER_MIN_HEIGHT)));
    win.setBounds(popoverBounds(tray, POPOVER_WIDTH, height, { screen, clickPoint: lastClickPoint, platform }));
  }

  function ensureWindow() {
    if (win && !win.isDestroyed()) return win;
    win = new BrowserWindow({
      width: POPOVER_WIDTH,
      height: POPOVER_MIN_HEIGHT,
      show: false,
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      transparent: true,
      hasShadow: true,
      backgroundColor: '#00000000',
      title: 'Meter',
      ...(platform === 'darwin' ? { vibrancy: POPOVER_MATERIAL, visualEffectState: 'active', roundedCorners: true } : {}),
      webPreferences: {
        preload: path.join(__dirname, 'meterPreload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        enablePreferredSizeMode: true
      }
    });
    win.setAlwaysOnTop(true, 'pop-up-menu');
    win.webContents.on('preferred-size-changed', (_event, size) => {
      contentHeight = Number(size?.height) || contentHeight;
      if (win.isVisible()) place();
    });
    win.webContents.on('before-input-event', (event, input) => {
      const command = popoverKeyCommand(input);
      if (!command) return;
      event.preventDefault();
      runCommand(command);
    });
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (isAllowedExternalUrl(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (event) => event.preventDefault());
    win.on('blur', () => { if (!suppressBlurHide) hide(); });
    win.on('show', syncMaterial);
    win.on('hide', syncMaterial);
    win.on('closed', () => { win = null; });
    win.loadFile(path.join(__dirname, 'renderer', 'meter', 'popover.html'));
    return win;
  }

  function show(clickPoint = null) {
    const target = ensureWindow();
    lastClickPoint = clickPoint;
    place();
    push();
    suppressBlurHide = true;
    const reveal = () => {
      target.show();
      target.focus();
      target.webContents.send('meter:opened');
      setTimeout(() => { suppressBlurHide = false; }, BLUR_HIDE_GRACE_MS);
    };
    if (target.webContents.isLoading()) target.once('ready-to-show', reveal);
    else reveal();
  }

  function hide() {
    if (win && !win.isDestroyed() && win.isVisible()) win.hide();
  }

  function toggle(clickPoint = null) {
    if (win && !win.isDestroyed() && win.isVisible()) hide();
    else show(clickPoint);
  }

  function runCommand(command) {
    if (!COMMANDS.has(command)) return;
    if (command === 'hide') { hide(); return; }
    if (command !== 'refresh') hide();
    onCommand(command);
  }

  const onGetState = (event) => (isOwn(event) ? snapshot() : null);
  const onCommandMessage = (event, command) => { if (isOwn(event)) runCommand(String(command || '')); };
  ipcMain.handle('meter:getState', onGetState);
  ipcMain.on('meter:command', onCommandMessage);

  const onThemeUpdated = () => { syncMaterial(); push(); };
  nativeTheme?.on?.('updated', onThemeUpdated);

  return {
    hide,
    isVisible: () => Boolean(win && !win.isDestroyed() && win.isVisible()),
    owns: (other) => Boolean(win && other === win),
    push,
    show,
    toggle,
    window: () => win,
    destroy() {
      ipcMain.removeHandler('meter:getState');
      ipcMain.removeListener('meter:command', onCommandMessage);
      nativeTheme?.removeListener?.('updated', onThemeUpdated);
      if (win && !win.isDestroyed()) win.destroy();
      win = null;
    }
  };
}

module.exports = {
  COMMANDS,
  POPOVER_MATERIAL,
  POPOVER_WIDTH,
  appearanceState,
  createMeterPopover,
  popoverKeyCommand
};
