# Inspecting and improving existing macOS GUI apps

Use this reference for audits, modernization plans, and code review of existing app repositories.

## First command

Run the deterministic scanner:

```bash
scripts/inspect-macos-gui-app.py --path . --output macos-gui-audit.md
```

Then inspect the report before editing. The scanner is heuristic; it identifies likely risks and missing surfaces but does not replace manual review.

## Manual classification

Classify the project from files and imports.

| Evidence | Likely stack |
|---|---|
| `import SwiftUI`, `@main struct ...: App`, `WindowGroup`, `NavigationSplitView` | SwiftUI |
| `import AppKit`, `NSApplicationDelegate`, `NSWindowController`, `NSDocument`, `.xib`, `.storyboard` | AppKit |
| Both SwiftUI and AppKit plus `NSHostingController`/`NSViewRepresentable` | SwiftUI/AppKit hybrid |
| iOS target with `SUPPORTS_MACCATALYST = YES`, `UIKit` | Mac Catalyst |
| `package.json`, `electron`, `BrowserWindow` | Electron |
| `src-tauri/`, `tauri.conf.json`, Rust backend | Tauri |
| `wails.json` | Wails |
| `.pro`, `CMakeLists.txt` with Qt packages, `QApplication` | Qt |
| `pubspec.yaml`, `macos/Runner` | Flutter |
| `compose.desktop`, Gradle Kotlin Compose plugins | Compose Multiplatform |
| `.csproj` with Avalonia packages | Avalonia |
| `react-native-macos` dependency | React Native macOS |

## Audit sequence

### 1. Build and run path

Find the canonical developer workflow:

```bash
find . -maxdepth 3 -type f \( -name Package.swift -o -name '*.xcodeproj' -o -name '*.xcworkspace' -o -name project.yml -o -name package.json -o -name pubspec.yaml -o -name CMakeLists.txt -o -name '*.csproj' \)
```

Report the actual build/test command. Do not invent success.

### 2. Window model

Inspect:

- `WindowGroup`, `DocumentGroup`, `NSDocument`, `NSWindowController`, `NSPanel`.
- Minimum size values in SwiftUI `.frame(minWidth:minHeight:)` or AppKit `minSize`.
- Window restoration identifiers and scene state.
- Tab/window commands.

Questions:

- Is this a single workspace, multi-window app, document app, menu bar utility, or background agent?
- Can it tile into halves/thirds/quadrants?
- Does closing a window preserve or destroy user work correctly?

### 3. Navigation and information architecture

Inspect:

- SwiftUI `NavigationSplitView`, `NavigationStack`, `List(selection:)`, `TabView`.
- AppKit `NSSplitViewController`, `NSOutlineView`, `NSTableView`.
- Sidebars mixing navigation with commands/settings.

Questions:

- Are durable objects in a sidebar/source list?
- Are filters/search separate from navigation?
- Does content adapt as sidebars/inspectors collapse?

### 4. Command model

Inspect:

- SwiftUI `Commands`, `CommandMenu`, `CommandGroup`, `keyboardShortcut`.
- AppKit `NSMenu`, `validateMenuItem`, responder-chain actions.
- Toolbar actions not backed by menus.
- Command palette implementations.

Questions:

- Are important commands discoverable from the menu bar?
- Are shortcuts standard and nonconflicting?
- Does disabled/enabled command state follow selection?
- Are destructive actions confirmed or undoable?

### 5. Toolbar, search, and inspector

Inspect:

- `.toolbar`, `NSToolbar`, `ToolbarItemGroup`, `ToolbarSpacer`.
- `.searchable`, `NSSearchToolbarItem`, `NSSearchField`.
- `.inspector`, `InspectorCommands`, `NSPanel`, split inspector panes.

Questions:

- Are toolbar groups semantically related?
- Is search scope obvious?
- Does the inspector show contextual properties rather than global settings?
- Does the View menu contain toggles for sidebar/toolbar/inspector where applicable?

### 6. Tahoe/Liquid Glass readiness

Search for visual customizations:

```bash
rg -n 'Color\.(white|black|gray)|NSColor\.(white|black|gray)|background\(|NSVisualEffectView|visualEffect|titlebarAppearsTransparent|fullSizeContentView|toolbarStyle|material|glassEffect|presentationBackground|cornerRadius|shadow\(' .
```

Review, do not blindly remove. Flag:

- Fake materials behind system bars.
- Custom titlebar/sidebar/toolbar layers.
- Backgrounds behind sheets and popovers that now should be system material.
- Tint used only for decoration.
- Fixed corners that fight system concentricity.

### 7. Menu bar utility behavior

Inspect:

- `MenuBarExtra`, `NSStatusBar`, `NSStatusItem`, `NSPopover`, `NSApplication.ActivationPolicy`.
- Dock icon policy (`LSUIElement`, activation policy).
- Settings and Quit path.
- Global hotkeys and permission prompts.

Questions:

- Is status item UI compact and recoverable?
- Does the app work if the status item is hidden/rearranged?
- Does a long workflow open a real window?
- Are permissions explained at the moment of need?

### 8. Accessibility

Inspect:

- SwiftUI `.accessibilityLabel`, `.accessibilityHint`, `.accessibilityValue`, `.accessibilityIdentifier`.
- AppKit `setAccessibilityLabel`, `accessibilityRole`, custom view accessibility.
- Keyboard navigation and focus modifiers.
- Custom controls with no semantic role.

Manual tests:

- VoiceOver reads navigation, toolbar, content, and inspector correctly.
- Full Keyboard Access can reach primary controls.
- Search field can be activated and cleared by keyboard.
- Reduced transparency/high contrast keep text legible.
- Dynamic text/localization does not clip in key panes.

### 9. Distribution and security

Inspect:

- Entitlements files.
- `com.apple.security.app-sandbox`.
- Hardened runtime settings in Xcode project.
- `SMAppService`, LaunchAgents/LaunchDaemons, helper tools.
- Automation, Accessibility, Input Monitoring, Screen Recording usage.
- Electron/Tauri webview/JIT/sandbox needs.

Questions:

- Is Mac App Store distribution plausible?
- Is outside-store Developer ID signing/notarization planned?
- Are helper processes self-contained and transparent?
- Does each entitlement map to a feature?

## Prioritization rubric

| Priority | Use for | Examples |
|---|---|---|
| P0 release blocker | App fails basic Mac behavior, privacy, security, or distribution | No Quit/Settings in menu bar app; no notarization plan; inaccessible custom controls; window cannot resize |
| P1 major UX issue | App works but feels non-native or fragile | Toolbar actions not in menus; fixed width layout; ambiguous search; custom sidebar background fighting Tahoe |
| P2 modernization | Improves polish and future compatibility | Add App Intents, improve inspector toggle, update toolbar grouping, refine settings organization |
| P3 nice-to-have | Cosmetic or opportunistic | Icon refinements, small copy changes, optional command palette |

## Common remediation patches

### Add Settings scene

```swift
Settings {
    SettingsView()
}
```

### Add command parity for toolbar action

```swift
.commands {
    CommandMenu("Workspace") {
        Button("Refresh") { refresh() }
            .keyboardShortcut("r", modifiers: [.command])
    }
}
```

### Replace custom fake sidebar background

Before:

```swift
List(items) { item in ... }
    .background(Color.white.opacity(0.8))
```

After:

```swift
List(items) { item in ... }
```

Let the system supply sidebar materials. Keep custom content backgrounds inside content panes only when required for readability or branding.

### Add inspector toggle

```swift
@State private var showsInspector = true

ContentView()
    .inspector(isPresented: $showsInspector) {
        InspectorPane()
    }
    .toolbar {
        Button("Inspector", systemImage: "sidebar.trailing") {
            showsInspector.toggle()
        }
    }
```

Also expose the toggle from the View menu or `InspectorCommands` where applicable.

### Add menu bar app Quit path

```swift
Button("Quit App") {
    NSApplication.shared.terminate(nil)
}
.keyboardShortcut("q")
```

### Add a check script

```bash
mkdir -p scripts
cat > scripts/check.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail
if [ -f Package.swift ]; then
  swift test
  swift build
elif ls *.xcodeproj >/dev/null 2>&1; then
  scheme=${SCHEME:-$(basename "$(ls -d *.xcodeproj | head -1)" .xcodeproj)}
  xcodebuild -scheme "$scheme" -destination 'platform=macOS' test
else
  echo "No recognized Swift/Xcode build file found" >&2
  exit 1
fi
SH
chmod +x scripts/check.sh
```

## Audit output template

```markdown
# macOS GUI audit

## Summary

Stack: <detected stack>
App shape: <workspace/document/menu bar/developer tool/etc.>
Release target: <MAS/outside-store/unknown>
Overall risk: <low/medium/high>

## Findings

| Priority | Area | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| P1 | Windowing | Minimum width blocks tiling | `.frame(minWidth: 1200)` | Reduce min width and collapse inspector |

## Recommended patch order

1. <P0/P1 patch>
2. <P1 patch>
3. <P2 modernization>

## Commands run

```bash
<commands>
```

## Manual checks still required

- Accessibility Inspector
- VoiceOver
- Reduced transparency/high contrast
- Full-screen/tiled windows
- Signing/notarization or MAS sandbox validation
```
