# Framework decision matrix for modern macOS GUI apps

Use this reference when a user asks which stack to use, when an existing app uses a cross-platform runtime, or when the architecture is not obvious.

## Decision rule

Mac-first product quality is usually determined by the shell, not by the rendering technology alone. The shell includes menus, command routing, window behavior, document semantics, toolbars, search, settings, accessibility, signing, sandboxing, and native OS integration.

## Native options

| Stack | Use when | Strengths | Risks | Agent guidance |
|---|---|---|---|---|
| SwiftUI-first | Ordinary modern app: navigation, settings, forms, dashboards, list/detail, simple inspectors | Fast iteration, declarative state, standard scenes, easy previews, automatic adoption of new design surfaces | Can become awkward for precise responder-chain behavior, custom windowing, complex text/table/outline, and pro toolbars | Start here for simple/medium apps; add AppKit only at explicit seams |
| AppKit-first | Pro Mac app, document/editor, advanced table/text, custom panels, status items, exact menus/windows | Deepest Mac coverage, mature document/window/menu/text/table APIs | More imperative code, more lifecycle knowledge, slower UI iteration for standard forms | Use AppKit shell and host SwiftUI for forms, settings, side panes, and modern content |
| SwiftUI + AppKit hybrid | Most long-lived Mac-first apps | Best balance of modern UI and Mac completeness | Requires deliberate boundaries and clear ownership of state/commands | Default recommendation. Name each AppKit boundary and why it exists |
| Mac Catalyst | Existing iPad app that needs a Mac version | Reuse UIKit/iPad code, simpler path for mobile-first teams | Unadapted iPad UI feels wrong on Mac; density, menus, windows, shortcuts need explicit work | Use only when iPad lineage is real. Add Mac-specific menus, keyboard, sharing, printing, and multiple windows |
| .NET MAUI Mac Catalyst | Existing MAUI/.NET product where Mac is one target | C#/.NET reuse, Microsoft tooling | Catalyst constraints; not Mac-first by default | Recommend for .NET cross-platform products, not native Mac pro apps |

## Cross-platform options

| Stack | Use when | Strengths | Risks | Mac adaptation checklist |
|---|---|---|---|---|
| Electron | Existing web product, JS/TS team, complex web UI, need mature ecosystem | Stable Chromium target, mature packages, rich tooling | High baseline runtime overhead; web-rendered UI; MAS sandbox requires Electron MAS build | Native menus, shortcuts, dialogs, drag/drop, accessibility tree, sandbox/JIT entitlements, notarization, auto-update strategy |
| Tauri | Lean web UI with Rust backend, lower bundle/runtime overhead desired | System webview, Rust backend, smaller apps | Smaller ecosystem; platform webview differences; native polish still manual | Same as Electron plus WebView behavior testing on macOS 15/26 |
| Wails | Go-backed desktop utility/internal app with web frontend | Go backend, webview UI, lighter than Electron | Less proven for high-polish complex Mac apps; v3 maturity should be checked | Verify menus, tray/status item, signing, MAS viability, accessibility |
| Qt | C++/industrial/scientific/CAD-ish cross-platform software | Mature C++ framework, deployment tooling, efficient | Generic cross-platform UI can feel non-Mac | Native menu bar, standard shortcuts, document/window behavior, sandbox config, `.app` bundle/deployment checks |
| Flutter | Existing Flutter/Dart product or deliberately custom rendered UI | Shared UI code, official macOS target | Native fidelity takes effort; custom text/table/menu behavior | Use `PlatformMenuBar`, native file dialogs/channels, Mac density, keyboard navigation, accessibility |
| Compose Multiplatform | Kotlin-first app or shared Kotlin domain logic | Desktop APIs for windows/tray/menu/context menus | JVM/runtime and custom-rendered feel; native integration work | Native menu/window adaptation, signing/notarization, accessibility |
| Avalonia | .NET/XAML desktop parity | Mature desktop XAML pattern, native interop options | Not Cocoa controls; Mac polish depends on adaptation | Native handles where needed, Mac menu/window conventions, packaging/signing |
| React Native macOS | React Native org that wants AppKit-backed controls | AppKit substrate, React Native reuse | Niche ecosystem; component coverage determines quality | Verify component behavior, menus, keyboard, accessibility, distribution |
| Slint/Fyne/iced/egui | Small tools, embedded-adjacent apps, custom UI, Rust/Go/C++ teams | Lightweight and specialized | Weak conventional Mac UX unless heavily adapted | Use only when custom UI is acceptable; add native shell features explicitly |

## Architecture boundary templates

### SwiftUI-first with AppKit escape hatches

Use for normal utilities and productivity apps.

```text
App entry: SwiftUI App
Scenes: WindowGroup, Settings, optional MenuBarExtra
Navigation: NavigationSplitView / List / toolbar / searchable / inspector
Commands: SwiftUI Commands for standard actions
AppKit: NSStatusItem, NSPanel, NSSavePanel/NSOpenPanel, advanced key handling only when needed
```

### AppKit shell with SwiftUI content

Use for pro/document apps and advanced utilities.

```text
App entry: NSApplicationDelegate / NSWindowController / NSDocumentController
Windows: AppKit owns lifecycle, tabs, restoration, panels, responder chain
Menus: AppKit NSMenu + validation
Content: SwiftUI panes hosted by NSHostingController/NSHostingView
State: shared domain model injected into hosted views
```

### Menu bar utility

Use a menu-only design only for tiny command/status surfaces.

```text
Status item: SwiftUI MenuBarExtra or AppKit NSStatusItem
Transient UI: menu or NSPopover
Long UI: real Settings window or NSPanel
Commands: Settings, Help, Quit always reachable
Recovery: optional Dock mode or global hotkey if status item may be hidden
Permissions: request only when needed; show purpose and remediation
```

## Red flags requiring AppKit or native shell work

- Multiple independent documents/windows with save/restore semantics.
- Advanced `NSTableView`, `NSOutlineView`, rich text editing, or text input behavior.
- Precise menu validation, responder-chain participation, or command routing.
- Global hotkeys, special activation policies, accessory apps, custom panels.
- Complex status item/popover placement and focus behavior.
- Helper tools, login items, LaunchAgents/LaunchDaemons, privileged operations.

## Output format for stack recommendations

```markdown
## Recommendation

Use: <stack>

Why:
- <reason tied to product>
- <reason tied to Mac UX>
- <reason tied to release/distribution>

AppKit/native boundaries:
- <boundary 1>
- <boundary 2>

Risks to validate early:
- <risk>
- <risk>

First files/scripts:
- <file or command>
```
