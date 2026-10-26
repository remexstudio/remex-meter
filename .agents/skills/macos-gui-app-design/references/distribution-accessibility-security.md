# Distribution, accessibility, and security reference

Use this reference when a macOS GUI app involves App Sandbox, hardened runtime, notarization, Mac App Store review, Developer ID distribution, helper tools, login items, global hotkeys, privacy permissions, or accessibility review.

## Release strategy decisions

Decide release strategy early because it changes architecture.

| Strategy | Typical use | Engineering implications |
|---|---|---|
| Mac App Store | Consumer/productivity apps that fit sandbox rules | App Sandbox required; entitlements must be limited; helpers and automation require careful review; in-app purchase/update constraints apply |
| Developer ID outside store | Pro tools, developer utilities, apps needing broader system access | Sign with Developer ID, enable hardened runtime, notarize, staple where applicable, test Gatekeeper launch |
| Both | Broad consumer/pro apps | Design two distribution configurations; keep entitlements and helper behavior explicit |
| Internal distribution | Company/internal tools | Still sign and notarize when possible; document deployment profile and permissions |

## App Sandbox

The sandbox limits access to files, network connections, hardware, automation, and other resources. Use it as a design constraint, not a checkbox.

Checklist:

- Enable only entitlements required by user-visible features.
- Prefer user-selected file access over broad filesystem access.
- Store app data in containers or application support locations.
- Avoid temporary exception entitlements unless unavoidable and documented.
- For automation, use scripting targets or explain temporary exceptions.
- For web runtimes, validate JIT, file access, and network needs early.

Minimal entitlements should look like this only if the app actually needs user-selected files and network client access:

```xml
<key>com.apple.security.app-sandbox</key>
<true/>
<key>com.apple.security.files.user-selected.read-write</key>
<true/>
<key>com.apple.security.network.client</key>
<true/>
```

## Hardened runtime and notarization

For Developer ID distribution outside the Mac App Store:

1. Enable hardened runtime.
2. Archive/sign with Developer ID Application certificate.
3. Upload for notarization.
4. Staple notarization ticket where appropriate.
5. Test launch on a Gatekeeper-enabled Mac using a quarantined copy.

Agent guidance:

- Do not state an app is notarized unless notarization has actually completed.
- Do not add hardened runtime exceptions without explaining why.
- Electron/Tauri/webview stacks may need additional signing and runtime handling; verify per-framework docs.
- Test the final `.app`, `.dmg`, or `.pkg`, not just Debug builds.

## Helper tools and login items

Use helper processes only when the feature truly needs work outside normal UI lifecycle.

Examples:

- Sync engine.
- Local proxy/service.
- File/network monitor.
- Scheduled background work.
- Privileged helper for system-level operations.

Rules:

- Prefer `SMAppService` on macOS 13+ for LoginItems, LaunchAgents, and LaunchDaemons bundled with the app.
- Surface helper state in Settings or diagnostics.
- Provide enable/disable and uninstall paths.
- Avoid surprise launch-at-login behavior.
- For privileged helpers, design authorization and update lifecycle before implementation.

## Privacy permissions

Common permission-sensitive areas:

| Permission | Use cases | UX requirement |
|---|---|---|
| Accessibility | Window managers, automation, UI control, global shortcuts in some workflows | Explain exact control needed and provide remediation path |
| Input Monitoring | Keystroke-level hotkeys or keyboard event capture | Request only for explicit user-enabled feature |
| Screen Recording | Screenshot/recording, pixel inspection, screen sharing | Explain captured scope and storage/transmission behavior |
| Automation/Apple Events | Controlling other apps | Name target apps and reason |
| Full Disk Access | Backup, indexing, developer tools | Provide degraded mode and exact reason |
| Network Extensions | VPN/proxy/filtering | Strong disclosure, diagnostics, uninstall path |

Pattern:

```text
1. User enables feature.
2. App explains required permission and why.
3. App opens System Settings or shows exact steps.
4. App detects current status and offers retry.
5. App provides degraded/off state if possible.
```

## Accessibility audit

Accessibility review is not a final cosmetic pass. It validates core interaction correctness.

### Automated or tool-assisted checks

- Accessibility Inspector: inspect roles, labels, values, hierarchy, and hit testing.
- Xcode UI tests where possible for keyboard and major flows.
- Static checks for unlabeled custom buttons, image-only controls, and missing focus paths.

### Manual checks

1. VoiceOver can identify windows, sidebars, toolbar buttons, content, rows, inspector fields, and settings controls.
2. Full Keyboard Access can reach primary controls.
3. Tab/arrow/Return/Escape behavior matches Mac conventions.
4. Search field activation, clearing, and result navigation work by keyboard.
5. Text remains legible with high contrast and reduced transparency.
6. Custom controls expose role, label, value, enabled state, and actions.
7. Dynamic text/localization does not clip key controls.
8. Notifications are sparse and actionable.
9. Permission prompts are understandable without external documentation.

## SwiftUI accessibility patterns

```swift
Button {
    startCapture()
} label: {
    Image(systemName: "record.circle")
}
.accessibilityLabel("Start recording")
.accessibilityHint("Begins screen recording after permission is granted")
```

For custom rows:

```swift
HStack {
    Text(item.title)
    Spacer()
    Text(item.status)
        .foregroundStyle(.secondary)
}
.accessibilityElement(children: .combine)
.accessibilityLabel("\(item.title), \(item.status)")
```

For test hooks, use identifiers deliberately:

```swift
.searchable(text: $query)
.accessibilityIdentifier("workspace-search-field")
```

## AppKit accessibility patterns

```swift
button.setAccessibilityLabel("Start recording")
button.setAccessibilityHelp("Begins screen recording after permission is granted")
```

Custom AppKit views need role, label, value, and actions when they act like controls. Do not rely on drawing alone.

## Security and privacy review questions

Before release, answer:

- What data leaves the device?
- What data is stored locally and where?
- Which entitlements are enabled and why?
- Which helpers run outside the UI process?
- Which permissions are required, optional, or feature-gated?
- What happens when permission is denied?
- How does the user disable background work?
- How are updates signed and delivered?
- How is crash/log data redacted?

## Release checklist

```text
[ ] Build succeeds from clean checkout.
[ ] Tests pass or missing test coverage is disclosed.
[ ] App Sandbox entitlements audited.
[ ] Hardened runtime enabled for Developer ID distribution.
[ ] Notarization path tested for outside-store builds.
[ ] Mac App Store constraints checked if targeting MAS.
[ ] Helpers/login items use modern APIs and are user-visible.
[ ] Permission prompts are feature-gated and explained.
[ ] Accessibility Inspector pass completed.
[ ] VoiceOver pass completed.
[ ] Full Keyboard Access pass completed.
[ ] Reduced transparency/high contrast checked.
[ ] Tiled/full-screen/multi-display behavior checked.
[ ] Settings/Help/Quit/recovery paths checked.
```
