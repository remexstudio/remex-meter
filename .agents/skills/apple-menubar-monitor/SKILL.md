---
name: apple-menubar-monitor
description: Remex Meter's menu-bar utility guidance. Use before any change to the menu bar extra ("Meter"), the tray popover, quota modules, native vibrancy, the optional Swift WidgetKit extension, app icons or SF Symbols, or accessibility of those surfaces. Covers the Electron + optional Swift hybrid, real vibrancy with a CSS blur fallback, the four pool modules (Cursor Mode Pool, Cursor Other Modes, Grok Heavy Weekly, Grok Bolt Weekly), the per-tool SF Symbols map, Reduce Transparency / Increase Contrast / Reduce Motion / VoiceOver, Electron-specific notes and the UI PR checklist.
---

# Apple menu-bar monitor (Remex Meter)

Remex Meter is a native-feeling macOS menu-bar utility for AI coding tool usage and plan limits. It is not a dashboard, not a card grid, and not a marketing surface. This skill is the house guide for its menu-bar, popover and widget surfaces. Load it together with `macos-menubar-app-development`, `macos-design` and `macos-gui-app-design` (and `apple-design` for audits); `AGENTS.md` lists the required set. Where those generic skills disagree with this one about Remex Meter, this one wins.

Read `docs/PRODUCT.md`, `docs/POOLS.md` and `docs/UI.md` before designing anything. Data contracts live in `docs/UPSTREAM.md` and `docs/PROVIDERS.md`; this skill never overrides them.

## 1. Architecture: Electron first, Swift optional

| Layer | Owner | Notes |
|---|---|---|
| Menu bar extra (status item) | Electron `Tray` (`src/electron/tray.js`) | Title text + template image. Label in the UI and docs is **Meter**. |
| Popover | Frameless Electron `BrowserWindow` anchored with `popoverBounds()` in `src/electron/tray.js` | One window, reused; never one window per module. |
| Settings | Electron window | Standard macOS settings layout (sidebar or tabs), not a web page. |
| Data | `src/shared/` collector, limits runtime and provider registry | Renderer receives catalog-driven, already-normalized records over IPC. |
| Widget (optional) | Swift WidgetKit extension in `native/macos/` fed by the App Group snapshot (`src/electron/macWidget/`) | Opt-in build (`pack:mac:widget`, `dist:mac:widget`). Never required to run the app. |

Rules:

- Do not add a second native status item from Swift. The Electron `Tray` owns the menu bar; the Swift side is WidgetKit only unless an issue explicitly changes that.
- Do not add a Swift helper, a new IPC channel family or a new data store to make a UI change. Adapt the existing snapshot, limits and catalog data.
- The popover renders whatever the catalogs and the limits records say. No provider-specific HTML branches: a module is selected by provider id and window identity, not by hand-written markup per tool.

## 2. Materials: real vibrancy first, CSS blur fallback

1. **Real vibrancy.** On macOS the popover and main window use `vibrancy` with `visualEffectState: 'active'` at construction (see `createWindow()` in `src/electron/main.js`). `visualEffectState` is construction-time only; Electron has no setter. Attach or detach the material with `win.setVibrancy()` through `src/electron/nativeMaterialVisibility.js`, never by rebuilding the window on every show.
2. The page background must be transparent (`backgroundColor: '#00000000'`, `transparent: true`, no opaque `body` fill) or the material is invisible.
3. **CSS fallback.** `backdrop-filter: blur(...)` only when native vibrancy is unavailable (non-darwin dev runs, or a surface Electron cannot back with a material). Never stack a CSS blur on top of a native material; it doubles the blur and flattens contrast.
4. **Reduce Transparency.** When the system setting is on, detach the material and paint a solid system-like background (`Window` / `windowBackgroundColor` equivalents for light and dark). Detect it in main (`systemPreferences.getUserDefault('reduceTransparency', 'boolean')` or the `AppleReduceTransparency`-backed accessibility state) and pass the flag to the renderer; do not guess from CSS alone.
5. Material choice: prefer `popover` or `menu` for the tray popover and `sidebar` / `under-window` for settings. The inherited code uses `hud`; changing it is a deliberate Phase 1 decision recorded in the PR, not a drive-by edit.

## 3. Popover modules

The popover is a vertical stack of compact modules in the default tool order from `docs/PRODUCT.md`. Each module is one row group: tool mark, tool name, one or more meters, reset time, and a status line. The four pool modules below are fixed contracts; `docs/POOLS.md` is authoritative.

| Module | Source window | Rule |
|---|---|---|
| **Cursor Mode Pool** | Cursor limits window currently labelled `Cursor Models` (usage-summary `plan.autoPercentUsed`) | Its own meter. |
| **Cursor Other Modes** | Cursor limits window currently labelled `Other Models` (usage-summary `plan.apiPercentUsed`) | Its own meter. Never merged with Mode Pool into one bar. |
| **Grok Heavy Weekly** | Grok limits window for the Heavy weekly allowance | Its own meter. |
| **Grok Bolt Weekly** | Grok limits window for the Bolt weekly allowance | Its own meter. Never summed with Heavy. |

- A meter shows `usedPercent` exactly as the limits record carries it. Never compute a percentage the provider did not return, never average or sum pools, never fill a missing value.
- **Unavailable is not zero.** A window that is absent, or a provider whose status is not `ok`, renders an explicit state ("Unavailable", "Sign in required", "Not configured") with no bar, not an empty bar and not `0%`.
- Until the upstream Grok provider exposes separate Heavy and Bolt windows (it currently emits one billing window derived from `creditUsagePercent`), both Grok modules render as unavailable. Do not relabel the single window as either pool, and do not confuse either pool with the `Grok Bot` window on a Cursor account.
- Money windows (`metric === 'credits'` or `'spend'`) go through `src/shared/limits/balanceDisplay.js`; they are amounts, not meters.
- Usage (tokens, cost from tokscale) and limits (provider quota) are separate lines. Never derive a quota from tokens or tokens from a quota.

Layout: fixed popover width (target 320–360 pt), rows 28–44 pt, 12–16 pt insets, SF Pro via `-apple-system` / `system-ui`, tabular numerals (`font-variant-numeric: tabular-nums`) for every number. Secondary text uses the system secondary label colour, not a brand tint.

## 4. SF Symbols map

SF Symbols has no vendor logos. Brand marks come from `assets/icons/<id>.svg` via `src/shared/vendorPresentation.js`; SF Symbols are the semantic fallback and the glyphs for native (Swift/WidgetKit) surfaces and state indicators. Verify every name in the SF Symbols app against the deployment target before shipping.

| Tool (catalog id) | Fallback symbol | Why |
|---|---|---|
| Cursor (`cursor`) | `cursorarrow.rays` | Pointer mark, reads as "Cursor" without a logo |
| Grok (`grok`) | `sparkle` | Single-spark generative mark |
| Claude Code (`claude`) | `asterisk` | Closest neutral shape to the Claude burst |
| Codex (`codex`) | `chevron.left.forwardslash.chevron.right` | Code |
| OpenCode (`opencode`) | `terminal` | Terminal-first agent |
| DeepSeek (`deepseek` limits, `dsh` client) | `water.waves` | Deep-sea mark |

| State | Symbol |
|---|---|
| Menu bar extra "Meter" (template image) | `gauge.with.needle` |
| Unavailable / error | `exclamationmark.triangle` |
| Sign in required | `person.crop.circle.badge.exclamationmark` |
| Stale reading | `clock.arrow.circlepath` |
| Refresh | `arrow.clockwise` |
| Settings | `gearshape` |

Electron cannot load SF Symbols by name (`nativeImage.createFromNamedImage` resolves `NSImage` names, not system symbols). For the tray, ship pre-rendered template PNGs (`@1x`/`@2x`, black on transparent, file name ending in `Template`) exported from SF Symbols. In the renderer, use the exported SVG. In Swift, use `Image(systemName:)`.

## 5. Accessibility

- **Reduce Transparency**: solid background, no native material, no CSS blur (section 2).
- **Increase Contrast**: `nativeTheme.shouldUseHighContrastColors` in main plus `@media (prefers-contrast: more)` in the renderer. Raise separators and meter tracks to full-opacity system colours, add a 1 px border to meters, and never communicate state by colour alone.
- **Reduce Motion**: respect `@media (prefers-reduced-motion: reduce)` and the app-level preference in `src/electron/motionPreference.js` (`system` / `on` / `off`). No meter fill animation, no popover slide; cross-fade at most.
- **VoiceOver**: each meter is `role="meter"` (or `progressbar`) with `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow` only when a value exists, and `aria-valuetext` such as "Cursor Mode Pool, 42 percent used, resets Monday". An unavailable module exposes its state text, never `aria-valuenow="0"`. The popover is a labelled dialog; focus moves into it on open and returns to the status item on close. All controls are reachable by keyboard, with visible focus rings.
- Minimum text 11 pt, hit targets 24 × 24 pt minimum in the popover.
- Colour: meter fill thresholds (for example neutral → warning → critical) must also change a secondary cue (icon or text), and must pass WCAG AA against both light and dark materials.

## 6. Electron notes

- Tray: set a template image (`nativeImage.setTemplateImage(true)`) so it follows the menu bar appearance; keep the title short. `LSUIElement` stays true (no Dock icon).
- Popover window: `frame: false`, `resizable: false`, `skipTaskbar`, `alwaysOnTop` at the `pop-up-menu` level only while shown; hide on blur; position with `popoverBounds()` so multi-display and notch layouts stay correct.
- Show the window only after `ready-to-show` to avoid a white flash through the material.
- The renderer is sandboxed, `contextIsolation: true`, `nodeIntegration: false`. Credentials never cross into it (see `AGENTS.md` tripwires). New UI data goes through the existing preload bridge.
- Read appearance and accessibility state in main (`nativeTheme`, `systemPreferences`) and push changes; listen for `nativeTheme` `updated` rather than polling.
- Do not add a UI framework, CSS toolkit or icon font for a menu-bar change without discussing it in the issue first.
- macOS on Apple Silicon is the only enabled platform. Do not add Windows or Linux branches to new UI code; leave inherited ones untouched until the phase that removes them.

## 7. UI PR checklist

Copy into the PR description and tick each item.

- [ ] Loaded `apple-menubar-monitor`, `macos-menubar-app-development`, `macos-design` and `macos-gui-app-design` (and `apple-design` for audits) before the change.
- [ ] Modules and order come from the catalogs; no provider-specific markup added.
- [ ] Pools stay separate: Cursor Mode Pool vs Cursor Other Modes, Grok Heavy Weekly vs Grok Bolt Weekly. No summed or synthesized bar.
- [ ] Unavailable, not-configured and unauthorized states render as text, never as `0%` or an empty bar.
- [ ] Usage and limits are shown as separate facts; no percentages invented from token counts.
- [ ] Native vibrancy is used where available; CSS blur only as a fallback, never stacked.
- [ ] Checked with Reduce Transparency, Increase Contrast and Reduce Motion on, in light and dark mode.
- [ ] VoiceOver reads each module name, value (or state) and reset time; keyboard navigation works.
- [ ] Tray image is a template image and legible in light, dark and tinted menu bars.
- [ ] All new strings, comments and docs are English; no inherited Chinese text changed unless the line had to change for behaviour.
- [ ] Screenshots of the popover in light and dark mode are attached; `npm run verify` passes.
