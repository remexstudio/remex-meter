# macOS GUI design playbook: macOS 15, Tahoe 26, and future releases

Use this reference when designing or reviewing the actual user experience of a Mac app.

## Non-negotiable Mac invariants

| Invariant | Design consequence | Implementation consequence |
|---|---|---|
| The menu bar is central | Important commands belong in menus, even if also present in toolbars or palettes | SwiftUI `Commands` or AppKit `NSMenu`/responder-chain actions |
| Windows are state containers | Windows must resize, restore, tile, go full screen, and behave sensibly across displays | Avoid fixed layouts; set realistic minimum sizes; persist state intentionally |
| Keyboard use is first-class | Users expect shortcuts, focus traversal, Escape/Return behavior, and Help menu discoverability | Test Full Keyboard Access, menu shortcuts, focus rings, command validation |
| Search is a primary affordance | Search must have a clear scope: content search, local filter, or command search | Use `.searchable`, `NSSearchToolbarItem`, `NSSearchField`, or a deliberate command palette |
| Settings are not a popover dumping ground | Preferences, accounts, permissions, updates, and hotkeys need a real Settings surface | SwiftUI `Settings` scene or AppKit settings window |
| Accessibility is product behavior | VoiceOver labels, keyboard navigation, contrast, motion, transparency, and localization affect correctness | Audit with Accessibility Inspector and system accessibility settings |

## Tahoe/Liquid Glass rules

The Tahoe 26 direction is a design-system shift, not a skin. The system makes toolbars, sidebars, controls, menu surfaces, and app icons feel lighter and more content-focused. Agents should steer implementation toward standard controls so the OS can apply current and future styling.

### Do

- Build with standard containers and controls first.
- Let toolbars and sidebars float over content when the system provides that behavior.
- Remove redundant toolbar/sidebar backgrounds, artificial blur layers, custom titlebar hacks, and hard-coded group fills.
- Keep toolbar icons monochrome by default.
- Use tint only to communicate meaning, urgency, state, or the primary action.
- For custom glass-like elements, group related elements and use custom effects sparingly.
- Test with reduced transparency and high contrast; Liquid Glass must not be the only cue for hierarchy.

### Avoid

- Branding through custom titlebar/sidebar chrome.
- Custom translucent panels that compete with system materials.
- Overdense floating controls that obscure content.
- Hard-coded light/dark colors behind bars and sheets.
- Palette-only commands that do not appear in menus.
- Assuming screenshots represent accessibility behavior.

## Main-window patterns

### Sidebar + content + optional inspector

Use for productivity apps, knowledge apps, project apps, clients, databases, feeds, tasks, and most workspace products.

```text
Window
├── Sidebar: durable navigation: projects, folders, feeds, accounts, collections
├── Content: list/detail, editor, table, dashboard, timeline, or canvas
└── Inspector: contextual properties for selected object, optional/collapsible
```

Implementation:

- SwiftUI: `NavigationSplitView`, `List(selection:)`, `.toolbar`, `.searchable`, `.inspector`, `Commands`.
- AppKit: `NSSplitViewController`, `NSOutlineView`/`NSTableView`, `NSToolbar`, `NSSearchToolbarItem`, inspector split item or `NSPanel`.

Checklist:

- Sidebar selection persists.
- Sidebar can collapse without losing task context.
- Content remains usable at half, third, and quadrant widths.
- Inspector toggles from toolbar and View menu.
- Toolbar actions also exist as menu commands where appropriate.
- Search scope is explicit.

### Multi-window document/editor app

Use when users work with independent files, documents, projects, databases, terminal sessions, or editor workspaces.

Implementation:

- Prefer AppKit `NSDocument` for complex document behavior.
- Use SwiftUI `DocumentGroup` for simpler document apps.
- Preserve standard File, Edit, Window, and Help menu behavior.
- Support recent documents, autosave/versioning where appropriate, duplicate/revert, tabbing if useful.

Checklist:

- Command-N, Command-O, Command-S, Command-W behavior matches user expectations.
- Each document/window has independent state.
- Closing a window does not unexpectedly terminate background work unless the app is document-only.
- Drag/open behavior and file promises are correct.

### Developer/pro tool window

Use for code editors, Git/database/API clients, logs, local services, AI tooling, diagnostics, and build tools.

Recommended surfaces:

- Sidebar for projects/connections/resources.
- Primary pane for editor/table/canvas/log.
- Bottom or side pane for results, diagnostics, console, preview.
- Inspector for selected object metadata.
- Command palette as accelerator, not as menu replacement.
- Toolbar search/filter when the scope is local.

Mac-specific requirements:

- Dense but legible controls using platform control sizes.
- Virtualized tables/logs for high-volume data.
- Copy/export/share commands in menus.
- Keyboard shortcuts for repeated workflows.
- Proper text selection, find, copy, and drag/drop behavior.

## Menu bar app patterns

### Menu-only status app

Use for small toggles or simple status: keep-awake, sync state, VPN state, quick mode selection.

Required items:

```text
Status summary or primary toggle
Separator
Settings…
Help / Diagnostics if needed
Quit <App>
```

Avoid a menu-only design when users need forms, logs, account setup, long-running workflows, or troubleshooting.

### Popover menu bar app

Use for compact but richer transient UI: clipboard history, timer, mini dashboard, audio device selector.

Rules:

- Anchor to the status item.
- Escape closes.
- Click outside dismisses for transient popovers.
- Keyboard focus lands in the primary control.
- Popover is not a full app window in disguise.
- Settings opens a real window.

Use AppKit when focus, placement, multi-display behavior, or activation policy matters.

### Background agent + UI

Use when a service, proxy, monitor, sync engine, scheduler, or helper runs independently of the UI.

Rules:

- Separate service lifecycle from UI lifecycle.
- Show service status and diagnostics.
- Provide launch-at-login controls and uninstall/recovery paths.
- Prefer `SMAppService` on macOS 13+ for helpers/login items.
- Request privileged access late and explain why.

## Command model

### Minimum menus

A credible Mac app should have a coherent application menu, File/Edit/View/Window/Help where applicable, Settings, Services support where relevant, and standard shortcuts.

Map commands like this:

| Command type | Primary surface | Secondary surface |
|---|---|---|
| Global app commands | Menu bar | Command palette, toolbar |
| High-frequency contextual actions | Toolbar | Menu item and shortcut when durable |
| Object-specific actions | Context menu | Menu item if broadly useful |
| Navigation | Sidebar/list/tab/window menu | Shortcuts and toolbar |
| Search/filter | Search field | Command-F, toolbar item, menu item |
| External/system actions | App Intents | Spotlight, Shortcuts, Siri, widgets, controls |

### Command palette

A command palette is appropriate for power users, developer tools, launchers, and complex productivity apps. It must not be the only place commands exist. Mirror important commands in the menu bar and assign standard shortcuts when possible.

## Search model

Decide the search semantics before implementation.

| Search type | Meaning | Good implementation |
|---|---|---|
| Content search | Search all or scoped app content | `.searchable` on the container whose content is searched |
| Local filter | Narrow current list/table | Search field in toolbar or above list; placeholder says filter scope |
| Find in document | Match text in current document | Command-F, find bar/panel, next/previous commands |
| Command search | Run actions | Command palette, Spotlight/App Intents, Shortcuts |

Never use one search field to ambiguously mix documents, commands, settings, and web search unless the product is explicitly a universal launcher.

## Window and layout tests

Run these layout checks for every substantial UI change:

1. Default launch size.
2. Minimum supported size.
3. Left half, right half.
4. Third-width column.
5. Quadrant/tile size.
6. Full screen.
7. External display with different scale.
8. Toolbar overflow.
9. Sidebar collapsed.
10. Inspector visible and hidden.
11. Reduced transparency.
12. High contrast.
13. VoiceOver cursor movement.
14. Full Keyboard Access.
15. Dark, Light, and tinted/clear icon appearances.

Failure examples:

- Window cannot be tiled because minimum width is too large.
- Sidebar label truncation hides core navigation.
- Toolbar overflow hides primary action with no menu equivalent.
- Inspector pushes content below usable width instead of collapsing.
- Text becomes illegible behind glass or translucency.

## Settings design

Use a real settings scene/window for:

- Accounts and authentication.
- Permissions and privacy state.
- Launch at login / background helpers.
- Hotkeys.
- Updates and release channel.
- Appearance and density choices.
- Export/import/reset diagnostics.
- Advanced feature flags.

Settings should be searchable when large. Group by user task, not by implementation subsystem.

## Permission prompts

For Accessibility, Input Monitoring, Screen Recording, Automation, Full Disk Access, Network Extensions, or helper tools:

- Ask only when the feature is invoked or enabled.
- Explain the exact capability and why it is needed.
- Provide degraded mode when possible.
- Show status and remediation link/instructions.
- Never surprise-enable launch items or helpers.

## Anti-patterns and corrections

| Anti-pattern | Correction |
|---|---|
| Website in a window with no Mac adaptation | Add native menus, shortcuts, file dialogs, drag/drop, settings, resize behavior, accessibility |
| Custom toolbar/titlebar for branding | Use standard toolbars/titlebars; brand through content, iconography, copy, and workflows |
| Fixed-size desktop layout | Implement adaptive breakpoints and collapsing panes |
| Sidebar overloaded with commands, filters, settings, ads | Separate navigation, filters, toolbar actions, inspector, and settings |
| Menu bar item as only recovery path | Add Settings, Quit, Help, optional Dock/hotkey recovery |
| Notification spam | Notify only exceptional or user-requested events |
| Sandbox/notarization postponed to release week | Design entitlements and signed builds early |
| Cross-platform sameness | Share domain logic; adapt Mac shell and UX conventions |

## Agent deliverable template

```markdown
## Mac GUI assessment

Stack: <SwiftUI/AppKit/etc.>
App shape: <document/workspace/menu bar/developer tool/etc.>
Primary risks: <top 3>

### Recommended structure

- Window model:
- Navigation:
- Toolbar/search:
- Inspector/settings:
- Commands:
- App Intents/system integration:

### Tahoe/future-readiness changes

1. <standard surface/custom background/accessibility/windowing change>
2. <change>
3. <change>

### Validation

Run:
- <build/test command>
- <inspection command>
- <manual accessibility/layout checks>
```
