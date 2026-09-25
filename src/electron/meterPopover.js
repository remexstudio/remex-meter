'use strict';

const path = require('node:path');

const POPOVER_WIDTH = 320;
const POPOVER_INITIAL_HEIGHT = 240;
const POPOVER_MIN_HEIGHT = 120;
const POPOVER_HTML = path.join(__dirname, 'renderer', 'meter', 'popover.html');
const NATIVE_MATERIAL = 'popover';

// Which background the popover paints. Native vibrancy on macOS, an opaque
// system background under Reduce Transparency, and the CSS blur only when no
// native material exists (a non-darwin development run).
function popoverMaterial({ platform = process.platform, reduceTransparency = false } = {}) {
  if (reduceTransparency) return 'none';
  return platform === 'darwin' ? 'native' : 'css';
}

function popoverWindowOptions({ platform = process.platform, preload, reduceTransparency = false } = {}) {
  const native = popoverMaterial({ platform, reduceTransparency }) === 'native';
  return {
    width: POPOVER_WIDTH,
    height: POPOVER_INITIAL_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: true,
    roundedCorners: true,
    alwaysOnTop: true,
    title: 'Remex Meter',
    // visualEffectState is construction-time only, so the window is always
    // built with it and the material itself is attached or detached with
    // setVibrancy() when Reduce Transparency changes.
    ...(platform === 'darwin' ? { visualEffectState: 'active' } : {}),
    ...(native ? { vibrancy: NATIVE_MATERIAL } : {}),
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  };
}

function popoverQuery({ platform = process.platform, reduceTransparency = false, highContrast = false } = {}) {
  return {
    material: popoverMaterial({ platform, reduceTransparency }),
    contrast: highContrast ? 'more' : 'standard'
  };
}

function clampPopoverHeight(height, workAreaHeight) {
  const requested = Math.ceil(Number(height) || 0);
  const max = Math.max(POPOVER_MIN_HEIGHT, Math.floor(Number(workAreaHeight) || 0) - 8);
  return Math.max(POPOVER_MIN_HEIGHT, Math.min(requested, max));
}

function createMeterPopover({
  BrowserWindow,
  nativeTheme,
  screen,
  preload,
  anchorBounds,
  platform = process.platform,
  htmlPath = POPOVER_HTML
}) {
  let win = null;
  let anchor = null;
  let contentHeight = POPOVER_INITIAL_HEIGHT;
  let suppressBlurUntil = 0;
  let loadedQueryKey = '';

  const accessibility = () => ({
    platform,
    reduceTransparency: Boolean(nativeTheme?.prefersReducedTransparency),
    highContrast: Boolean(nativeTheme?.shouldUseHighContrastColors)
  });

  function load() {
    const query = popoverQuery(accessibility());
    loadedQueryKey = JSON.stringify(query);
    return win.loadFile(htmlPath, { query });
  }

  function ensureWindow() {
    if (win && !win.isDestroyed()) return win;
    win = new BrowserWindow(popoverWindowOptions({ ...accessibility(), preload }));
    if (platform === 'darwin') win.setAlwaysOnTop(true, 'pop-up-menu');
    win.on('blur', () => {
      if (Date.now() < suppressBlurUntil) return;
      hide();
    });
    win.on('closed', () => { win = null; });
    load();
    return win;
  }

  function place() {
    if (!win || win.isDestroyed()) return;
    const work = screen.getDisplayNearestPoint(anchor?.point || screen.getCursorScreenPoint()).workArea;
    const height = clampPopoverHeight(contentHeight, work.height);
    win.setBounds(anchorBounds(POPOVER_WIDTH, height, anchor));
  }

  function show(nextAnchor = null) {
    anchor = nextAnchor;
    ensureWindow();
    place();
    // The click that opened the popover can still hold focus in the menu bar
    // and blur the window straight after show.
    suppressBlurUntil = Date.now() + 250;
    win.show();
    win.focus();
    try { win.webContents.send('window:visibility', true); } catch (_) {}
  }

  function hide() {
    if (!win || win.isDestroyed() || !win.isVisible()) return;
    win.hide();
    try { win.webContents.send('window:visibility', false); } catch (_) {}
  }

  function toggle(nextAnchor = null) {
    if (win && !win.isDestroyed() && win.isVisible()) hide();
    else show(nextAnchor);
  }

  function setContentHeight(height) {
    contentHeight = height;
    if (win && !win.isDestroyed() && win.isVisible()) place();
  }

  // Reduce Transparency and Increase Contrast arrive through nativeTheme
  // 'updated'. The material is swapped on the live window; the page reloads
  // with the new query so its background and separators follow.
  function syncAccessibility() {
    if (!win || win.isDestroyed()) return;
    const state = accessibility();
    if (platform === 'darwin') {
      win.setVibrancy(popoverMaterial(state) === 'native' ? NATIVE_MATERIAL : null);
    }
    if (JSON.stringify(popoverQuery(state)) !== loadedQueryKey) load();
  }

  function send(channel, payload) {
    if (!win || win.isDestroyed()) return;
    try { win.webContents.send(channel, payload); } catch (_) {}
  }

  function owns(webContents) {
    return Boolean(win && !win.isDestroyed() && webContents && win.webContents === webContents);
  }

  function destroy() {
    if (win && !win.isDestroyed()) win.destroy();
    win = null;
  }

  return {
    destroy,
    hide,
    isVisible: () => Boolean(win && !win.isDestroyed() && win.isVisible()),
    owns,
    send,
    setContentHeight,
    show,
    syncAccessibility,
    toggle
  };
}

module.exports = {
  NATIVE_MATERIAL,
  POPOVER_WIDTH,
  clampPopoverHeight,
  createMeterPopover,
  popoverMaterial,
  popoverQuery,
  popoverWindowOptions
};
