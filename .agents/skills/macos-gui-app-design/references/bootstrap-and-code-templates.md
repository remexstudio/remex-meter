# Bootstrap and code templates

Use this reference when creating a fresh app or adding Mac-native surfaces to an existing SwiftUI/AppKit project.

## Starter script

Create a lightweight SwiftUI starter package:

```bash
scripts/bootstrap-macos-gui-app.sh \
  --name "Ledger Desk" \
  --output ./LedgerDesk \
  --bundle-id com.example.ledgerdesk \
  --minimum-macos 15.0
```

Generated output includes:

```text
LedgerDesk/
├── Package.swift
├── README.md
├── Sources/LedgerDesk/
│   ├── LedgerDeskApp.swift
│   ├── AppCommands.swift
│   ├── AppModel.swift
│   ├── RootView.swift
│   ├── SettingsView.swift
│   └── AppIntents.swift
├── Tests/LedgerDeskTests/
│   └── LedgerDeskTests.swift
├── Docs/design-brief.md
├── Entitlements/LedgerDesk.entitlements
└── scripts/check.sh
```

The generated package is intentionally lightweight. For a production Xcode app target, open the package in Xcode or use the bundled `assets/xcodegen/project.yml` template with XcodeGen.

## SwiftUI app shell

```swift
import SwiftUI

@main
struct ProductApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .frame(minWidth: 760, minHeight: 520)
        }
        .commands {
            AppCommands()
            SidebarCommands()
            ToolbarCommands()
        }

        Settings {
            SettingsView()
                .environment(model)
        }
    }
}
```

Use this for SwiftUI-first apps. Keep the app model testable and keep platform-specific escape hatches small.

## Sidebar/content/inspector layout

```swift
import SwiftUI

struct RootView: View {
    @Environment(AppModel.self) private var model
    @State private var selection: AppSection? = .overview
    @State private var showsInspector = true
    @State private var searchText = ""

    var body: some View {
        NavigationSplitView {
            List(AppSection.allCases, selection: $selection) { section in
                Label(section.title, systemImage: section.symbolName)
                    .tag(section)
            }
            .navigationSplitViewColumnWidth(min: 180, ideal: 220, max: 300)
        } detail: {
            ContentPane(section: selection, searchText: searchText)
                .searchable(text: $searchText, prompt: "Search current workspace")
                .toolbar {
                    ToolbarItemGroup {
                        Button("Add", systemImage: "plus") { model.createItem() }
                        Button("Refresh", systemImage: "arrow.clockwise") { model.refresh() }
                    }
                    ToolbarSpacer(.fixed)
                    ToolbarItem {
                        Button("Toggle Inspector", systemImage: "sidebar.trailing") {
                            showsInspector.toggle()
                        }
                    }
                }
                .inspector(isPresented: $showsInspector) {
                    InspectorPane(selection: selection)
                        .inspectorColumnWidth(min: 240, ideal: 300, max: 420)
                }
        }
    }
}
```

Rules:

- Apply `.searchable` to the container whose content is searched.
- Keep toolbar actions grouped by meaning.
- Put inspector toggle in View menu or commands too.
- Keep min widths realistic for tiling.

## Commands

```swift
import SwiftUI

struct AppCommands: Commands {
    @FocusedValue(\.selectedObjectID) private var selectedObjectID

    var body: some Commands {
        CommandGroup(after: .newItem) {
            Button("New Workspace Item") {
                NotificationCenter.default.post(name: .createWorkspaceItem, object: nil)
            }
            .keyboardShortcut("n", modifiers: [.command, .shift])
        }

        CommandMenu("Navigate") {
            Button("Show Overview") {
                NotificationCenter.default.post(name: .showOverview, object: nil)
            }
            .keyboardShortcut("1", modifiers: [.command])
        }

        CommandMenu("Object") {
            Button("Reveal in Inspector") {
                NotificationCenter.default.post(name: .revealInInspector, object: selectedObjectID)
            }
            .disabled(selectedObjectID == nil)
            .keyboardShortcut("i", modifiers: [.command, .control])
        }
    }
}
```

Prefer direct dependency injection or focused values when possible. Use notifications only for simple starter templates or when routing across scene boundaries; in production, command routing should be explicit.

## Settings scene

```swift
import SwiftUI

struct SettingsView: View {
    @AppStorage("launchAtLogin") private var launchAtLogin = false
    @AppStorage("preferredDensity") private var preferredDensity = "standard"

    var body: some View {
        TabView {
            Form {
                Toggle("Launch at login", isOn: $launchAtLogin)
                Picker("Density", selection: $preferredDensity) {
                    Text("Comfortable").tag("comfortable")
                    Text("Standard").tag("standard")
                    Text("Compact").tag("compact")
                }
            }
            .formStyle(.grouped)
            .tabItem { Label("General", systemImage: "gear") }

            Form {
                Text("Show permission status and remediation here.")
                    .foregroundStyle(.secondary)
            }
            .formStyle(.grouped)
            .tabItem { Label("Privacy", systemImage: "hand.raised") }
        }
        .frame(width: 560, height: 380)
    }
}
```

Settings should expose permissions, login items, hotkeys, updates, accounts, and diagnostics in a real window, not inside a tiny status popover.

## Simple menu bar app

```swift
import SwiftUI

@main
struct MeterMenuApp: App {
    var body: some Scene {
        MenuBarExtra("Meter", systemImage: "gauge.with.dots.needle.67percent") {
            Button("Start") { startMonitoring() }
            Button("Stop") { stopMonitoring() }
            Divider()
            SettingsLink()
            Button("Quit Meter") { NSApplication.shared.terminate(nil) }
        }
        .menuBarExtraStyle(.menu)

        Settings {
            SettingsView()
        }
    }
}
```

Use SwiftUI `MenuBarExtra` for simple menu utilities. Escalate to AppKit for complex popovers, special activation policy, alternate click behavior, or exact status icon control.

## AppKit status item with SwiftUI popover

```swift
import AppKit
import SwiftUI

final class StatusController: NSObject {
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private let popover = NSPopover()

    override init() {
        super.init()
        statusItem.button?.image = NSImage(systemSymbolName: "bolt.horizontal", accessibilityDescription: "Utility")
        statusItem.button?.target = self
        statusItem.button?.action = #selector(togglePopover)

        popover.behavior = .transient
        popover.contentSize = NSSize(width: 360, height: 420)
        popover.contentViewController = NSHostingController(rootView: UtilityPopoverView())
    }

    @objc private func togglePopover() {
        guard let button = statusItem.button else { return }
        if popover.isShown {
            popover.performClose(nil)
        } else {
            popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
            popover.contentViewController?.view.window?.makeKey()
        }
    }
}
```

Keep status icons compact and template-style. Provide Settings and Quit. Do not make the status item the only recovery path for important controls.

## AppKit shell hosting SwiftUI

```swift
import AppKit
import SwiftUI

final class MainWindowController: NSWindowController {
    convenience init(model: AppModel) {
        let root = RootView().environment(model)
        let hosting = NSHostingController(rootView: root)
        let window = NSWindow(contentViewController: hosting)
        window.title = "Product"
        window.minSize = NSSize(width: 760, height: 520)
        window.toolbar = NSToolbar(identifier: "MainToolbar")
        window.tabbingMode = .preferred
        self.init(window: window)
    }
}
```

Use this when AppKit owns window lifecycle but SwiftUI owns content panes.

## SwiftUI wrapping AppKit view

```swift
import AppKit
import SwiftUI

struct LogTextView: NSViewRepresentable {
    var text: String

    func makeNSView(context: Context) -> NSScrollView {
        let textView = NSTextView()
        textView.isEditable = false
        textView.isSelectable = true
        textView.font = .monospacedSystemFont(ofSize: 12, weight: .regular)

        let scrollView = NSScrollView()
        scrollView.documentView = textView
        scrollView.hasVerticalScroller = true
        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        (scrollView.documentView as? NSTextView)?.string = text
    }
}
```

Use AppKit wrappers for complex text/table/outline controls where SwiftUI coverage or performance is insufficient.

## App Intents starter

```swift
import AppIntents

struct CreateWorkspaceItemIntent: AppIntent {
    static let title: LocalizedStringResource = "Create Workspace Item"
    static let description = IntentDescription("Creates a new item in the current workspace.")

    func perform() async throws -> some IntentResult {
        // Call app/domain service. Keep this side-effect explicit and testable.
        return .result()
    }
}

struct ProductShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: CreateWorkspaceItemIntent(),
            phrases: ["Create item in \\(.applicationName)"],
            shortTitle: "Create Item",
            systemImageName: "plus"
        )
    }
}
```

Add App Intents when actions are useful outside the app: Spotlight, Shortcuts, Siri, widgets, controls, or other system experiences. Do not expose destructive or permission-sensitive actions without clear confirmation semantics.

## Entitlements template

Use a minimal sandbox by default for Mac App Store candidates:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.app-sandbox</key>
  <true/>
  <key>com.apple.security.files.user-selected.read-write</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
</dict>
</plist>
```

Remove unused entitlements. Every entitlement should map to a user-visible feature.

## XcodeGen project seed

If XcodeGen is available, copy `assets/xcodegen/project.yml` and replace placeholders:

```bash
cp ~/.agents/skills/macos-gui-app-design/assets/xcodegen/project.yml ./project.yml
python3 - <<'PY'
from pathlib import Path
p = Path('project.yml')
s = p.read_text()
s = s.replace('__APP_NAME__', 'Ledger Desk')
s = s.replace('__MODULE_NAME__', 'LedgerDesk')
s = s.replace('__BUNDLE_ID__', 'com.example.ledgerdesk')
p.write_text(s)
PY
xcodegen generate
```

## Check script

Generated projects should include a simple check script:

```bash
#!/usr/bin/env bash
set -euo pipefail
swift test
swift build
```

For an Xcode project, prefer:

```bash
xcodebuild -scheme Product -destination 'platform=macOS' test
```

## First response template after bootstrapping

```markdown
Created a SwiftUI/AppKit-ready starter at `<path>`.

Key files:
- `Package.swift`
- `Sources/<Module>/<Module>App.swift`
- `Sources/<Module>/RootView.swift`
- `Sources/<Module>/AppCommands.swift`
- `Sources/<Module>/SettingsView.swift`
- `Entitlements/<Module>.entitlements`
- `Docs/design-brief.md`

Run:

```bash
cd <path>
scripts/check.sh
open Package.swift
```

Next implementation step: replace placeholder model/actions with the product domain model, then decide whether any AppKit boundary is needed for windowing, status item, or document behavior.
```
