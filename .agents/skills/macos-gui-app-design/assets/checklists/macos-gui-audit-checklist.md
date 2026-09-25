# macOS GUI audit checklist

Use this checklist for macOS 15, macOS Tahoe 26, and future-facing GUI app reviews.

## Stack and architecture

- [ ] Stack is explicit: SwiftUI, AppKit, hybrid, Catalyst, Electron, Tauri, Wails, Qt, Flutter, Compose, Avalonia, React Native macOS, or other.
- [ ] Native AppKit boundary is explicit for windows, responder chain, document model, panels, status items, or advanced table/text needs.
- [ ] Cross-platform UI has a Mac-specific shell for menus, shortcuts, windows, settings, dialogs, and accessibility.

## Navigation and layout

- [ ] Main app uses standard sidebar, split view, tab, document, or multi-window semantics.
- [ ] Sidebar contains navigation, not unrelated commands or settings.
- [ ] Toolbar actions are frequent, contextual, grouped, and backed by menu commands where appropriate.
- [ ] Search scope is clear: content search, local filter, command palette, or global action search.
- [ ] Inspector is contextual; global preferences live in Settings.
- [ ] Window min sizes work in halves, thirds, quadrants, full screen, and external displays.

## Menu, commands, and keyboard

- [ ] App commands are discoverable in the menu bar.
- [ ] Standard shortcuts are preserved: Command-N/O/S/W/Q, Command-F, Command-, as applicable.
- [ ] Toolbar/context-menu/palette actions have menu equivalents when they are app-level commands.
- [ ] Keyboard-only navigation covers main workflows.
- [ ] Command validation/responder-chain behavior is correct for selection-sensitive commands.

## Tahoe/Liquid Glass readiness

- [ ] Uses standard system surfaces before custom chrome.
- [ ] Removes fake translucency, redundant blur, custom titlebar hacks, and hard-coded toolbar/sidebar backgrounds unless justified.
- [ ] Toolbar icons are monochrome unless tint conveys meaning or primary action.
- [ ] Tested Light, Dark, tinted/clear appearances, high contrast, and reduced transparency.
- [ ] Content remains primary; floating controls do not steal visual focus.

## Menu bar utility behavior

- [ ] Dock icon policy is deliberate and recoverable.
- [ ] Menu/status item includes Settings and Quit.
- [ ] Popovers dismiss predictably, support Escape, and preserve keyboard focus.
- [ ] Global hotkeys have conflict handling and permission explanations.
- [ ] App remains recoverable if the status item is hidden or the menu bar is crowded.

## Accessibility and privacy

- [ ] Custom controls have names, roles, values, hints, and keyboard behavior.
- [ ] VoiceOver, Accessibility Inspector, Full Keyboard Access, contrast, reduced motion, and reduced transparency have been tested.
- [ ] Privacy permissions are requested only when needed and explained before system prompts.
- [ ] Degraded mode is documented when Accessibility/Input Monitoring/Screen Recording is unavailable.

## Distribution and security

- [ ] Release channel is explicit: Mac App Store, Developer ID outside store, both, or internal.
- [ ] Sandbox and entitlements are designed early.
- [ ] Hardened runtime and notarization are configured for outside-store distribution.
- [ ] Helper tools/login items use modern ServiceManagement APIs where applicable.
- [ ] CI runs build/test plus at least one signed/sandboxed packaging check before release.
