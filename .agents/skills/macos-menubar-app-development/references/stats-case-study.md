# Stats.app Case Study

_Last updated for this skill on 2026-04-23._

Subject:

- Canonical repo: `exelban/stats`
- Product: a lightweight macOS system monitor in the menu bar covering CPU, GPU, RAM, disk, network, battery, sensors, Bluetooth, clock, and more.

Use this as a **pattern study** for mature menu bar engineering. Do not copy its structure wholesale into simple apps.

## 1) High-level classification

Stats is an **AppKit-heavy menu bar app** rather than a SwiftUI `MenuBarExtra` app.

Observed signals from the uploaded archive:

| Signal | Observation |
| --- | --- |
| `MenuBarExtra` | Not used. |
| `NSApplicationDelegate` | `Stats/AppDelegate.swift` owns app startup/lifecycle. |
| `NSStatusItem` | Used for individual module widgets and combined widgets. |
| `NSPopover` | Present, but not the main shell pattern. |
| Custom `NSWindow` | Used for popup/settings/support/update/setup surfaces. |
| `LSUIElement` | Enabled in the app Info.plist for Dockless agent behavior. |
| Launch at login | Uses `SMAppService.mainApp` on macOS 13+ with legacy migration logic. |
| Privileged helper | Includes SMC/privileged-helper signals for sensor/system integration. |
| Version in archive | Xcode project shows marketing version `2.12.11`. |
| Main deployment target in archive | Main app target shows `MACOSX_DEPLOYMENT_TARGET = 11.5`; some related targets differ. |

## 2) App lifecycle and module model

`Stats/AppDelegate.swift` is the app's central lifecycle object. It:

- initializes module controllers,
- opens setup/settings/update/support windows,
- handles update checks,
- registers global event handling,
- mounts and terminates modules,
- stops background services on termination.

The app is modular. The module list includes CPU, GPU, RAM, Disk, Sensors, Network, Battery, Bluetooth, and Clock. This modular model explains why Stats uses multiple status items and a custom combined-view model instead of a single small menu.

### Lesson for agents

Use a modular architecture only when the product genuinely has multiple independent status domains. For a small utility, keep one `AppModel` and one status controller.

## 3) Status item architecture

Stats uses AppKit status items directly.

Key observed files:

- `Kit/module/widget.swift`
- `Stats/Views/CombinedView.swift`
- `Kit/helpers.swift`

Patterns worth copying:

| Pattern | Why it matters |
| --- | --- |
| Strongly owned status item/controller objects | Prevents menu items from disappearing due to deallocation. |
| `NSStatusBar.system.statusItem` | Gives exact AppKit menu bar integration. |
| `autosaveName` | Lets macOS preserve status item order/preferences. |
| Custom status button subviews | Allows graph/text-rich widgets that `MenuBarExtra` cannot express. |
| `sendAction(on:)` with left/right mouse events | Enables left-click popup and right-click context behavior. |
| Separate combined widget handling | Supports multiple modules in one status item. |

Patterns to avoid copying unless needed:

- Many custom status subviews.
- Notification-heavy coordination.
- Multiple status items for a simple product.
- Complex layout code in the menu bar itself.

## 4) Popup and window architecture

Stats does not treat an `NSMenu` as the entire product. It uses richer custom surfaces.

Observed patterns:

- `Kit/module/popup.swift` defines a custom `PopupWindow` and view controller flow.
- Popups use `NSVisualEffectView` and custom placement/sizing logic.
- Settings live in dedicated AppKit windows in `Stats/Views/Settings.swift` and related files.
- Support/update/setup surfaces are separate windows.

### Lesson for agents

For a mature app, put complex UI in windows or popovers. Keep the menu bar item a launcher/status affordance.

## 5) Settings and Dockless UX

Stats uses `LSUIElement`, so it must provide non-Dock controls. Observed behavior includes:

- a dedicated Settings window,
- a Quit path via settings/menu flows,
- a setting to show/hide the Dock icon using activation-policy changes,
- import/export/reset settings flows,
- update/support/setup windows.

### Lesson for agents

Dockless apps need a deliberate lifecycle UX:

- Settings must reliably frontmost.
- Quit must be explicit.
- Users need help when the menu bar icon is hidden.
- Diagnostics/support surfaces matter more than in ordinary Dock apps.

## 6) Launch-at-login handling

Stats' helper logic in `Kit/helpers.swift` shows a robust migration pattern:

- use `SMAppService.mainApp` on macOS 13+,
- preserve legacy `SMLoginItemSetEnabled` logic where needed,
- migrate older helper-app login items away from legacy registration.

### Lesson for agents

For new macOS 13+ apps, start with `SMAppService.mainApp`. Keep legacy helper-app launch items only when old deployment targets require them.

## 7) macOS 26 visibility issue

The canonical Stats README now documents a macOS 26 visibility issue: if Stats is running and modules/widgets are enabled but icons do not appear, users should open **System Settings → Menu Bar** and toggle Stats on.

### Lesson for agents

This is now a standard support case for menu bar utilities. Add a support note and make the app resilient when the status item is not visible.

The skill includes:

```text
assets/support/menu-bar-visibility-note.md
```

## 8) Security and release posture observations

Stats is a system monitor, so it has a broader security surface than simple menu bar apps.

Signals from the uploaded archive:

- privileged helper / SMC code,
- Bluetooth usage description,
- App Transport Security broad-load signal in Info.plist,
- launch-at-login management,
- update and support windows,
- multiple system data domains.

### Lesson for agents

Do not normalize broad entitlements or helper code for simple apps. For each capability, ask:

1. Is it product-critical?
2. Can it be isolated into a helper/XPC service?
3. Does it need a usage description or TCC flow?
4. Does it change App Store vs Developer ID viability?
5. Does it need diagnostics and uninstall handling?

## 9) What to emulate

| Stats pattern | Generalized recommendation |
| --- | --- |
| AppKit owns the menu bar shell | Use AppKit when presentation/event control is central. |
| Swift/AppKit custom windows for complex UI | Move rich workflows out of `NSMenu`. |
| `autosaveName` on status items | Add for stable AppKit status item identity/order. |
| Explicit settings/support/update surfaces | Give Dockless apps durable non-menu affordances. |
| `SMAppService.mainApp` migration | Use modern login item API for macOS 13+. |
| macOS 26 visibility support copy | Document System Settings → Menu Bar visibility recovery. |

## 10) What not to emulate by default

| Stats pattern | Why not default |
| --- | --- |
| Many status items/modules | Overkill for most apps. |
| Custom status-button subviews | Powerful but layout/accessibility-heavy. |
| Privileged helper / SMC integration | Adds signing, authorization, XPC, and review complexity. |
| Broad App Transport Security exception | Should be narrowed or avoided in new apps. |
| Large notification-driven internal graph | Can become hard for agents to reason about. |

## 11) Audit expectation for Stats-like apps

A verification report for a Stats-like app should normally show:

- PASS: menu bar entrypoint,
- PASS: settings path,
- PASS: quit path,
- PASS/WARN: icon legibility depending on template/SF Symbol evidence,
- PASS: modern login item API if `SMAppService.mainApp` is present,
- WARN: privileged helper isolation because system monitoring needs careful review,
- WARN: sandbox/release posture if App Sandbox is not explicit,
- WARN: ATS arbitrary loads if enabled,
- PASS: macOS 26 menu-bar visibility docs if support copy exists.

## 12) Source map

- Canonical repo: https://github.com/exelban/stats
- Product site: https://mac-stats.com
- Stats macOS 26 visibility FAQ in README: see canonical repo FAQ section “Stats icons do not appear in the menu bar”.
