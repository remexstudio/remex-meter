# Verification and Improvement Playbook

Use this reference when auditing or improving an existing macOS menu bar app.

## 1) Run the tools first

From the skill root:

```bash
bash scripts/audit-menubar-app.sh /path/to/repo --out /path/to/repo/menubar-audit
```

Or run the tools separately:

```bash
python3 scripts/inspect-menubar-app.py /path/to/repo
python3 scripts/verify-menubar-app.py /path/to/repo --write /path/to/repo/menubar-verification.md
python3 scripts/verify-menubar-app.py /path/to/repo --format json --write /path/to/repo/menubar-verification.json
```

Read `inspection.md` before editing. It tells you whether the current shell is SwiftUI `MenuBarExtra`, AppKit `NSStatusItem`, hybrid, or unclear.

## 2) Interpret check status

| Status | Meaning | Action |
| --- | --- | --- |
| `FAIL` | Missing or incorrect for a menu bar app. | Fix before feature work. |
| `WARN` | Risk depends on product/distribution. | Decide, document, or remediate. |
| `PASS` | Static signal is acceptable. | Keep testing; static pass is not proof of runtime correctness. |

## 3) Fix order

Apply fixes in this order:

1. **Menu bar entrypoint** — add `MenuBarExtra` or `NSStatusItem` before other UI work.
2. **Settings path** — users need durable configuration.
3. **Settings window sizing** — custom Settings windows should be bounded, resizable, and robust to long paths/text.
4. **Quit path** — especially mandatory for Dockless `LSUIElement` apps.
5. **Agent app mode** — replace accidental `LSBackgroundOnly`; validate `LSUIElement` behavior.
6. **Icon legibility** — use SF Symbols/template assets; test contrast/accessibility.
7. **Launch at login** — use `SMAppService.mainApp` for modern targets.
8. **Presentation control** — move to AppKit if hotkeys/right-click/custom lifecycle are needed.
9. **macOS 26 visibility support** — add support copy for System Settings → Menu Bar.
10. **Security/release posture** — sandbox, hardened runtime, privacy manifest, Sparkle, notarization.
11. **Accessibility/performance** — add identifiers/labels, test focus, measure idle costs.

## 4) Shell-specific remediation

### If current shell is pure `MenuBarExtra`

Keep it only if:

- menu content is small,
- `.menu` style is sufficient,
- right-click behavior is not required,
- global hotkey show/hide is not required,
- Settings opens reliably from a Dockless launch.

Move toward `assets/hybrid-statusitem-popover/` if any of these are required:

- right-click vs left-click split,
- explicit show/hide/toggle,
- custom close behavior,
- scrollable or focusable panel UI,
- robust settings window activation,
- daemon/XPC/system-monitoring behavior.

### If current shell is `NSStatusItem`

Check:

- status item/controller is strongly retained,
- AppKit mutations are main-actor/main-thread,
- `autosaveName` is set when appropriate,
- icon is SF Symbol/template image,
- left/right click behavior is explicit when needed,
- business logic lives outside the status controller,
- settings and quit paths are present.

### If current shell uses custom `NSWindow`

Check:

- activation/focus behavior with `LSUIElement`,
- close-on-resign-key behavior if window acts as a popover,
- placement on notched/multiple displays,
- resizable Settings windows with `contentMinSize` and bounded/truncated long values,
- material/color behavior on macOS 26,
- accessibility labels/identifiers,
- keyboard navigation.

## 5) Release/security remediation

### App Sandbox

For App Store or hardened internal environments:

1. Add `com.apple.security.app-sandbox`.
2. Add only product-justified entitlements.
3. Test denied/revoked permissions.
4. Avoid broad temporary exceptions.
5. Split privileged/system work into helpers/XPC where appropriate.

The skill ships a minimal starting point:

```text
assets/release/sandboxed-app.entitlements
```

### Privacy manifest

If static inspection finds `UserDefaults` or `@AppStorage`, review required-reason API obligations. Add `PrivacyInfo.xcprivacy` when required, and verify category/reason codes against Apple's current docs.

Starting point:

```text
assets/release/PrivacyInfo.xcprivacy.userdefaults-example
```

Do not copy it blindly. Required-reason API categories can change.

### Sparkle

If the app uses Sparkle and is sandboxed:

- include Sparkle's installer XPC service,
- set `SUEnableInstallerLauncherService=YES`,
- verify signing and notarization of nested Sparkle components,
- test update from an installed, signed app, not only from Xcode.

### Developer ID notarization

For non-MAS distribution:

- enable hardened runtime,
- sign app and nested code,
- package the app,
- submit for notarization,
- staple the ticket,
- test on a clean macOS account/machine.

## 6) macOS 26 menu bar visibility remediation

Add user-facing text using:

```text
assets/support/menu-bar-visibility-note.md
```

Also consider:

- an onboarding note when the status item first fails to appear,
- a fallback settings/open-window URL or Dock toggle,
- diagnostics that report active modules/status item count separately from menu-bar visibility.

## 7) Accessibility remediation

For menu/panel UI:

- add `accessibilityLabel` to icon-only controls,
- add `accessibilityIdentifier` for UI tests,
- test VoiceOver reading order,
- test keyboard navigation,
- avoid custom `NSMenuItem.view` content for focus-heavy layouts,
- use windows/popovers for complex forms/lists.

## 8) Performance remediation

Menu bar apps are long-running agents. Audit:

- idle CPU,
- wakeups,
- memory after long idle,
- timer frequency,
- network polling,
- filesystem/sensor polling,
- menu open latency.

Prefer:

- event-driven updates,
- coalesced timers,
- refresh-on-open for expensive detail,
- background services/actors for heavy work,
- lightweight summary state on the main actor.

## 9) Before closing the task

Re-run:

```bash
bash scripts/audit-menubar-app.sh /path/to/repo --out /path/to/repo/menubar-audit
```

Report:

- detected shell,
- files changed,
- FAIL items fixed,
- WARN items left with rationale,
- whether Xcode build/test was run,
- any macOS-version-specific risk.
