#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
import json
import plistlib
import re
from typing import Any

TEXT_SUFFIXES = {
    ".swift", ".m", ".mm", ".h", ".hpp", ".plist", ".entitlements",
    ".pbxproj", ".yml", ".yaml", ".md", ".txt", ".xcconfig",
    ".strings", ".sh", ".py", ".json", ".xcprivacy",
}

IGNORE_DIR_NAMES = {
    ".git", ".svn", ".hg", ".artifacts", ".build", "build", "Build", "DerivedData",
    "Pods", "Carthage", "node_modules", ".swiftpm", "menubar-audit",
    ".xcodeproj/project.xcworkspace",
}

PATTERNS: dict[str, re.Pattern[str]] = {
    "menu_bar_extra": re.compile(r"\bMenuBarExtra\b"),
    "menu_bar_extra_window_style": re.compile(r"\.menuBarExtraStyle\(\s*\.window\s*\)"),
    "menu_bar_extra_menu_style": re.compile(r"\.menuBarExtraStyle\(\s*\.menu\s*\)"),
    "nsstatusitem_create": re.compile(r"\bNSStatusBar\.system\.statusItem\b"),
    "nsstatusitem": re.compile(r"\bNSStatusItem\b|\bNSStatusBar\.system\.statusItem\b"),
    "nspopover": re.compile(r"\bNSPopover\b"),
    "nswindow": re.compile(r"\bNSWindow\b"),
    "nsvisualeffect": re.compile(r"\bNSVisualEffectView\b"),
    "nsapp_delegate": re.compile(r"\bNSApplicationDelegate\b"),
    "nsapp_delegate_adaptor": re.compile(r"\bNSApplicationDelegateAdaptor\b"),
    "settings_scene": re.compile(r"\bSettings\s*\{"),
    "settings_link": re.compile(r"\bSettingsLink\b"),
    "open_settings_action": re.compile(r"\bopenSettings\b"),
    "custom_settings_window": re.compile(r"\bSettingsWindow\b|\bSettingsWindowController\b|\bshowSettings\s*\("),
    "settings_window_resizable": re.compile(r"\bstyleMask\s*=\s*\[[^\]]*\.resizable|\.styleMask\.insert\s*\(\s*\.resizable", re.DOTALL),
    "settings_window_min_size": re.compile(r"\bcontentMinSize\b|\bminSize\b"),
    "smappservice_mainapp": re.compile(r"\bSMAppService\.mainApp\b"),
    "smappservice_loginitem": re.compile(r"\bSMAppService\.loginItem\s*\("),
    "smloginitemsetenabled": re.compile(r"\bSMLoginItemSetEnabled\b"),
    "template_image": re.compile(r"\bisTemplate\s*=\s*true\b|renderingMode\s*\(\s*\.template\s*\)"),
    "sf_symbols": re.compile(r"systemSymbolName:|systemName:|systemImage:"),
    "status_button_send_action": re.compile(r"\bsendAction\s*\(\s*on:\s*\[[^\]]*(leftMouse|rightMouse)", re.DOTALL),
    "terminate_action": re.compile(r"\bNSApp\.terminate\s*\(|\bterminate\s*\(|\bQuit\b"),
    "application_dock_menu": re.compile(r"\bapplicationDockMenu\s*\("),
    "nsmenu": re.compile(r"\bNSMenu\b"),
    "nsmenuitem_custom_view": re.compile(r"\.\s*view\s*="),
    "hardened_runtime": re.compile(r"ENABLE_HARDENED_RUNTIME\s*(=|:)\s*YES"),
    "app_sandbox": re.compile(r"com\.apple\.security\.app-sandbox"),
    "privacy_manifest": re.compile(r"PrivacyInfo\.xcprivacy|NSPrivacyAccessedAPITypes|NSPrivacyCollectedDataTypes"),
    "user_defaults": re.compile(r"\bUserDefaults\b|\b@AppStorage\b"),
    "ats_arbitrary_loads": re.compile(r"NSAllowsArbitraryLoads\s*</key>\s*<(true|integer>1)", re.DOTALL),
    "privileged_helper": re.compile(r"\bSMJobBless\b|\bSMPrivilegedExecutables\b|\bNSXPCListener\b|\bmachServiceName\b|\bAuthorization\b"),
    "global_hotkey": re.compile(r"\bMASShortcut\b|\bHotKey\b|\bKeyboardShortcuts\b|\bRegisterEventHotKey\b|NSEvent\.addGlobalMonitorForEvents"),
    "workaround_menubarextra_access": re.compile(r"\bMenuBarExtraAccess\b"),
    "statusitem_autosave": re.compile(r"\bautosaveName\b"),
    "system_settings_menu_bar_docs": re.compile(r"System Settings.{0,100}Menu Bar|Menu Bar.{0,100}System Settings", re.IGNORECASE | re.DOTALL),
    "sparkle": re.compile(r"\bSparkle\b|\bSPUStandardUpdaterController\b|\bSUFeedURL\b|\bSUEnableInstallerLauncherService\b"),
    "sparkle_installer_xpc": re.compile(r"\bSUEnableInstallerLauncherService\b"),
    "accessibility_identifier": re.compile(r"\baccessibilityIdentifier\b|\.accessibilityLabel\s*\("),
}


@dataclass(slots=True)
class Match:
    path: str
    line: int
    text: str


@dataclass(slots=True)
class ScanResult:
    root: str
    build_systems: list[str] = field(default_factory=list)
    plist_flags: dict[str, dict[str, Any]] = field(default_factory=dict)
    deployment_targets: list[str] = field(default_factory=list)
    bundle_ids: list[str] = field(default_factory=list)
    matches: dict[str, list[Match]] = field(default_factory=dict)

    def has(self, key: str) -> bool:
        return bool(self.matches.get(key))

    def get(self, key: str) -> list[Match]:
        return self.matches.get(key, [])

    def first_examples(self, key: str, limit: int = 3) -> list[str]:
        return [f"`{item.path}:{item.line}` — {item.text}" for item in self.get(key)[:limit]]


@dataclass(slots=True)
class Check:
    key: str
    status: str
    title: str
    rationale: str
    evidence: list[str] = field(default_factory=list)
    recommendation: str = ""


def scan_repo(root: str | Path) -> ScanResult:
    repo_root = Path(root).expanduser().resolve()
    if not repo_root.exists():
        raise FileNotFoundError(f"Path does not exist: {repo_root}")
    if not repo_root.is_dir():
        raise NotADirectoryError(f"Path is not a directory: {repo_root}")

    result = ScanResult(root=str(repo_root))

    if any(repo_root.glob("*.xcodeproj")):
        result.build_systems.append("xcodeproj")
    if (repo_root / "project.yml").exists() or (repo_root / "project.yaml").exists():
        result.build_systems.append("xcodegen")
    if (repo_root / "Package.swift").exists():
        result.build_systems.append("swiftpm")

    for path in _iter_repo_files(repo_root):
        if path.suffix in {".plist", ".entitlements", ".xcprivacy"}:
            _scan_plist(path, repo_root, result)

        if _is_probably_text(path):
            text = _read_text(path)
            if text is None:
                continue
            _scan_text(path, repo_root, text, result)

    result.build_systems = sorted(set(result.build_systems))
    result.deployment_targets = sorted({v for v in result.deployment_targets if re.fullmatch(r"[0-9.]+", v)})
    result.bundle_ids = sorted(set(result.bundle_ids))
    return result


def infer_architecture(result: ScanResult) -> dict[str, Any]:
    detail: list[str] = []

    if result.has("menu_bar_extra") and not result.has("nsstatusitem"):
        shell = "SwiftUI MenuBarExtra"
    elif result.has("menu_bar_extra") and result.has("nsstatusitem"):
        shell = "Hybrid SwiftUI + AppKit"
    elif result.has("nsstatusitem"):
        shell = "AppKit status item shell"
    else:
        shell = "No clear menu bar shell detected"

    if result.has("menu_bar_extra_window_style"):
        detail.append("MenuBarExtra .window style detected")
    elif result.has("menu_bar_extra_menu_style"):
        detail.append("MenuBarExtra .menu style detected")
    if result.has("nspopover"):
        detail.append("NSPopover detected")
    if result.has("nswindow"):
        detail.append("NSWindow/custom window detected")
    if result.has("custom_settings_window"):
        detail.append("Dedicated settings window/controller detected")
    if result.has("smappservice_mainapp"):
        detail.append("SMAppService.mainApp login item management")
    if result.has("smloginitemsetenabled"):
        detail.append("Legacy SMLoginItemSetEnabled detected")
    if _plist_bool(result, "LSUIElement"):
        detail.append("LSUIElement / agent app mode")
    if _plist_bool(result, "LSBackgroundOnly"):
        detail.append("LSBackgroundOnly detected")
    if result.has("privileged_helper"):
        detail.append("Privileged helper / XPC signals present")
    if result.has("sparkle"):
        detail.append("Sparkle updater signals present")

    return {
        "shell": shell,
        "detail": detail,
        "recommended_starter": _recommended_starter(result),
        "build_systems": result.build_systems,
        "deployment_targets": result.deployment_targets,
    }


def build_checks(result: ScanResult) -> list[Check]:
    checks: list[Check] = []
    has_entry = result.has("menu_bar_extra") or result.has("nsstatusitem")
    lsui = _plist_bool(result, "LSUIElement")
    lsbackground = _plist_bool(result, "LSBackgroundOnly")
    sandboxed = result.has("app_sandbox") or _plist_bool(result, "com.apple.security.app-sandbox")
    ats_arbitrary = result.has("ats_arbitrary_loads") or _plist_bool(result, "NSAllowsArbitraryLoads")

    checks.append(Check(
        key="menu-entrypoint",
        status="PASS" if has_entry else "FAIL",
        title="Menu bar entrypoint exists",
        rationale="The repo should expose either a SwiftUI MenuBarExtra or an AppKit NSStatusItem shell.",
        evidence=_examples_for_keys(result, ["menu_bar_extra", "nsstatusitem_create", "nsstatusitem"]),
        recommendation="Add a clear menu bar shell before changing other UI layers." if not has_entry else "",
    ))

    settings_present = any(result.has(k) for k in ("settings_scene", "settings_link", "open_settings_action", "custom_settings_window"))
    settings_status = "PASS" if settings_present else "FAIL"
    settings_recommendation = "" if settings_present else "Add a reliable Settings entry path."
    if settings_present and result.has("menu_bar_extra") and not (result.has("custom_settings_window") or result.has("nsapp_delegate") or result.has("nsapp_delegate_adaptor")):
        settings_status = "WARN"
        settings_recommendation = "Verify Settings opens frontmost from a Dockless/menu-bar-only launch path. Consider a dedicated AppKit settings window for production utilities."
    checks.append(Check(
        key="settings-path",
        status=settings_status,
        title="Settings path is discoverable and reliable",
        rationale="Menu bar utilities need a durable configuration surface beyond the status item.",
        evidence=_examples_for_keys(result, ["settings_scene", "settings_link", "open_settings_action", "custom_settings_window"]),
        recommendation=settings_recommendation,
    ))

    custom_settings_window = result.has("custom_settings_window") and result.has("nswindow")
    settings_window_sizing_ok = (
        not custom_settings_window
        or (result.has("settings_window_resizable") and result.has("settings_window_min_size"))
    )
    checks.append(Check(
        key="settings-window-sizing",
        status="PASS" if settings_window_sizing_ok else "WARN",
        title="Custom Settings windows have bounded, resizable sizing",
        rationale="Dockless menu bar apps need Settings windows that stay usable with long paths, diagnostics text, and accessibility text sizes.",
        evidence=_examples_for_keys(result, ["settings_window_resizable", "settings_window_min_size", "custom_settings_window"]),
        recommendation="For custom NSWindow settings surfaces, add `.resizable`, a `contentMinSize`, and bounded/truncated long text so intrinsic SwiftUI content cannot create a giant fixed window." if not settings_window_sizing_ok else "",
    ))

    quit_present = result.has("terminate_action")
    checks.append(Check(
        key="quit-path",
        status="PASS" if quit_present else ("FAIL" if lsui else "WARN"),
        title="Quit path exists",
        rationale="Dockless LSUIElement apps must expose an explicit Quit command because users cannot rely on Dock UI.",
        evidence=result.first_examples("terminate_action"),
        recommendation="Add a Quit item that calls NSApp.terminate(nil)." if not quit_present else "",
    ))

    lsbackground_paths = _plist_paths_with_truthy(result, "LSBackgroundOnly")
    background_in_main_like_bundle = any(
        not re.search(r"helper|launchatlogin|login|daemon|agent|xpc", path, re.IGNORECASE)
        for path in lsbackground_paths
    )
    if lsbackground and has_entry and background_in_main_like_bundle:
        agent_status = "FAIL"
        agent_recommendation = "Replace LSBackgroundOnly with LSUIElement for the GUI app target."
    elif lsbackground:
        agent_status = "WARN"
        agent_recommendation = "Confirm LSBackgroundOnly is used only by faceless helpers/login items, not the main GUI menu bar app."
    else:
        agent_status = "PASS"
        agent_recommendation = ""
    checks.append(Check(
        key="agent-app-mode",
        status=agent_status,
        title="Agent app mode is appropriate",
        rationale="LSUIElement is appropriate for Dockless GUI agents. LSBackgroundOnly is appropriate only for faceless helper processes.",
        evidence=_plist_evidence(result, ["LSUIElement", "LSBackgroundOnly"]),
        recommendation=agent_recommendation,
    ))

    icon_ok = result.has("sf_symbols") or result.has("template_image")
    checks.append(Check(
        key="status-icon-legibility",
        status="PASS" if icon_ok else ("WARN" if has_entry else "FAIL"),
        title="Status icon is likely legible on modern menu bars",
        rationale="macOS Tahoe 26 and accessibility modes make fixed-color status icons fragile. Prefer SF Symbols or template images.",
        evidence=_examples_for_keys(result, ["sf_symbols", "template_image"]),
        recommendation="Use NSImage(systemSymbolName:) / SwiftUI systemImage or mark custom assets as template images." if not icon_ok else "",
    ))

    if result.has("smappservice_mainapp"):
        login_status = "PASS"
        login_recommendation = ""
    elif result.has("smloginitemsetenabled"):
        login_status = "WARN"
        login_recommendation = "Migrate macOS 13+ paths to SMAppService.mainApp and keep SMLoginItemSetEnabled only for legacy support."
    else:
        login_status = "WARN"
        login_recommendation = "Add a user-visible launch-at-login toggle backed by SMAppService.mainApp if the product should start at login."
    checks.append(Check(
        key="launch-at-login",
        status=login_status,
        title="Launch-at-login uses the modern API",
        rationale="Modern macOS apps should use SMAppService for main-app login items and expose the control in Settings.",
        evidence=_examples_for_keys(result, ["smappservice_mainapp", "smloginitemsetenabled"]),
        recommendation=login_recommendation,
    ))

    complex_ui = result.has("global_hotkey") or result.has("nspopover") or result.has("nswindow")
    presentation_warn = result.has("menu_bar_extra_window_style") and complex_ui and not result.has("nsstatusitem")
    checks.append(Check(
        key="presentation-control",
        status="WARN" if presentation_warn else "PASS",
        title="Shell has enough presentation control for likely behavior",
        rationale="MenuBarExtra is convenient but weaker for explicit show/hide, hotkeys, and custom right-click behavior.",
        evidence=_examples_for_keys(result, ["menu_bar_extra_window_style", "global_hotkey", "nspopover", "nswindow", "nsstatusitem_create", "nsstatusitem"]),
        recommendation="Move toward an NSStatusItem + NSPopover/custom-window shell if explicit presentation control matters." if presentation_warn else "",
    ))

    if result.has("nsstatusitem"):
        right_status = "PASS" if result.has("status_button_send_action") else "WARN"
        right_recommendation = "" if result.has("status_button_send_action") else "If requirements include right-click behavior, use statusItem.button?.sendAction(on:) and inspect NSApp.currentEvent."
    else:
        right_status = "PASS"
        right_recommendation = ""
    checks.append(Check(
        key="right-click-handling",
        status=right_status,
        title="Right-click behavior is explicit when AppKit is used",
        rationale="Established menu bar utilities often split left-click and right-click behavior; AppKit can do this reliably.",
        evidence=result.first_examples("status_button_send_action"),
        recommendation=right_recommendation,
    ))

    checks.append(Check(
        key="menu-bar-visibility-support",
        status="PASS" if result.has("system_settings_menu_bar_docs") else "WARN",
        title="macOS 26 menu bar visibility support copy exists",
        rationale="On macOS 26+, users may need to enable the app under System Settings → Menu Bar before status items appear.",
        evidence=result.first_examples("system_settings_menu_bar_docs"),
        recommendation="Add user-facing troubleshooting text. The skill ships assets/support/menu-bar-visibility-note.md." if not result.has("system_settings_menu_bar_docs") else "",
    ))

    checks.append(Check(
        key="sandbox-decision",
        status="PASS" if sandboxed else "WARN",
        title="App Sandbox decision is explicit",
        rationale="Modern macOS distribution should treat sandbox entitlements as architectural constraints, not release-time chores.",
        evidence=_examples_for_keys(result, ["app_sandbox"]),
        recommendation="Decide and document sandbox posture. For App Store builds, add minimal entitlements and test permission-denied states." if not sandboxed else "",
    ))

    checks.append(Check(
        key="hardened-runtime",
        status="PASS" if result.has("hardened_runtime") else "WARN",
        title="Hardened Runtime is configured for Developer ID distribution",
        rationale="Developer ID notarization workflows commonly require hardened runtime configuration in Xcode build settings.",
        evidence=result.first_examples("hardened_runtime"),
        recommendation="Enable hardened runtime for Developer ID builds unless the distribution path proves otherwise." if not result.has("hardened_runtime") else "",
    ))

    privacy_needed = result.has("user_defaults")
    privacy_present = result.has("privacy_manifest")
    checks.append(Check(
        key="privacy-manifest",
        status="PASS" if privacy_present else ("WARN" if privacy_needed else "PASS"),
        title="Privacy manifest is present when required-reason API usage is likely",
        rationale="App Store submission requires declared reasons for required-reason APIs such as UserDefaults when applicable.",
        evidence=_examples_for_keys(result, ["privacy_manifest", "user_defaults"]),
        recommendation="Add and validate PrivacyInfo.xcprivacy. Use assets/release/PrivacyInfo.xcprivacy.userdefaults-example only as a starting point." if (privacy_needed and not privacy_present) else "",
    ))

    checks.append(Check(
        key="ats-arbitrary-loads",
        status="WARN" if ats_arbitrary else "PASS",
        title="ATS arbitrary network loads are not broadly enabled",
        rationale="NSAllowsArbitraryLoads=true should be rare and justified; broad network exceptions weaken security posture.",
        evidence=_examples_for_keys(result, ["ats_arbitrary_loads"]) + _plist_evidence(result, ["NSAllowsArbitraryLoads"]),
        recommendation="Remove NSAllowsArbitraryLoads or replace it with narrow domain exceptions." if ats_arbitrary else "",
    ))

    sparkle_problem = result.has("sparkle") and sandboxed and not (result.has("sparkle_installer_xpc") or _plist_bool(result, "SUEnableInstallerLauncherService"))
    checks.append(Check(
        key="sparkle-sandbox-xpc",
        status="WARN" if sparkle_problem else "PASS",
        title="Sparkle sandbox integration is complete when used",
        rationale="Sandboxed Sparkle apps need the installer launcher XPC service and matching Info.plist configuration.",
        evidence=_examples_for_keys(result, ["sparkle", "sparkle_installer_xpc"]),
        recommendation="Set SUEnableInstallerLauncherService=YES and include Sparkle's installer XPC service for sandboxed non-MAS builds." if sparkle_problem else "",
    ))

    checks.append(Check(
        key="privileged-helper-isolation",
        status="WARN" if result.has("privileged_helper") else "PASS",
        title="Privileged helper / XPC scope is isolated and documented",
        rationale="System-monitoring apps may need privileged helpers; keep them separately entitled, signed, and auditable.",
        evidence=result.first_examples("privileged_helper"),
        recommendation="Audit helper entitlements, signing, launchd registration, and user-visible uninstall/diagnostics paths." if result.has("privileged_helper") else "",
    ))

    rich_ui = result.has("nspopover") or result.has("nswindow") or result.has("menu_bar_extra_window_style")
    checks.append(Check(
        key="accessibility-ui-tests",
        status="PASS" if (not rich_ui or result.has("accessibility_identifier")) else "WARN",
        title="Accessibility and UI-test hooks are present for richer surfaces",
        rationale="Popover/window UI should be testable and screen-reader friendly; static identifiers and labels help.",
        evidence=result.first_examples("accessibility_identifier"),
        recommendation="Add accessibilityLabel/accessibilityIdentifier to primary controls and test with VoiceOver/Accessibility Inspector." if rich_ui and not result.has("accessibility_identifier") else "",
    ))

    checks.append(Check(
        key="custom-menu-complexity",
        status="WARN" if result.has("nsmenuitem_custom_view") else "PASS",
        title="Complex custom NSMenu views are avoided",
        rationale="Custom NSMenuItem views can produce fragile keyboard, focus, layout, and accessibility behavior.",
        evidence=result.first_examples("nsmenuitem_custom_view"),
        recommendation="Move complex/scrollable/focusable content into an NSPopover or custom NSWindow." if result.has("nsmenuitem_custom_view") else "",
    ))

    return checks


def to_json_payload(result: ScanResult, checks: list[Check] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "root": result.root,
        "architecture": infer_architecture(result),
        "build_systems": result.build_systems,
        "deployment_targets": result.deployment_targets,
        "bundle_ids": result.bundle_ids,
        "plist_flags": result.plist_flags,
        "matches": {key: [asdict(item) for item in value] for key, value in sorted(result.matches.items())},
    }
    if checks is not None:
        payload["checks"] = [asdict(check) for check in checks]
    return payload


def render_inspection_markdown(result: ScanResult) -> str:
    architecture = infer_architecture(result)
    lines = [
        "# macOS Menu Bar App Inspection",
        "",
        f"Repo: `{result.root}`",
        "",
        "## Architecture",
        "",
        f"- Shell: **{architecture['shell']}**",
        f"- Recommended starter reference: `{architecture['recommended_starter']}`",
    ]

    if architecture["detail"]:
        lines.append("- Details:")
        for detail in architecture["detail"]:
            lines.append(f"  - {detail}")

    lines.extend([
        "",
        "## Project signals",
        "",
        f"- Build systems: {', '.join(result.build_systems) if result.build_systems else 'not detected'}",
        f"- Deployment targets: {', '.join(result.deployment_targets) if result.deployment_targets else 'not detected'}",
        f"- Bundle identifiers: {', '.join(result.bundle_ids) if result.bundle_ids else 'not detected'}",
    ])

    if result.plist_flags:
        lines.extend(["", "## Plist / entitlement flags", ""])
        for path, flags in sorted(result.plist_flags.items()):
            visible = {key: value for key, value in flags.items() if value not in (None, "")}
            if visible:
                lines.append(f"- `{path}`: `{json.dumps(visible, sort_keys=True)}`")

    lines.extend(["", "## Detected patterns", ""])
    for key, matches in sorted(result.matches.items()):
        lines.append(f"### {key} ({len(matches)})")
        for match in matches[:5]:
            lines.append(f"- `{match.path}:{match.line}` — {match.text}")
        if len(matches) > 5:
            lines.append(f"- … {len(matches) - 5} more")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def render_verification_markdown(result: ScanResult, checks: list[Check]) -> str:
    architecture = infer_architecture(result)
    counts = {status: sum(1 for check in checks if check.status == status) for status in ("PASS", "WARN", "FAIL")}
    lines = [
        "# macOS Menu Bar App Verification",
        "",
        f"Repo: `{result.root}`",
        f"Detected shell: **{architecture['shell']}**",
        f"Recommended starter reference: `{architecture['recommended_starter']}`",
        "",
        f"Summary: **{counts['PASS']} PASS**, **{counts['WARN']} WARN**, **{counts['FAIL']} FAIL**",
        "",
        "## Checks",
        "",
    ]

    for check in checks:
        lines.append(f"### {check.status}: {check.title}")
        lines.append("")
        lines.append(f"- Key: `{check.key}`")
        lines.append(f"- Rationale: {check.rationale}")
        if check.evidence:
            lines.append("- Evidence:")
            for item in check.evidence[:5]:
                lines.append(f"  - {item}")
        if check.recommendation:
            lines.append(f"- Recommendation: {check.recommendation}")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def write_output(text: str, path: str | None) -> None:
    if path:
        output = Path(path).expanduser()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(text, encoding="utf-8")
    else:
        print(text, end="")


def _iter_repo_files(root: Path):
    for path in root.rglob("*"):
        if any(part in IGNORE_DIR_NAMES for part in path.parts):
            continue
        if path.is_file():
            yield path


def _is_probably_text(path: Path) -> bool:
    return path.suffix.lower() in TEXT_SUFFIXES or path.name in {"project.yml", "project.yaml", "Package.swift", "README"}


def _read_text(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            return path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return None
    except OSError:
        return None


def _scan_text(path: Path, root: Path, text: str, result: ScanResult) -> None:
    rel = str(path.relative_to(root))

    for key, pattern in PATTERNS.items():
        for match in pattern.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            snippet = _line_snippet(text, match.start())
            result.matches.setdefault(key, []).append(Match(rel, line, snippet))

    for pattern in (
        re.compile(r"MACOSX_DEPLOYMENT_TARGET\s*=\s*([0-9.]+)"),
        re.compile(r"IPHONEOS_DEPLOYMENT_TARGET\s*=\s*([0-9.]+)"),
        re.compile(r"macOS:\s*\"?([0-9.]+)\"?"),
        re.compile(r"LSMinimumSystemVersion\s*</key>\s*<string>([0-9.]+)</string>"),
    ):
        result.deployment_targets.extend(pattern.findall(text))

    for bundle_id in re.findall(r"PRODUCT_BUNDLE_IDENTIFIER\s*(?:=|:)\s*([A-Za-z0-9_.-]+)", text):
        result.bundle_ids.append(bundle_id)


def _scan_plist(path: Path, root: Path, result: ScanResult) -> None:
    rel = str(path.relative_to(root))
    try:
        data = plistlib.loads(path.read_bytes())
    except Exception:
        return
    if not isinstance(data, dict):
        return

    flags: dict[str, Any] = {}
    for key in (
        "LSUIElement", "LSBackgroundOnly", "LSMinimumSystemVersion",
        "CFBundleIdentifier", "SUEnableInstallerLauncherService",
        "com.apple.security.app-sandbox",
    ):
        if key in data:
            flags[key] = data[key]

    ats = data.get("NSAppTransportSecurity")
    if isinstance(ats, dict) and "NSAllowsArbitraryLoads" in ats:
        flags["NSAllowsArbitraryLoads"] = ats["NSAllowsArbitraryLoads"]

    if "NSPrivacyAccessedAPITypes" in data or "NSPrivacyCollectedDataTypes" in data:
        flags["PrivacyInfo"] = True

    if flags:
        result.plist_flags[rel] = flags
    if isinstance(data.get("CFBundleIdentifier"), str):
        result.bundle_ids.append(data["CFBundleIdentifier"])
    if isinstance(data.get("LSMinimumSystemVersion"), str):
        result.deployment_targets.append(data["LSMinimumSystemVersion"])


def _line_snippet(text: str, pos: int) -> str:
    start = text.rfind("\n", 0, pos) + 1
    end = text.find("\n", pos)
    if end == -1:
        end = len(text)
    return re.sub(r"\s+", " ", text[start:end].strip())[:220]


def _examples_for_keys(result: ScanResult, keys: list[str], limit: int = 4) -> list[str]:
    examples: list[str] = []
    for key in keys:
        for item in result.get(key):
            examples.append(f"`{item.path}:{item.line}` — {item.text}")
            if len(examples) >= limit:
                return examples
    return examples


def _plist_bool(result: ScanResult, key: str) -> bool:
    return any(_truthy(flags.get(key)) for flags in result.plist_flags.values())


def _plist_paths_with_truthy(result: ScanResult, key: str) -> list[str]:
    return [path for path, flags in sorted(result.plist_flags.items()) if _truthy(flags.get(key))]


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes"}
    return False


def _plist_evidence(result: ScanResult, keys: list[str]) -> list[str]:
    evidence: list[str] = []
    for path, flags in sorted(result.plist_flags.items()):
        selected = {key: flags[key] for key in keys if key in flags}
        if selected:
            evidence.append(f"`{path}` — `{json.dumps(selected, sort_keys=True)}`")
    return evidence


def _recommended_starter(result: ScanResult) -> str:
    if result.has("nsstatusitem") or result.has("nspopover") or result.has("nswindow") or result.has("global_hotkey"):
        return "assets/hybrid-statusitem-popover/"
    if result.has("menu_bar_extra"):
        return "assets/swiftui-menubarextra/"
    return "assets/hybrid-statusitem-popover/"
