# Menu bar icon not visible on macOS 26+

On macOS 26 and later, menu bar apps can be running while their menu bar items are hidden by a system visibility control.

Ask the user to check:

1. Open **System Settings**.
2. Go to **Menu Bar**.
3. Find the app name.
4. Toggle the app **ON**.
5. Confirm at least one in-app menu bar module/widget is enabled, if the app has modular status items.
6. Quit and relaunch the app if the icon still does not appear.

Product guidance:

- Include this text in support docs and onboarding for Dockless `LSUIElement` apps.
- Do not treat “process is running but no icon appears” as only a crash/debugging case.
- Provide an alternate Settings/open-window path when practical, because the menu bar item may be hidden.
