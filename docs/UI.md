# UI

Remex Meter is a native macOS menu-bar utility. Before changing any surface below, load the skills required by `AGENTS.md` (`apple-menubar-monitor`, `macos-design`; `apple-design` for audits). The skill holds implementation detail, the SF Symbols map and the PR checklist; this page defines the surfaces.

## Surfaces

### Menu bar extra — "Meter"

- Electron `Tray` with a template image, so it adapts to light, dark and tinted menu bars. Fallback glyph: SF Symbol `gauge.with.needle`, exported as a template PNG.
- Optional short title (for example the most constrained pool's percentage). The title shows only a value the provider returned; with no value it shows nothing rather than `0%`.
- Click opens the popover; right-click (or Control-click) opens a small menu: Refresh, Settings…, About Remex Meter, Quit.
- No Dock icon (`LSUIElement`).

### Popover

- One frameless window anchored under the status item (`popoverBounds()` in `src/electron/tray.js`), fixed width around 320–360 pt, height fits content up to the display's work area, then scrolls.
- Real vibrancy background; see Materials below.
- Structure, top to bottom:
  1. Header: "Remex Meter", last-updated time, refresh button.
  2. One module per enabled tool, in the configured order (default Cursor → Grok → Claude Code → Codex → OpenCode → DeepSeek).
  3. Footer: Settings… and Quit.
- A tool module contains its mark and name, today's tokens and cost (usage), then one row per limits window (quota), then a state line if anything is missing.
- Pool modules (`docs/POOLS.md`): Cursor Mode Pool, Cursor Other Modes, Grok Heavy Weekly, Grok Bolt Weekly — each its own meter row.
- Meter row: pool name, percentage used (tabular numerals), a thin horizontal meter, reset time ("Resets Mon 09:00" or relative). Money windows show an amount instead of a meter.
- States: "Unavailable", "Sign in required", "Not configured", "Stale" (with the age). Each has a symbol and text; none shows a bar.
- Hides on blur and on Escape.

### Settings

- A standard macOS settings window: toolbar tabs or a sidebar, grouped forms, native-looking controls.
- Sections: Tools (enable and order the six tools), Accounts (per-provider credentials; forms are the inherited catalog-driven account panels), General (refresh interval, launch at login), Appearance.
- Credentials never reach the renderer except through the existing allowlisted flows.

### Widget (optional)

- The WidgetKit extension in `native/macos/` reads the App Group snapshot; it never collects data. Restyling it to this visual system is a later phase (see issue labelled `P2`, Phases 3–5).

## Visual system

- **Type:** system font (`-apple-system`, `system-ui`); 13 pt body, 11 pt secondary, 15 pt semibold for the popover title; tabular numerals for all figures.
- **Colour:** system label colours for text; the system accent for interactive elements; brand colours only for tool marks. Meter fills use neutral / warning / critical tones that pass contrast on both appearances, and every threshold change also changes a symbol or text.
- **Spacing:** 12–16 pt insets, 8 pt between rows, hairline separators between tool modules.
- **Icons:** vendor marks from `assets/icons/` via `VENDOR_PRESENTATION`; SF Symbols for states and actions.
- **Not:** the inherited upstream card/glass look or the Remex marketing site. See `docs/PRODUCT.md` → Visual system.

## Materials

1. Native vibrancy on the popover and settings (`vibrancy` with `visualEffectState: 'active'`), transparent page background.
2. CSS `backdrop-filter` blur only where native vibrancy is unavailable; never both.
3. Reduce Transparency on → no material, no blur, solid system background.

## Accessibility

Required on every surface: Reduce Transparency, Increase Contrast, Reduce Motion, VoiceOver labels and values for every meter (unavailable meters expose their state, never a value of zero), full keyboard navigation with visible focus. Details and the checklist are in `.agents/skills/apple-menubar-monitor/SKILL.md`.

## Copy

- English only. Sentence case for labels, title case only for the product name and pool names.
- Name pools exactly as in `docs/POOLS.md`.
- Say what is missing and what to do ("Sign in to Cursor in Settings"), never a bare error code.
