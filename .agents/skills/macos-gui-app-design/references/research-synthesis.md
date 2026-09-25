# Research synthesis: modern macOS GUI app design

Use this file when an agent needs the rationale behind the skill's defaults. The operational instructions remain in `SKILL.md`; this reference explains why those instructions are biased toward SwiftUI/AppKit hybrid architecture and standard Mac surfaces.

## Evaluation of the uploaded research

The uploaded research is strong enough to use as the base knowledge layer for this skill. It covers the current Apple-native landscape, cross-platform options, modern layout patterns, menu bar utility patterns, developer-tool patterns, distribution concerns, and open areas to monitor. Its most important conclusion is correct for a Mac-first skill: long-lived polished apps should default to SwiftUI plus AppKit rather than SwiftUI-only or a generic cross-platform runtime.

The research is especially useful in these areas:

- It separates **SwiftUI capability** from **AppKit completeness**. SwiftUI is the right default for many modern surfaces, but AppKit remains the practical substrate for exact windowing, responder-chain behavior, document workflows, status items, custom panels, advanced text/table/outline UI, and some menu behaviors.
- It treats **macOS Tahoe 26/Liquid Glass** as a design-system transition rather than a style overlay. That matters because agents should remove custom chrome and fake materials before adding new visual effects.
- It correctly identifies **stable Mac invariants**: menu bar, keyboard shortcuts, resizable windows, document/window semantics, settings, search, accessibility, drag/drop, and non-disruptive background behavior.
- It gives a useful framework comparison across SwiftUI, AppKit, Catalyst, Electron, Tauri, Wails, Qt, Flutter, Compose, Avalonia, React Native macOS, Slint, Fyne, iced, and egui.
- It captures menu bar utility failure modes: no Quit/Settings, oversized popovers, unclear permissions, global hotkey conflicts, and hidden/rearranged status items.

The main improvements this skill adds are operational:

- Ready-to-run bootstrap and inspection scripts instead of only design prose.
- Ready-to-copy starter assets for a SwiftUI-first Mac shell.
- A progressive-disclosure structure aligned with Agent Skills standards.
- Agent-facing audit templates, design briefs, and remediation plans.
- Explicit checks for commands, Settings, sidebars/split views, search, inspectors, accessibility, sandboxing, hardened runtime, App Intents, and menu bar utility paths.

## Current synthesis

### Default stack

For a Mac-first GUI app, use a **SwiftUI/AppKit hybrid** unless there is a clear reason not to. SwiftUI is the productive layer for app views, forms, settings, sidebars, inspectors, search, and standard layout. AppKit is the control layer for advanced Mac behavior.

Use this boundary as the default:

| Layer | Preferred implementation |
|---|---|
| Standard content views, forms, dashboards, settings | SwiftUI |
| Sidebar/list/detail workspace shells | SwiftUI `NavigationSplitView`, unless AppKit is already the app shell |
| Toolbars/search for normal apps | SwiftUI `.toolbar` and `.searchable` |
| Advanced toolbar/search behavior | AppKit `NSToolbar`, `NSToolbarItem`, `NSSearchToolbarItem` |
| Commands | SwiftUI `Commands` for normal cases; AppKit `NSMenu` and validation for exact responder-chain behavior |
| Inspectors | SwiftUI `.inspector` for standard trailing inspectors; AppKit pane/panel for complex pro workflows |
| Documents, advanced windows, panels, status items | AppKit |
| Complex table/outline/text editing | AppKit until SwiftUI meets the concrete workload |

### Cross-platform stacks

Cross-platform runtimes are product choices, not default Mac design choices.

| Stack | Use when | Mac adaptation required |
|---|---|---|
| Electron | Existing web app, JS/TS team, complex web rendering, mature ecosystem needs | Native menu, shortcuts, dialogs, window behavior, sandbox/MAS handling, accessibility |
| Tauri | Lean webview app with Rust/system-webview backend accepted | Native menus, signing/notarization, webview variance testing |
| Wails | Go-backed utility/internal tool with web UI acceptable | Menu/status behavior, signing, accessibility, distribution validation |
| Qt | C++/industrial/scientific/cross-platform product | Native menu conventions, document/window behavior, density, signing |
| Flutter/Compose/Avalonia | Existing framework/team investment dominates | Native menu/window/settings/accessibility adaptation |
| React Native macOS | React Native organization needs AppKit-backed macOS target | Component coverage, native command/window integration |
| Slint/Fyne/iced/egui | Small tools, custom UI, Rust/Go/C++ ecosystem constraints | Mac-specific shell and accessibility work |

### Tahoe/Liquid Glass posture

For macOS Tahoe 26 and future releases, agents should not start by designing custom glass. They should first ensure the app is built from standard surfaces. Standard sidebars, toolbars, tab bars, search fields, split views, inspectors, popovers, sheets, menus, and settings are more likely to inherit platform evolution correctly.

Practical rules:

1. Remove fake translucency and redundant opaque group backgrounds before adding visual effects.
2. Keep content primary; visual chrome should structure, not dominate.
3. Use monochrome toolbar icons by default.
4. Prefer system bars and split views over custom titlebar/sidebar hacks.
5. Test contrast, reduced transparency, high contrast, Light/Dark, tinted/clear appearances, full screen, external displays, and tiled windows.

### Main-window patterns

Use the app's information architecture to choose the shell:

- **Sidebar workspace** for projects, folders, accounts, feeds, collections, or databases.
- **Split view** for adjacent panes like source/list/detail, editor/preview, query/results, or object/inspector.
- **Trailing inspector** for contextual properties, metadata, formatting, and selection-specific controls.
- **Tabbed or multi-window document model** for independent files, documents, database connections, terminal sessions, or editor contexts.
- **Toolbar-centric shell** only when the toolbar contains frequent contextual commands; do not use it as a command dump.
- **Command palette** as an accelerator, not as a replacement for the menu bar.

### Menu bar utility patterns

Menu bar apps need stricter escape and recovery paths because status items are easy to hide, rearrange, or lose among other items.

Minimum requirements:

- Settings/Preferences entry.
- Quit entry or clearly documented no-quit background agent behavior.
- Keyboard-accessible popover/menu content.
- Sensible behavior across multiple displays and Spaces.
- Dock icon policy documented and recoverable.
- Permission explanations before Accessibility/Input Monitoring/Screen Recording prompts.
- Launch-at-login and helper state visible in Settings.

Use SwiftUI `MenuBarExtra` for simple status menus. Use AppKit `NSStatusItem`, `NSPopover`, `NSPanel`, and activation-policy code when exact focus, positioning, alternate clicks, multiple status items, or serious utility workflows matter.

### Distribution and release engineering

Do not treat release engineering as a final packaging step. Design these items early:

- Mac App Store vs Developer ID vs both.
- App Sandbox and entitlements.
- Hardened Runtime and notarization.
- Helper tools, launch items, LaunchAgents, and daemons.
- Automation, JIT, broad file access, accessibility, screen recording, input monitoring, network extensions, and other review-sensitive permissions.
- CI commands for build, test, signed packaging, notarization, and entitlement inspection.

### Accessibility baseline

Agents should assume a Mac GUI task is incomplete until it considers:

- VoiceOver names/roles/values/hints for custom controls.
- Full Keyboard Access and focus traversal.
- Standard menu commands and keyboard shortcuts.
- Search field accessibility.
- Popover/panel dismissal and focus restoration.
- Reduced transparency, high contrast, and reduced motion.
- Localization and text expansion.

## Watch points for future updates

- SwiftUI coverage for advanced tables/outlines, rich text, toolbar customization, menu validation, and window management.
- Liquid Glass API and HIG changes in macOS 26.x, macOS 27, and future releases.
- Spotlight/App Intents expansion as a system command surface.
- Menu bar extra behavior under transparent menu bar and customizable Control Center changes.
- App Store review behavior for helper tools, global permissions, web runtimes, automation, and JIT.
- Cross-platform signing/notarization regressions on new macOS releases.
