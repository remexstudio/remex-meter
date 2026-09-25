# Modern macOS GUI App Design Skill

This repository contains one installable Agent Skill for designing, bootstrapping, auditing, and improving modern macOS GUI applications targeting macOS 15, macOS Tahoe 26, and future macOS releases.

## Skill

- `macos-gui-app-design/` — a Codex CLI / Agent Skills-compatible skill for Mac-first GUI app design and implementation decisions across SwiftUI, AppKit, SwiftUI/AppKit hybrid apps, Mac Catalyst, menu bar utilities, developer tools, and cross-platform desktop frameworks.

The skill uses progressive disclosure:

- `SKILL.md` contains the activation criteria, default strategy, and hands-on workflow.
- `references/` contains longer playbooks loaded only when the task calls for them.
- `assets/` contains copyable templates and starter files.
- `scripts/` contains deterministic helpers for bootstrapping, inspection, hook installation, and skill validation.

## Install

For personal use with Codex CLI:

```bash
mkdir -p ~/.codex/skills
cp -R macos-gui-app-design ~/.codex/skills/
```

For repository-scoped Codex use:

```bash
mkdir -p .codex/skills
cp -R macos-gui-app-design .codex/skills/
```

For other tools that follow the open Agent Skills convention:

```bash
mkdir -p ~/.agents/skills
cp -R macos-gui-app-design ~/.agents/skills/
```

Then start Codex from the target repository and invoke the skill explicitly:

```text
$macos-gui-app-design audit this Mac app and propose a Tahoe-ready improvement plan
```

or let Codex select it implicitly when a task mentions macOS GUI app design, SwiftUI, AppKit, menu bar apps, Liquid Glass, sidebars, toolbars, macOS windowing, accessibility, sandboxing, notarization, or Mac app project setup.

## Script examples

Bootstrap a lightweight SwiftUI/AppKit-ready starter package:

```bash
~/.codex/skills/macos-gui-app-design/scripts/bootstrap-macos-gui-app.sh \
  --name "Ledger Desk" \
  --output ./LedgerDesk \
  --bundle-id com.example.ledgerdesk \
  --minimum-macos 15.0
```

Inspect an existing app repository and emit a Markdown report:

```bash
~/.codex/skills/macos-gui-app-design/scripts/inspect-macos-gui-app.py \
  --path . \
  --output macos-gui-audit.md
```

Install a nonblocking design-audit pre-commit hook:

```bash
~/.codex/skills/macos-gui-app-design/scripts/install-design-audit-hook.sh --repo .
```

Validate the skill repository structure:

```bash
./macos-gui-app-design/scripts/validate-skill-repo.py ./macos-gui-app-design
```

## Notes

The uploaded seed archive was not visible in the execution filesystem, so this repository follows the explicit layout supplied in the task plus the current Codex and open Agent Skills specifications. The generated skill retains the requested conventions: executable helpers in `scripts/`, reusable templates in `assets/`, and concise main instructions with larger references loaded on demand.
