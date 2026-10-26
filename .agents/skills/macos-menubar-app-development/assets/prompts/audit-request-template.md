# Audit request template

Use this when delegating an existing macOS menu bar app review to another agent.

```text
Use the macos-menubar-app-development skill.

Goal: inspect and improve an existing Swift macOS menu bar app repo.

Repo path: <REPO_PATH>
Known constraints:
- Minimum macOS: <version or unknown>
- Distribution: <App Store | Developer ID | internal | unknown>
- Current shell: <MenuBarExtra | NSStatusItem | unknown>
- Specific concerns: <settings, quit path, menu icon missing, login item, sandbox, updater, privacy manifest, etc.>

Required workflow:
1. Run scripts/audit-menubar-app.sh <REPO_PATH> --out <REPO_PATH>/menubar-audit.
2. Read inspection.md and verification.md.
3. Prioritize FAIL items before WARN items.
4. For code changes, keep the status item / menu bar shell thin and move business logic into model/services.
5. Re-run verification after changes.
6. Report modified files and remaining risks.
```
