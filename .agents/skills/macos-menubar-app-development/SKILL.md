---
name: macos-menubar-app-development
description: Bootstrap, inspect, verify, and improve modern Swift macOS menu bar apps. Use when starting or auditing a menu bar utility that uses MenuBarExtra, NSStatusItem, popovers, custom NSWindow panels, LSUIElement, launch-at-login, settings windows, privacy/sandboxing, or menu bar visibility behavior on macOS 15, 26, and later.
compatibility: Codex CLI and Agent Skills-compatible tools on macOS. Scripts use bash and Python 3.11+. Starter blueprints target the Xcode 26 family and default to macOS 15+ deployment.
metadata:
  version: "1.1.0"
---

# Use this skill when

Use this skill for either job:

1. **Start a new macOS menu bar app** from a practical blueprint.
2. **Inspect and improve an existing macOS menu bar app** with architecture-aware checks.

Typical trigger phrases:

- “create a macOS menu bar app”
- “bootstrap a Swift menu bar utility”
- “audit this NSStatusItem app”
- “fix my MenuBarExtra settings behavior”
- “review this menubar app for macOS 26”
- “improve login item / sandbox / menu bar visibility behavior”

# Choose the shell first

Do not start coding until the shell choice is clear.

| Need | Start with | Why |
| --- | --- | --- |
| Simple status text, a few toggles, a short action menu | `MenuBarExtra` with `.menu` style | Fastest SwiftUI-native path and least boilerplate. |
| Rich anchored UI, short forms, larger content, or predictable close/open control | `NSStatusItem` + `NSPopover` | Better lifecycle and event control than pure `MenuBarExtra`. |
| Global hotkeys, explicit show/hide, left/right click split, or heavier system integration | AppKit-first or hybrid shell | AppKit still exposes the strongest control surface. |

Default recommendation:

- start with `assets/swiftui-menubarextra/` for simple utilities,
- start with `assets/hybrid-statusitem-popover/` for most non-trivial apps.

# Fast path: bootstrap a fresh project

## 1) Generate the starter

Run:

```bash
bash scripts/new-menubar-app.sh \
  --template hybrid-statusitem-popover \
  --target /path/to/NewApp \
  --app-name NewApp \
  --bundle-id com.example.NewApp
```

Supported templates:

- `swiftui-menubarextra`
- `hybrid-statusitem-popover`

## 2) Inspect the generated scaffold

Open the generated:

- `README.md`
- `project.yml`
- `Config/Info.plist`
- main app entry file in `App/`

The scaffold is intentionally opinionated:

- modern Swift state handling,
- settings and quit affordances,
- `SMAppService.mainApp` for launch-at-login,
- menu-bar-safe icon defaults,
- Dockless `LSUIElement` configuration.

## 3) Generate an Xcode project if possible

If `xcodegen` is installed, the scaffold script generates the `.xcodeproj` automatically.

If not, keep the generated source layout and either:

- run `xcodegen generate` later, or
- create a new macOS App project in Xcode and copy in `App/` and `Config/`.

## 4) Verify before feature work

Run:

```bash
python3 scripts/verify-menubar-app.py /path/to/NewApp
```

Fix any `FAIL` items before expanding the app.

# Fast path: inspect an existing project

## 1) Run the combined audit

Run:

```bash
bash scripts/audit-menubar-app.sh /path/to/repo --out /path/to/repo/menubar-audit
```

This writes:

- `inspection.md`
- `verification.md`
- `verification.json`

## 2) Or run individual tools

```bash
python3 scripts/inspect-menubar-app.py /path/to/repo
python3 scripts/verify-menubar-app.py /path/to/repo --write /path/to/repo/menubar-verification.md
```

## 3) Fix in this order

1. missing **menu bar entrypoint**,
2. missing **settings** path,
3. unusable custom Settings sizing, such as a giant fixed window from long SwiftUI intrinsic content,
4. missing **quit** path,
5. incorrect `LSBackgroundOnly` / weak `LSUIElement` contract,
6. poor **icon legibility** or non-template status icon usage,
7. outdated **launch-at-login** implementation,
8. fragile **presentation** or right-click behavior,
9. missing macOS 26 **menu bar visibility** support note,
10. shipping/security gaps: sandbox, hardened runtime, privacy manifest, Sparkle XPC, notarization.

# High-value rules

## Prefer `.menu` over `.window` for `MenuBarExtra`

Use `.menu` style unless the app is deliberately a compact panel and does not need strong programmatic presentation control.

## Treat `LSUIElement` as a UX contract

If the app hides its Dock icon:

- it needs a clear **Quit** path,
- it needs a reliable **Settings** path,
- it needs support copy for hidden/disabled menu-bar items on macOS 26+.

Do not use `LSBackgroundOnly` for GUI menu bar utilities.

## Use menu-bar-safe icons

Prefer:

- SF Symbols, or
- template images rendered as template images.

Test Light, Dark, Increase Contrast, Reduce Transparency, notched displays, multiple displays, and wallpaper contrast.

## Use the modern login item API

For macOS 13+, use `SMAppService.mainApp` unless you intentionally need a helper app or legacy back-deployment.

# References to load on demand

- `references/research-and-best-practices.md` — platform/toolchain guidance, Apple conventions, pitfalls, and shipping notes.
- `references/stats-case-study.md` — concrete reference architecture from a real menu bar app.
- `references/verification-and-improvement-playbook.md` — audit checklist and remediation sequencing.

# Scripts

| Script | Use |
| --- | --- |
| `scripts/install-skill.sh` | Install this skill into `~/.agents/skills`, a repo-local `.agents/skills`, `/etc/codex/skills`, or a custom root. |
| `scripts/new-menubar-app.sh` | Generate a fresh scaffold from the shipped starter blueprints. |
| `scripts/audit-menubar-app.sh` | Produce inspection and verification reports in one command. |
| `scripts/inspect-menubar-app.py` | Produce a structured architecture report for an existing repo. |
| `scripts/verify-menubar-app.py` | Produce a pass/warn/fail verification report for an existing repo. |
| `scripts/check-skill.sh` | Validate this skill repo’s structure and helper scripts. |

# Assets

| Asset directory | Use |
| --- | --- |
| `assets/swiftui-menubarextra/` | Simple menu-first utilities. |
| `assets/hybrid-statusitem-popover/` | Richer and more controllable status item apps. |
| `assets/support/` | User-facing support notes for menu-bar visibility and troubleshooting. |
| `assets/release/` | Optional release/security starting points. |
| `assets/prompts/` | Prompt snippets for repeatable agent workflows. |

# Escalation rule

If a repo starts as `MenuBarExtra` but needs any of the following, move it toward the hybrid template instead of forcing workarounds:

- global hotkey driven show/hide,
- reliable right-click vs left-click behavior,
- custom popover/window lifecycle control,
- robust settings window behavior,
- privileged helper / daemon / XPC integration,
- or complex, scrollable, focusable, async UI.
