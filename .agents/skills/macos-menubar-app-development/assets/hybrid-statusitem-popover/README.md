# __APP_NAME__ — Hybrid Status Item + Popover Starter

This starter is the **default for non-trivial menu bar apps**.

It uses:

- AppKit for the menu bar shell,
- SwiftUI for the popup and settings content,
- a dedicated settings window controller,
- and `SMAppService.mainApp` for launch-at-login.

## Use this starter when

- you expect the app to grow,
- you want explicit status item control,
- you want a richer anchored panel than a simple menu,
- or you already know you need right-click vs left-click differentiation.

## Why this is the default serious shell

It is easier to scale from here into:

- custom settings windows,
- popovers or custom panels,
- advanced input handling,
- and stronger presentation control.

## Included patterns

- `NSStatusItem` with `autosaveName`
- explicit `sendAction(on:)` for left/right click handling
- SF Symbol status icon marked as a template image
- `NSPopover` for the main anchored surface
- AppKit-managed settings window hosting SwiftUI content

## Files

- `App/AppDelegate.swift` — app lifecycle
- `App/StatusItemController.swift` — menu bar integration
- `App/PopoverRootView.swift` — SwiftUI content for the anchored panel
- `App/SettingsWindowController.swift` — dedicated settings window shell
- `App/SettingsView.swift` — SwiftUI settings content
- `App/AppState.swift` — shared state
- `App/LaunchAtLoginManager.swift` — modern login item wrapper
- `project.yml` — optional XcodeGen project spec

## When to move beyond this starter

Only add a custom `NSWindow` popup when `NSPopover` is no longer sufficient. Start simple.

## Initial review checklist

- confirm the status symbol and tooltip,
- confirm left-click and right-click behavior,
- confirm the settings window becomes frontmost correctly,
- and run the verify script before feature work.

## User support note

If the app is running but the icon seems missing on macOS 26, first check **System Settings → Menu Bar** and make sure the app is allowed to appear there.
