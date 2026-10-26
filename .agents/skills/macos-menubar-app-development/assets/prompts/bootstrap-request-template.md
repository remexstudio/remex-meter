# Bootstrap request template

Use this when delegating a new macOS menu bar app scaffold task to another agent.

```text
Use the macos-menubar-app-development skill.

Goal: bootstrap a new Swift macOS menu bar app.

Inputs:
- App name: <APP_NAME>
- Bundle ID: <BUNDLE_ID>
- Minimum macOS: <15.0 or 13.0>
- Expected shell: <swiftui-menubarextra | hybrid-statusitem-popover>
- Needs: <login item, settings, popover, right-click, hotkey, sandbox, updater, etc.>

Required workflow:
1. Choose the shell explicitly.
2. Run scripts/new-menubar-app.sh with the selected template.
3. Run scripts/verify-menubar-app.py on the generated target.
4. Report generated paths and any remaining WARN/FAIL items.
```
