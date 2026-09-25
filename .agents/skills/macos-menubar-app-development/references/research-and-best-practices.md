# Research and Best Practices for Modern macOS Menu Bar Apps

_Last updated for this skill on 2026-04-23._

This reference consolidates:

- the user-provided survey on modern macOS Swift menu bar GUI app development,
- official Apple platform/API guidance,
- current Codex / Agent Skills packaging guidance,
- and observed patterns from established menu bar apps.

Use this file for the **why** behind the shorter instructions in `SKILL.md`.

## 1) Current platform baseline

### Practical toolchain stance

For a new modern Swift menu bar app in April 2026, treat the production baseline as:

| Area | Practical stance |
| --- | --- |
| Stable toolchain | Xcode 26 family, with Xcode 26.4.1 and Swift 6.3 current in Apple's public system-requirements table. |
| Minimum OS for controlled fleets | macOS 15+ or macOS 26+ when the fleet is fully controlled. |
| Minimum OS for public modern apps | macOS 13+ when `MenuBarExtra` and `SMAppService` are required. |
| Older compatibility | Use AppKit `NSStatusItem` if supporting macOS versions before `MenuBarExtra`. |
| Default skill scaffolds | macOS 15+, because the goal is modern agent-efficient app work, not legacy preservation. |

The minimum deployment target is a product decision, not a fashion choice. Lower it only when distribution or fleet data justifies the extra compatibility surface.

### macOS Tahoe 26 changed the environment

macOS 26 introduced the Liquid Glass system design and more translucent/adaptive system chrome. Engineering consequences for menu bar apps:

- avoid fixed-color status assets,
- use SF Symbols or template images,
- test with Light, Dark, Increase Contrast, Reduce Transparency, multiple wallpapers, and multiple displays,
- avoid assuming the menu bar background is opaque,
- prefer system colors/materials for custom popovers/windows.

macOS 26 also introduced a user-visible menu-bar visibility control. A menu bar app can be running and still have no visible item until the user enables it under **System Settings → Menu Bar**. Treat this as a support/onboarding requirement.

## 2) Framework decision matrix

| Need | Prefer | Rationale | Watch-outs |
| --- | --- | --- | --- |
| Short command menu, toggles, status summary | SwiftUI `MenuBarExtra` + `.menu` | Smallest SwiftUI-native shell. | Limited event/presentation control. |
| Compact richer panel | `MenuBarExtra` + `.window` only for simple cases | SwiftUI-native and concise. | System-owned lifecycle; awkward for hotkeys/show-hide/right-click. |
| Reliable right-click/left-click split | `NSStatusItem` | AppKit exposes `statusItem.button`, `sendAction(on:)`, `NSMenu`, and custom event handling. | More lifecycle code; retain the status item/controller strongly. |
| Rich anchored content | `NSStatusItem` + `NSPopover` or custom `NSWindow` | Predictable control and SwiftUI can still own content via hosting controllers/views. | You own activation, close behavior, and screen placement. |
| Dockless agent app | `LSUIElement=YES` | Hides Dock/app-switcher presence while still allowing UI. | Must provide explicit Quit, Settings, Help/diagnostics, and visibility support. |
| Background-only process | `LSBackgroundOnly=YES` | Faceless background-only process. | Wrong for GUI menu bar apps. |
| Launch at login | `SMAppService.mainApp` for macOS 13+ | Modern login item API for main app login registration. | Handle status/error states and expose a user-visible toggle. |
| Non-MAS updater | Sparkle 2 | Established secure updater for Developer ID apps. | Sandboxed apps need Sparkle installer XPC service and `SUEnableInstallerLauncherService`. |

**Default rule:** start with `MenuBarExtra` only when the menu is the product. Start hybrid when requirements include rich UI, explicit presentation, right-click, global hotkeys, custom windows, daemon/XPC integration, or serious settings behavior.

## 3) Canonical surface model

A mature menu bar app normally has several surfaces:

| Surface | Role | Typical content |
| --- | --- | --- |
| Status item | Ambient entry point | Template/SF Symbol icon, short text, simple state. |
| Menu | Fast commands | Status, primary action, toggles, Settings, Help/diagnostics, Quit. |
| Popover/window | Compact interactive UI | Search, graphs, lists, connection detail, drill-down. |
| Settings | Durable configuration | Launch at login, accounts, permissions, update channel, diagnostics. |
| Full utility window | Complex workflows | Logs, inspectors, onboarding, large lists, debugging. |

Do not force a complex product into an `NSMenu`. If the surface scrolls, has keyboard focus, performs async loading, contains forms, or requires accessibility nuance, use a popover/window.

## 4) Recommended architectures

### SwiftUI-first baseline

Use for small menu-first utilities:

```swift
import SwiftUI

@main
struct UtilityApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        MenuBarExtra("Utility", systemImage: model.symbolName) {
            MenuContent(model: model)
        }
        .menuBarExtraStyle(.menu)

        Settings {
            SettingsView(model: model)
        }
    }
}
```

Rules:

- Keep menu content immediate and lightweight.
- Expose Settings and Quit.
- Test settings activation from a Dockless launch.
- Avoid `.window` unless system-owned presentation is acceptable.
- Do not put business logic in views.

### AppKit/hybrid baseline

Use for most non-trivial utilities:

```swift
@MainActor
final class StatusItemController: NSObject {
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private let popover = NSPopover()

    override init() {
        super.init()
        statusItem.autosaveName = "com.example.utility.statusitem"
        statusItem.button?.image = NSImage(
            systemSymbolName: "bolt.circle",
            accessibilityDescription: "Utility"
        )
        statusItem.button?.image?.isTemplate = true
        statusItem.button?.target = self
        statusItem.button?.action = #selector(handleClick(_:))
        statusItem.button?.sendAction(on: [.leftMouseUp, .rightMouseUp])
    }

    @objc private func handleClick(_ sender: NSStatusBarButton) {
        if NSApp.currentEvent?.type == .rightMouseUp {
            showContextMenu()
        } else {
            togglePopover(relativeTo: sender)
        }
    }
}
```

Rules:

- Retain the controller/status item for app lifetime.
- Mutate AppKit UI on the main actor.
- Host SwiftUI with `NSHostingController`/`NSHostingView`.
- Keep domain state outside the status item.
- Use services/actors for polling, networking, IPC, sensors, and filesystem work.

## 5) State, concurrency, and performance

Recommended structure:

```text
App
├── AppModel / Store                  @MainActor observable state
├── StatusItemController              AppKit bridge if needed
├── Menu / Panel / Settings views      presentation only
├── Services
│   ├── LoginItemService               SMAppService wrapper
│   ├── PermissionService              TCC/privacy flows
│   ├── UpdateService                  Sparkle or MAS no-op
│   ├── DiagnosticsService
│   └── Domain services                network, daemon IPC, sensors, etc.
└── Persistence
    ├── UserDefaults / AppStorage      preferences
    ├── Keychain                       secrets/tokens
    └── App Group container            only if justified
```

Rules:

- Keep the status item as a view/controller over app state, not the owner of app state.
- Prefer event-driven updates over unconditional polling.
- Coalesce timers and UI refreshes.
- Keep menu opening fast; stale-but-immediate is often better than blocking on refresh.
- Avoid daemon IPC, network calls, disk scans, and sensor sampling on the main actor.
- Measure idle CPU, wakeups, and memory after long idle periods.

## 6) Settings, lifecycle, and support obligations

A Dockless menu bar app must answer these questions explicitly:

| Question | Good answer |
| --- | --- |
| How does the user quit? | Quit command in the menu/panel/settings. |
| How does the user configure it? | Settings scene or dedicated settings window. |
| How does launch-at-login work? | User-visible toggle backed by `SMAppService.mainApp`. |
| What if the menu bar item is hidden? | Support/onboarding note and alternate entry point when practical. |
| Where are secrets stored? | Keychain, not UserDefaults. |
| How are diagnostics exported? | Explicit user action with redaction. |

## 7) Privacy, sandboxing, and distribution

Treat release constraints as architecture constraints:

- **App Sandbox:** decide early. Keep entitlements minimal and product-justified.
- **Privacy manifests:** if the app or bundled SDKs use required-reason APIs, maintain `PrivacyInfo.xcprivacy` and verify reason codes against Apple's current list.
- **Protected resources:** camera, microphone, screen recording, automation, local network, Bluetooth, and similar capabilities need just-in-time permission flows and Info.plist descriptions where applicable.
- **Developer ID:** use hardened runtime, sign all nested code, notarize, and staple where relevant.
- **Sparkle:** for sandboxed apps, include the installer XPC service and set `SUEnableInstallerLauncherService=YES`.
- **Privileged helpers:** isolate, sign, entitle, register, diagnose, and uninstall them deliberately.

## 8) Testing matrix

| Area | Tests |
| --- | --- |
| Lifecycle | fresh launch, login launch, relaunch after crash, quit from menu, reopen settings, hide/show menu item. |
| UI | Light/Dark, Increase Contrast, Reduce Transparency, wallpapers, notch, multiple displays, menu-bar overflow managers. |
| Permissions | first-run denied, allowed, revoked while running, MDM-managed state. |
| Distribution | sandboxed build, Developer ID signed/notarized build, MAS-style entitlement build if relevant. |
| Accessibility | VoiceOver labels, keyboard navigation, focus, accessibility identifiers for UI tests. |
| Performance | idle CPU/wakeups, menu open latency, memory after long idle, timer coalescing. |

## 9) Common pitfalls and fixes

| Pitfall | Failure mode | Better approach |
| --- | --- | --- |
| Treating `MenuBarExtra` as a full `NSStatusItem` replacement | Later requirements need right-click, hotkey, or explicit show/hide. | Start hybrid when those requirements are plausible. |
| Hiding the Dock without Quit/Settings | User cannot exit or configure the app. | Add Quit, Settings, diagnostics/help. |
| Using `LSBackgroundOnly` for GUI utilities | App is faceless or behaves incorrectly. | Use `LSUIElement` for Dockless GUI agents. |
| Assuming the icon is always visible | User/system can hide menu bar items. | Add visibility support copy and alternate entry points. |
| Non-template status icons | Poor contrast in Liquid Glass / high contrast contexts. | Use SF Symbols or template images. |
| Complex custom `NSMenuItem.view` content | Fragile keyboard/focus/accessibility. | Use popover/window. |
| Startup permission prompts | Low trust and brittle onboarding. | Request just in time with rationale. |
| Sparkle treated as drop-in in sandboxed app | Updates fail. | Add Sparkle installer XPC and Info.plist key. |

## 10) Source map

- Apple Xcode system requirements: https://developer.apple.com/xcode/system-requirements/
- Swift 6.3 release notes: https://www.swift.org/blog/swift-6.3-released/
- Apple Liquid Glass / macOS Tahoe 26 design overview: https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/
- SwiftUI `MenuBarExtra`: https://developer.apple.com/documentation/swiftui/menubarextra
- SwiftUI `Settings`: https://developer.apple.com/documentation/swiftui/settings
- AppKit `NSStatusItem`: https://developer.apple.com/documentation/appkit/nsstatusitem
- ServiceManagement `SMAppService`: https://developer.apple.com/documentation/servicemanagement/smappservice
- `LSUIElement`: https://developer.apple.com/documentation/bundleresources/information-property-list/lsuielement
- Human Interface Guidelines, menu bar: https://developer.apple.com/design/human-interface-guidelines/the-menu-bar
- SF Symbols: https://developer.apple.com/sf-symbols/
- App Sandbox: https://developer.apple.com/documentation/security/app-sandbox
- Required-reason APIs / privacy manifests: https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api
- Notarization: https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
- Sparkle sandboxing: https://sparkle-project.org/documentation/sandboxing/
- Codex skills: https://developers.openai.com/codex/skills
- Agent Skills specification: https://agentskills.io/specification
