# Release assets

These files are starting points, not final compliance artifacts.

| File | Use |
| --- | --- |
| `sandboxed-app.entitlements` | Minimal App Sandbox entitlement plist for a sandboxed app target. Add only the capabilities the product actually needs. |
| `PrivacyInfo.xcprivacy.userdefaults-example` | Example privacy manifest for app-only UserDefaults usage. Verify required-reason categories and reason codes against Apple's current list before shipping. |

Release notes for agents:

- App Store builds generally need an explicit sandbox/privacy posture.
- Developer ID builds generally need hardened runtime, signing, notarization, and stapling.
- Sandboxed non-MAS apps using Sparkle need Sparkle's installer XPC service and `SUEnableInstallerLauncherService`.
