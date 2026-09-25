---
name: macos-gui-app-design
description: Design, bootstrap, audit, and improve modern macOS GUI apps for macOS 15, macOS Tahoe 26, and future releases. Use for SwiftUI, AppKit, SwiftUI/AppKit hybrid, Mac Catalyst, menu bar apps, developer tools, utilities, Liquid Glass, sidebars, toolbars, menus, windowing, search, accessibility, sandboxing, notarization, or Mac app project setup/review.
compatibility: Agent Skills-compatible tools including Codex CLI. Helper scripts use Bash and Python 3 with no third-party packages. Building generated apps requires macOS and Xcode/Swift toolchains.
metadata:
  version: "1.0.0"
  generated: "2026-04-30"
---

# Modern macOS GUI app design

Use this skill to produce Mac-first GUI app architecture, starter projects, design audits, and implementation plans for modern macOS. Target macOS 15, macOS Tahoe 26, and future releases.

## Default stance

1. For a long-lived polished Mac-first app, prefer **SwiftUI + AppKit hybrid**.
2. Use **SwiftUI-first** for ordinary navigation, settings, forms, list/detail, inspectors, toolbars, search, and content views.
3. Use **AppKit boundaries** for advanced window management, document workflows, status items, panels, responder-chain behavior, complex tables/outlines/text, precise menu validation, and special activation/focus semantics.
4. Use **cross-platform runtimes** only when product constraints justify them. Mac polish still requires native menus, shortcuts, windows, accessibility, dialogs, file access, signing, and distribution discipline.
5. For Tahoe/Liquid Glass and future design shifts, prefer standard system structures over custom chrome: `NavigationSplitView`, sidebars, split views, toolbars, search fields, inspectors, sheets, popovers, menus, settings, and AppKit equivalents.

## Fast stack decision

| Product shape | Default implementation |
|---|---|
| Mac-first productivity app | SwiftUI + AppKit hybrid |
| Pro editor, document app, complex table/text/window workflow | AppKit-first shell + SwiftUI islands |
| Simple utility with normal windows/settings | SwiftUI-first + AppKit escape hatches |
| Menu bar utility | SwiftUI `MenuBarExtra` for simple menus; AppKit `NSStatusItem`/`NSPopover`/`NSPanel` for serious utilities |
| Existing iPad app | Mac Catalyst, then add Mac menus, shortcuts, windows, density, and native controls |
| Existing web app or JS/TS team | Tauri for lean webview apps or Electron for mature ecosystem/runtime parity |
| C++ industrial/scientific app | Qt, with explicit Mac UX adaptation |
| .NET desktop product | Avalonia or .NET MAUI Mac Catalyst, depending on whether true desktop XAML or Catalyst reuse matters |

Load [references/framework-decision-matrix.md](references/framework-decision-matrix.md) when the stack choice is not obvious.
Load [references/research-synthesis.md](references/research-synthesis.md) when you need the rationale behind the skill defaults or are updating the skill from new platform research.

## Fresh project workflow

1. Clarify only the product constraints that change architecture: app type, document vs workspace model, menu bar vs Dock app, data model, permissions, distribution target, and cross-platform requirements.
2. Choose a starter pattern:
   - Main-window app: sidebar + content + optional inspector.
   - Document/editor app: multi-window or tabbed document model.
   - Menu bar utility: compact menu/popover plus real Settings and Quit paths.
   - Developer/pro tool: multi-pane layout, command routing, logs/output, search/filtering, keyboard workflow.
3. Generate or copy assets:
   - Run `scripts/bootstrap-macos-gui-app.sh --name "App Name" --output ./AppName --bundle-id com.example.appname` for a lightweight SwiftUI starter package.
   - Or copy files from `assets/swiftui-app-skeleton/` and replace placeholders.
   - Use `assets/xcodegen/project.yml` when an Xcode project generator is acceptable.
4. Apply the Mac UX baseline:
   - Global menu commands for discoverability and keyboard shortcuts.
   - Resizable windows with sensible min sizes and restoration intent.
   - Standard toolbar/search/sidebar/inspector behavior.
   - Settings scene/window, Help path, and Quit path.
   - Accessibility labels, keyboard-only navigation, VoiceOver-compatible names, and reduced-transparency/contrast checks.
5. Add App Intents when actions should be available through Spotlight, Shortcuts, Siri, widgets, controls, or system command surfaces.
6. Add sandbox/signing/notarization decisions early. Do not defer entitlements, helper processes, automation permissions, or JIT decisions until release.
7. Return a project tree, command list, and next implementation steps. Include code snippets only for the files the user needs to touch.

For detailed code examples, load [references/bootstrap-and-code-templates.md](references/bootstrap-and-code-templates.md).

## Existing project audit workflow

1. Run the inspector:

   ```bash
   scripts/inspect-macos-gui-app.py --path . --output macos-gui-audit.md
   ```

2. Classify the app: SwiftUI, AppKit, hybrid, Catalyst, Electron, Tauri, Wails, Qt, Flutter, Compose, Avalonia, React Native macOS, or other.
3. Inspect the high-risk areas:
   - Navigation architecture: sidebar/split view/tab/document/window model.
   - Command model: menu bar, shortcuts, toolbar parity, responder-chain validation.
   - Window behavior: resizing, full screen, tiling halves/thirds/quadrants, restoration, multi-display behavior.
   - Search model: content search vs filter vs command palette.
   - Visual system: hard-coded backgrounds, custom titlebars, fake blur/materials, over-tinted icons, custom controls that fight Liquid Glass.
   - Menu bar utility behavior: Dock icon policy, Quit/Settings, popover focus, hotkeys, recovery path.
   - Accessibility and permissions: labels, keyboard navigation, VoiceOver, contrast, reduced transparency, privacy prompts.
   - Distribution: sandbox, hardened runtime, notarization, entitlements, helpers, login items, App Store viability.
4. Produce an improvement plan grouped into immediate fixes, structural refactors, and release-gate checks.
5. Patch toward standard APIs first. Escalate to custom AppKit only when the product need is specific and documented.
6. Run build/test commands available in the repo. If none exist, add a minimal `scripts/check.sh` or equivalent.

For the full audit checklist and remediation patterns, load [references/inspect-improve-existing-apps.md](references/inspect-improve-existing-apps.md).

## Tahoe/future-proof UI rules

- Standard surfaces first: sidebars, split views, toolbars, search fields, tab bars, popovers, sheets, menus, settings, inspectors.
- Content remains primary. Floating controls should clarify hierarchy, not add decoration.
- Remove fake translucency and redundant toolbar/sidebar backgrounds before adding custom Liquid Glass effects.
- Use monochrome toolbar icons by default. Tint only to convey meaning or a clear call to action.
- Test with Light, Dark, tinted/clear icon appearances, high contrast, reduced transparency, full keyboard access, VoiceOver, full screen, external displays, and tiled windows.
- Treat excessive minimum window width as a defect.

Load [references/macos-design-playbook.md](references/macos-design-playbook.md) for detailed pattern guidance.

## Distribution, permissions, and accessibility

For Mac apps, release engineering is product design. Load [references/distribution-accessibility-security.md](references/distribution-accessibility-security.md) when the task involves App Sandbox, entitlements, helper tools, login items, LaunchAgents, LaunchDaemons, global hotkeys, Accessibility/Input Monitoring/Screen Recording, notarization, Mac App Store review, or external distribution.

## Scripts

- `scripts/bootstrap-macos-gui-app.sh` — creates a ready-to-open SwiftUI starter package with Mac-oriented commands, settings, sidebar/content/inspector structure, entitlements template, and check script.
- `scripts/inspect-macos-gui-app.py` — scans an existing repo and emits a Markdown Mac GUI design/audit report.
- `scripts/install-design-audit-hook.sh` — installs a nonblocking Git pre-commit hook that runs the inspector.
- `scripts/validate-skill-repo.py` — validates this skill directory against key Agent Skills structure rules.

## Expected output from agents

When using this skill, always return:

1. The chosen stack and why.
2. Concrete files/scripts/commands used.
3. A concise design audit or architecture rationale.
4. A prioritized patch plan or generated project tree.
5. Any build/test/audit command results, or a clear statement that the local environment lacks Xcode/macOS tooling.

Do not claim that a project is App Store-ready, notarized, accessible, or Tahoe-compliant without running the relevant checks or clearly marking the claim as a design recommendation.
