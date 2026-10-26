# __APP_NAME__

A modern macOS GUI starter generated from the `macos-gui-app-design` skill.

## Open

```bash
open Package.swift
```

## Check

```bash
scripts/check.sh
```

## Architecture

- SwiftUI-first app shell.
- Sidebar/content/inspector main window.
- Commands and keyboard shortcuts.
- Settings scene.
- App Intents starter for Spotlight/Shortcuts integration.
- Entitlements template for sandbox-aware release planning.

For production distribution, create an Xcode app target or generate one from `project.yml` using XcodeGen, then configure signing, entitlements, sandbox, hardened runtime, and notarization based on the chosen release channel.
