#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

SKIP_DIRS = {
    ".git",
    ".artifacts",
    ".build",
    ".swiftpm",
    "DerivedData",
    "build",
    "dist",
    "node_modules",
    "Pods",
    ".idea",
    ".vscode",
    ".gradle",
    "target",
    "bin",
    "obj",
    "vendor",
}

TEXT_SUFFIXES = {
    ".swift",
    ".m",
    ".mm",
    ".h",
    ".hpp",
    ".c",
    ".cc",
    ".cpp",
    ".cxx",
    ".plist",
    ".entitlements",
    ".storyboard",
    ".xib",
    ".xml",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".md",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".go",
    ".rs",
    ".kt",
    ".kts",
    ".cs",
    ".csproj",
    ".dart",
    ".qml",
    ".pro",
    ".cmake",
    ".gradle",
}

SPECIAL_TEXT_FILES = {
    "Package.swift",
    "project.pbxproj",
    "Podfile",
    "Cartfile",
    "CMakeLists.txt",
    "pubspec.yaml",
    "package.json",
    "wails.json",
    "tauri.conf.json",
    "Info.plist",
}

PATTERNS: dict[str, list[str]] = {
    "swiftui": [r"\bimport\s+SwiftUI\b", r"\bWindowGroup\b", r"\bNavigationSplitView\b"],
    "appkit": [r"\bimport\s+AppKit\b", r"\bNSWindow\b", r"\bNSViewController\b", r"\bNSApplication\b"],
    "hosting": [r"NSHosting(View|Controller)", r"NSViewRepresentable", r"NSViewControllerRepresentable"],
    "catalyst": [r"SUPPORTS_MACCATALYST\s*=\s*YES", r"DERIVE_MACCATALYST_PRODUCT_BUNDLE_IDENTIFIER", r"Mac Catalyst"],
    "electron": [r"\belectron\b", r"BrowserWindow", r"app\.whenReady", r"Menu\.setApplicationMenu"],
    "tauri": [r"\btauri\b", r"src-tauri", r"tauri\.conf"],
    "wails": [r"\bwails\b", r"WailsApp", r"github\.com/wailsapp/wails"],
    "qt": [r"\bQt6?::", r"find_package\(Qt", r"QMainWindow", r"QApplication", r"\.qml\b"],
    "flutter": [r"\bFlutter\b", r"PlatformMenuBar", r"pubspec\.yaml", r"macos/Runner"],
    "compose": [
        r"compose\.desktop",
        r"org\.jetbrains\.compose",
        r"import\s+androidx\.compose",
        r"kotlin\(\"plugin\.compose\"\)",
    ],
    "avalonia": [r"\bAvalonia\b", r"UsePlatformDetect", r"AvaloniaApplication"],
    "react_native_macos": [r"react-native-macos", r"RCTBridge", r"RCTRootView"],
    "commands": [
        r"\bCommands\b",
        r"CommandMenu",
        r"\.commands\s*\{",
        r"NSMenu",
        r"Menu\.setApplicationMenu",
        r"PlatformMenuBar",
    ],
    "settings": [r"\bSettings\s*\{", r"SettingsLink", r"Preferences", r"NSPreferences", r"Command\s*,", r"preferences"],
    "sidebar_split": [r"NavigationSplitView", r"NSSplitView", r"List\([^\n]*selection", r"Sidebar", r"sidebar"],
    "toolbar": [r"\.toolbar\s*\{", r"NSToolbar", r"ToolbarItem", r"NSSearchToolbarItem"],
    "search": [r"\.searchable", r"NSSearchField", r"NSSearchToolbarItem", r"Command-F", r"search"],
    "inspector": [r"\.inspector", r"InspectorCommands", r"NSPanel", r"inspector"],
    "menu_bar_extra": [r"MenuBarExtra", r"NSStatusItem", r"NSStatusBar", r"StatusItem"],
    "app_intents": [r"\bimport\s+AppIntents\b", r"AppIntent", r"AppShortcutsProvider"],
    "accessibility": [
        r"accessibility(Label|Value|Hint|Identifier)",
        r"NSAccessibility",
        r"aria-",
        r"accessibilityRole",
    ],
    "custom_chrome": [
        r"titlebarAppearsTransparent",
        r"fullSizeContentView",
        r"NSVisualEffectView",
        r"visualEffect",
        r"\.background\s*\(\s*Color\.",
        r"\.background\s*\(\s*NSColor",
        r"windowStyle\s*\(",
    ],
    "sandbox": [r"com\.apple\.security\.app-sandbox", r"ENABLE_APP_SANDBOX", r"App Sandbox"],
    "hardened_runtime": [r"ENABLE_HARDENED_RUNTIME\s*=\s*YES", r"hardened", r"notarytool", r"notariz"],
    "smappservice": [r"SMAppService", r"ServiceManagement", r"LaunchAgent", r"LoginItem"],
}

PRIORITY_ORDER = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}


@dataclass
class ScannedFile:
    path: Path
    rel: str
    text: str


@dataclass
class Finding:
    priority: str
    area: str
    finding: str
    evidence: list[str] = field(default_factory=list)
    recommendation: str = ""


@dataclass
class ScanState:
    root: Path
    files: list[ScannedFile]
    pattern_hits: dict[str, list[str]]
    file_counts: Counter[str]


def is_text_candidate(path: Path) -> bool:
    return path.name in SPECIAL_TEXT_FILES or path.suffix in TEXT_SUFFIXES


def iter_files(root: Path, max_file_bytes: int) -> list[ScannedFile]:
    scanned: list[ScannedFile] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS or part.endswith(".xcresult") for part in path.parts):
            continue
        if not is_text_candidate(path):
            continue
        try:
            size = path.stat().st_size
        except OSError:
            continue
        if size > max_file_bytes:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        rel = path.relative_to(root).as_posix()
        scanned.append(ScannedFile(path=path, rel=rel, text=text))
    return scanned


def collect_state(root: Path, max_file_bytes: int) -> ScanState:
    files = iter_files(root, max_file_bytes=max_file_bytes)
    pattern_hits: dict[str, list[str]] = defaultdict(list)
    file_counts: Counter[str] = Counter()

    for item in files:
        file_counts[item.path.suffix or item.path.name] += 1
        haystack = item.rel + "\n" + item.text
        for name, patterns in PATTERNS.items():
            if any(re.search(pattern, haystack, flags=re.IGNORECASE | re.MULTILINE) for pattern in patterns):
                pattern_hits[name].append(item.rel)
    return ScanState(root=root, files=files, pattern_hits=dict(pattern_hits), file_counts=file_counts)


def evidence(hits: dict[str, list[str]], key: str, limit: int = 4) -> list[str]:
    return hits.get(key, [])[:limit]


def has(state: ScanState, key: str) -> bool:
    return bool(state.pattern_hits.get(key))


def detect_stacks(state: ScanState) -> list[str]:
    stacks: list[str] = []
    if has(state, "swiftui") and has(state, "appkit"):
        if has(state, "hosting"):
            stacks.append("SwiftUI/AppKit hybrid")
        else:
            stacks.append("SwiftUI + AppKit present")
    elif has(state, "swiftui"):
        stacks.append("SwiftUI")
    elif has(state, "appkit"):
        stacks.append("AppKit")

    optional = [
        ("catalyst", "Mac Catalyst"),
        ("electron", "Electron"),
        ("tauri", "Tauri"),
        ("wails", "Wails"),
        ("qt", "Qt"),
        ("flutter", "Flutter"),
        ("compose", "Compose Multiplatform"),
        ("avalonia", "Avalonia"),
        ("react_native_macos", "React Native macOS"),
    ]
    for key, label in optional:
        if has(state, key):
            stacks.append(label)
    return stacks or ["Unknown / not enough GUI evidence"]


def first_matching_lines(state: ScanState, regex: str, limit: int = 5) -> list[str]:
    out: list[str] = []
    compiled = re.compile(regex, flags=re.IGNORECASE)
    for item in state.files:
        for line_number, line in enumerate(item.text.splitlines(), start=1):
            if compiled.search(line):
                out.append(f"{item.rel}:{line_number}: {line.strip()[:160]}")
                if len(out) >= limit:
                    return out
    return out


def analyze(state: ScanState) -> list[Finding]:
    findings: list[Finding] = []
    stacks = detect_stacks(state)
    native = any(
        stack in stacks
        for stack in ["SwiftUI", "AppKit", "SwiftUI/AppKit hybrid", "SwiftUI + AppKit present", "Mac Catalyst"]
    )
    web_or_custom = any(
        stack in stacks
        for stack in [
            "Electron",
            "Tauri",
            "Wails",
            "Flutter",
            "Compose Multiplatform",
            "Avalonia",
            "Qt",
            "React Native macOS",
        ]
    )
    menu_bar = has(state, "menu_bar_extra")

    if native and not has(state, "commands"):
        findings.append(
            Finding(
                "P1",
                "Commands",
                "No explicit Mac command/menu model was detected.",
                evidence=[],
                recommendation="Add SwiftUI `Commands` or AppKit `NSMenu`/responder-chain commands for app-level actions, standard shortcuts, and toolbar parity.",
            )
        )

    if native and not has(state, "settings"):
        findings.append(
            Finding(
                "P1",
                "Settings",
                "No explicit Settings/Preferences surface was detected.",
                evidence=[],
                recommendation="Add a SwiftUI `Settings` scene, `SettingsLink`, or AppKit settings window. Do not hide global preferences in a popover or inspector.",
            )
        )

    if menu_bar:
        menu_evidence = evidence(state.pattern_hits, "menu_bar_extra")
        quit_hits = first_matching_lines(state, r"NSApp\.terminate|terminate\(|Quit|quit", limit=3)
        settings_hits = evidence(state.pattern_hits, "settings", limit=3)
        if not quit_hits:
            findings.append(
                Finding(
                    "P0",
                    "Menu bar utility",
                    "A menu bar/status item was detected, but no Quit path was found.",
                    evidence=menu_evidence,
                    recommendation="Add an explicit Quit item or reliable recovery path. Pure status apps become hostile when users cannot exit them.",
                )
            )
        if not settings_hits:
            findings.append(
                Finding(
                    "P1",
                    "Menu bar utility",
                    "A menu bar/status item was detected, but no Settings path was found.",
                    evidence=menu_evidence,
                    recommendation="Add Settings/Preferences from the status menu or popover, especially for permissions, hotkeys, launch-at-login, and diagnostics.",
                )
            )

    if native and not has(state, "sidebar_split"):
        findings.append(
            Finding(
                "P2",
                "Navigation",
                "No standard sidebar/split-view navigation pattern was detected.",
                evidence=[],
                recommendation="For workspace/productivity apps, prefer `NavigationSplitView` or `NSSplitViewController`. If the app is document-only or panel-only, document that exception.",
            )
        )

    if native and not menu_bar and not has(state, "toolbar"):
        findings.append(
            Finding(
                "P2",
                "Toolbar",
                "No toolbar API usage was detected.",
                evidence=[],
                recommendation="Add a standard SwiftUI `.toolbar` or AppKit `NSToolbar` for frequent contextual actions. Keep commands mirrored in the menu bar.",
            )
        )

    if native and not menu_bar and not has(state, "search"):
        findings.append(
            Finding(
                "P2",
                "Search",
                "No standard search field or search command was detected.",
                evidence=[],
                recommendation="Decide whether the product needs content search, local filtering, or command search. Use `.searchable`, `NSSearchField`, or `NSSearchToolbarItem` as appropriate.",
            )
        )

    if has(state, "custom_chrome"):
        findings.append(
            Finding(
                "P1",
                "Visual system",
                "Custom chrome/material/background code was detected.",
                evidence=evidence(state.pattern_hits, "custom_chrome"),
                recommendation="Audit custom titlebar, blur, material, and background code before Tahoe/Liquid Glass adoption. Prefer system sidebars, toolbars, panels, and materials unless product-specific chrome is justified.",
            )
        )

    fixed_size = first_matching_lines(
        state,
        r"\.frame\s*\(\s*width\s*:\s*(7\d\d|8\d\d|9\d\d|[1-9]\d{3,})|"
        r"minWidth\s*:\s*(7\d\d|8\d\d|9\d\d|[1-9]\d{3,})|"
        r"fixedSize\s*\(\s*horizontal\s*:\s*true",
        limit=5,
    )
    if fixed_size:
        findings.append(
            Finding(
                "P1",
                "Window layout",
                "Potential fixed-size or high-minimum-width layout code was detected.",
                evidence=fixed_size,
                recommendation="Verify halves, thirds, quadrants, full screen, external displays, and restored windows. Collapse sidebars/inspectors instead of clipping content.",
            )
        )

    if native and not has(state, "accessibility"):
        findings.append(
            Finding(
                "P2",
                "Accessibility",
                "No explicit accessibility labels/roles/hints were detected.",
                evidence=[],
                recommendation="Audit with Accessibility Inspector, Full Keyboard Access, VoiceOver, reduced transparency, contrast, and keyboard-only workflows. Add explicit labels for custom controls and dense toolbar/status UI.",
            )
        )

    if native and not has(state, "app_intents"):
        findings.append(
            Finding(
                "P3",
                "System actions",
                "No App Intents integration was detected.",
                evidence=[],
                recommendation="For user-invoked app actions that make sense outside the app, add App Intents/App Shortcuts for Spotlight, Shortcuts, Siri, widgets, or controls.",
            )
        )

    if not has(state, "sandbox"):
        findings.append(
            Finding(
                "P2",
                "Distribution",
                "No App Sandbox entitlement/configuration evidence was detected.",
                evidence=[],
                recommendation="If Mac App Store distribution is possible, design sandbox and entitlements early. For outside-store apps, still document file/network/automation privileges.",
            )
        )

    if not has(state, "hardened_runtime"):
        findings.append(
            Finding(
                "P2",
                "Distribution",
                "No hardened runtime/notarization configuration evidence was detected.",
                evidence=[],
                recommendation="For Developer ID distribution, enable Hardened Runtime and add notarization to CI before release packaging becomes urgent.",
            )
        )

    if web_or_custom and not has(state, "commands"):
        findings.append(
            Finding(
                "P1",
                "Cross-platform Mac adaptation",
                "A cross-platform stack was detected without an explicit native Mac menu/command model.",
                evidence=[stack for stack in stacks if stack not in {"Unknown / not enough GUI evidence"}],
                recommendation="Add native menu bar, standard shortcuts, native dialogs, window behavior, and accessibility semantics rather than shipping a website-in-a-window.",
            )
        )

    if has(state, "smappservice") and not has(state, "settings"):
        findings.append(
            Finding(
                "P1",
                "Helpers/login items",
                "Helper/login item APIs were detected without a clear Settings surface.",
                evidence=evidence(state.pattern_hits, "smappservice"),
                recommendation="Expose launch-at-login/helper state, diagnostics, and uninstall/disable controls in Settings.",
            )
        )

    return sorted(findings, key=lambda f: (PRIORITY_ORDER.get(f.priority, 9), f.area, f.finding))


def format_markdown(state: ScanState, findings: list[Finding], quick: bool) -> str:
    stacks = detect_stacks(state)
    lines: list[str] = []
    lines.append("# macOS GUI design audit")
    lines.append("")
    lines.append(f"Project: `{state.root}`")
    lines.append(f"Files scanned: {len(state.files)}")
    lines.append(f"Mode: {'quick' if quick else 'full'}")
    lines.append("")

    lines.append("## Detected stack")
    lines.append("")
    for stack in stacks:
        lines.append(f"- {stack}")
    lines.append("")

    if state.pattern_hits:
        lines.append("## Detected Mac UI signals")
        lines.append("")
        for key in sorted(state.pattern_hits):
            sample = ", ".join(state.pattern_hits[key][:3])
            more = "" if len(state.pattern_hits[key]) <= 3 else f" (+{len(state.pattern_hits[key]) - 3} more)"
            lines.append(f"- `{key}`: {sample}{more}")
        lines.append("")

    lines.append("## Findings")
    lines.append("")
    if not findings:
        lines.append(
            "No high-level issues were detected by the heuristic scanner. Still run manual review for window tiling, keyboard navigation, VoiceOver, reduced transparency, signing, sandboxing, and notarization."
        )
        lines.append("")
    else:
        lines.append("| Priority | Area | Finding | Recommendation | Evidence |")
        lines.append("|---|---|---|---|---|")
        for item in findings:
            ev = "<br>".join(escape_md(e) for e in item.evidence) if item.evidence else "—"
            lines.append(
                "| {priority} | {area} | {finding} | {recommendation} | {evidence} |".format(
                    priority=item.priority,
                    area=escape_md(item.area),
                    finding=escape_md(item.finding),
                    recommendation=escape_md(item.recommendation),
                    evidence=ev,
                )
            )
        lines.append("")

    lines.append("## Recommended next steps")
    lines.append("")
    lines.append(
        "1. Confirm the app shape: main-window workspace, document app, menu bar utility, developer/pro tool, or cross-platform app with a Mac-specific shell."
    )
    lines.append(
        "2. Patch P0/P1 issues first, especially missing Quit/Settings paths, command model gaps, fixed-size layouts, and custom chrome that conflicts with Tahoe/Liquid Glass."
    )
    lines.append(
        "3. Add or update a design brief covering window model, navigation, search, commands, permissions, distribution, and accessibility checks."
    )
    lines.append("4. Run build/test/signing commands available in the repo; add a `scripts/check.sh` if none exists.")
    lines.append(
        "5. Manually test tiled halves/thirds/quadrants, full screen, external displays, Light/Dark, high contrast, reduced transparency, Full Keyboard Access, and VoiceOver."
    )
    lines.append("")

    if not quick:
        lines.append("## File type summary")
        lines.append("")
        for suffix, count in state.file_counts.most_common(20):
            lines.append(f"- `{suffix}`: {count}")
        lines.append("")

    return "\n".join(lines)


def escape_md(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Inspect a repository for modern macOS GUI design signals and risks.")
    parser.add_argument("--path", default=".", help="Repository/project path to inspect.")
    parser.add_argument("--output", help="Write Markdown report to this path. Defaults to stdout.")
    parser.add_argument("--quick", action="store_true", help="Generate a shorter report suitable for hooks.")
    parser.add_argument(
        "--max-file-bytes", type=int, default=256_000, help="Skip individual files larger than this size."
    )
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON instead of Markdown.")
    args = parser.parse_args(argv)

    root = Path(args.path).expanduser().resolve()
    if not root.exists():
        print(f"Path does not exist: {root}", file=sys.stderr)
        return 2

    state = collect_state(root, max_file_bytes=args.max_file_bytes)
    findings = analyze(state)

    if args.json:
        payload = {
            "project": str(root),
            "files_scanned": len(state.files),
            "detected_stack": detect_stacks(state),
            "signals": {key: value[:10] for key, value in sorted(state.pattern_hits.items())},
            "findings": [item.__dict__ for item in findings],
        }
        output = json.dumps(payload, indent=2, sort_keys=True)
    else:
        output = format_markdown(state, findings, quick=args.quick)

    if args.output:
        output_path = Path(args.output).expanduser()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output + "\n", encoding="utf-8")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
