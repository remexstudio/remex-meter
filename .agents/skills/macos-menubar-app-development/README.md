# macOS Menu Bar App Development Skill Repo

A reusable agent skill for **modern Swift macOS menu bar app development**.

It is optimized for two workflows:

1. **Bootstrap** a fresh menu bar utility from a practical starter blueprint.
2. **Inspect, verify, and improve** an existing menu bar app with architecture-aware checks.

The repository follows the Codex CLI skill layout and the open Agent Skills format:

```text
README.md
AGENTS.md
macos-menubar-app-development/
├── SKILL.md
├── scripts/
├── references/
└── assets/
```

## What is included

| Path | Purpose |
| --- | --- |
| `macos-menubar-app-development/SKILL.md` | Main skill entrypoint: activation guidance, shell choice, and workflows. |
| `macos-menubar-app-development/references/research-and-best-practices.md` | Current research on macOS 15 / 26 menu bar app conventions, toolchains, pitfalls, and shipping constraints. |
| `macos-menubar-app-development/references/stats-case-study.md` | Case study of `exelban/stats`, grounded in the canonical repo. |
| `macos-menubar-app-development/references/verification-and-improvement-playbook.md` | Audit and remediation workflow for existing repos. |
| `macos-menubar-app-development/scripts/new-menubar-app.sh` | Generates a fresh scaffold from a starter blueprint. |
| `macos-menubar-app-development/scripts/audit-menubar-app.sh` | Runs inspection and verification together and writes a compact audit bundle. |
| `macos-menubar-app-development/scripts/inspect-menubar-app.py` | Produces a structured architecture report for an existing repo. |
| `macos-menubar-app-development/scripts/verify-menubar-app.py` | Produces a pass/warn/fail verification report with actionable fixes. |
| `macos-menubar-app-development/scripts/install-skill.sh` | Installs the skill into user, repo, admin, or custom skill roots. |
| `macos-menubar-app-development/scripts/check-skill.sh` | Validates this skill repo’s structure and helper scripts. |
| `macos-menubar-app-development/assets/swiftui-menubarextra/` | SwiftUI-first starter for simple menu-first utilities. |
| `macos-menubar-app-development/assets/hybrid-statusitem-popover/` | AppKit-shell + SwiftUI-content starter for richer or more controllable apps. |
| `macos-menubar-app-development/assets/support/` | Ready-to-copy support notes for menu-bar visibility and troubleshooting. |
| `macos-menubar-app-development/assets/release/` | Ready-to-copy release/security scaffolds such as sandbox entitlements and a privacy-manifest example. |
| `macos-menubar-app-development/assets/prompts/` | Prompt snippets for repeatable bootstrap and audit requests. |

## Install

### Codex, user-scoped

```bash
bash macos-menubar-app-development/scripts/install-skill.sh --scope user
```

Installs to:

```text
~/.agents/skills/macos-menubar-app-development
```

### Codex, repo-scoped

```bash
bash macos-menubar-app-development/scripts/install-skill.sh --scope repo --repo /path/to/target-repo
```

Installs to:

```text
/path/to/target-repo/.agents/skills/macos-menubar-app-development
```

### Admin or custom scope

```bash
bash macos-menubar-app-development/scripts/install-skill.sh --scope admin --force
bash macos-menubar-app-development/scripts/install-skill.sh --scope custom --dest /path/to/skills-root
```

`--scope admin` writes to `/etc/codex/skills` and usually requires elevated permissions.

## Quick use

### Bootstrap a new project

```bash
bash macos-menubar-app-development/scripts/new-menubar-app.sh \
  --template hybrid-statusitem-popover \
  --target ~/Work/SystemPulse \
  --app-name SystemPulse \
  --bundle-id com.example.SystemPulse
```

### Inspect an existing repo

```bash
python3 macos-menubar-app-development/scripts/inspect-menubar-app.py /path/to/repo
```

### Verify an existing repo and write a report

```bash
python3 macos-menubar-app-development/scripts/verify-menubar-app.py \
  /path/to/repo \
  --write /path/to/repo/menubar-verification.md
```

### Run the combined audit workflow

```bash
bash macos-menubar-app-development/scripts/audit-menubar-app.sh \
  /path/to/repo \
  --out /path/to/repo/menubar-audit
```

### Validate this skill repo

```bash
bash macos-menubar-app-development/scripts/check-skill.sh
```

## Architecture stance baked into the skill

The skill does **not** force a single framework choice.

| Situation | Recommended shell |
| --- | --- |
| Simple status + a few toggles/actions | SwiftUI `MenuBarExtra` with `.menu` style |
| Richer anchored UI, popover-sized content, or better presentation control | `NSStatusItem` + `NSPopover` or custom `NSWindow` |
| Global hotkeys, left/right click split, strong show/hide control, advanced settings/window behavior | AppKit-first or hybrid shell |

That recommendation reflects current Apple APIs, practical `MenuBarExtra` limitations, macOS Tahoe 26 visual/visibility behavior, and lessons from established AppKit-heavy menu bar apps such as Stats.

## Notes

- Starter blueprints default to **macOS 15+**. Use `--min-macos 13.0` when a public app needs broader modern coverage and still relies on `MenuBarExtra`/`SMAppService`.
- References separate **facts**, **heuristics**, and **workarounds** so agents can load detail only when needed.
- The Stats case study is a pattern study, not a literal template to copy wholesale.
