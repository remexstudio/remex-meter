# __APP_NAME__ — SwiftUI MenuBarExtra Starter

This starter is the **simple, menu-first** baseline.

## Use this starter when

- the menu itself is the product,
- the UI fits comfortably in a small menu surface,
- the app does not need explicit programmatic show/hide,
- and right-click-specific interaction is not a requirement.

## What this starter includes

- SwiftUI `MenuBarExtra`
- `.menu` style by default
- `Settings` scene
- `SMAppService.mainApp` launch-at-login wrapper
- `LSUIElement = true` so the app behaves like a menu bar utility
- menu bar-safe default symbol usage

## Why `.menu` style

The `.menu` style is the least surprising default for a utility. Move away from it only when the app clearly needs a richer surface or stronger control over presentation.

## When to switch to the hybrid starter

Move to `hybrid-statusitem-popover` if you need any of these:

- global hotkey show/hide,
- left-click vs right-click differentiation,
- richer anchored UI than a simple menu,
- or a more reliable dedicated settings window.

## Project files

- `App/` — Swift sources
- `Config/Info.plist` — app bundle configuration
- `Config/App.entitlements` — start empty; add App Sandbox or other entitlements intentionally
- `project.yml` — optional XcodeGen project spec

## If xcodegen was not run automatically

Either:

1. install XcodeGen and run `xcodegen generate`, or
2. create a new Xcode macOS App target and copy in `App/` plus `Config/`.

## Initial review checklist

- confirm `LSUIElement` is what you want,
- confirm the status symbol name,
- verify Settings opens correctly on your target macOS versions,
- and run the verify script before adding feature code.

## Directory hint

Use a project directory name like `__PROJECT_DIR_HINT__` if you want a sanitized filesystem-safe variant of the app name.

## User support note

If the app is running but the icon seems missing on macOS 26, first check **System Settings → Menu Bar** and make sure the app is allowed to appear there.
