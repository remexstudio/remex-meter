#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Generate a fresh macOS menu bar app scaffold from this skill's starter blueprints.

Usage:
  bash scripts/new-menubar-app.sh \
    --template swiftui-menubarextra|hybrid-statusitem-popover \
    --target /path/to/output \
    --app-name MyApp \
    --bundle-id com.example.MyApp

Options:
  --template NAME           Starter blueprint. Defaults to hybrid-statusitem-popover.
  --target PATH             Output directory to create. Required.
  --app-name NAME           Human-facing app name. Required.
  --bundle-id ID            Bundle identifier. Required.
  --min-macos VERSION       Minimum macOS version. Defaults to 15.0.
  --status-symbol SYMBOL    SF Symbol name for the status item. Optional.
  --force                   Replace the target directory if it already exists.
  --no-xcodegen             Do not run xcodegen automatically even if installed.
  -h, --help                Show this help.
EOF
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "${script_dir}/.." && pwd)"
python_bin="${PYTHON:-python3}"

template="hybrid-statusitem-popover"
target=""
app_name=""
bundle_id=""
min_macos="15.0"
status_symbol=""
force="false"
run_xcodegen="auto"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --template)
      template="${2:-}"
      shift 2
      ;;
    --target)
      target="${2:-}"
      shift 2
      ;;
    --app-name)
      app_name="${2:-}"
      shift 2
      ;;
    --bundle-id)
      bundle_id="${2:-}"
      shift 2
      ;;
    --min-macos)
      min_macos="${2:-}"
      shift 2
      ;;
    --status-symbol)
      status_symbol="${2:-}"
      shift 2
      ;;
    --force)
      force="true"
      shift
      ;;
    --no-xcodegen)
      run_xcodegen="false"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "${target}" || -z "${app_name}" || -z "${bundle_id}" ]]; then
  echo "--target, --app-name, and --bundle-id are required." >&2
  usage >&2
  exit 2
fi

case "${template}" in
  swiftui-menubarextra)
    : "${status_symbol:=switch.2}"
    ;;
  hybrid-statusitem-popover)
    : "${status_symbol:=waveform.path.ecg.rectangle}"
    ;;
  *)
    echo "Unsupported template: ${template}" >&2
    exit 2
    ;;
esac

template_dir="${skill_dir}/assets/${template}"
if [[ ! -d "${template_dir}" ]]; then
  echo "Template directory not found: ${template_dir}" >&2
  exit 1
fi

target="$(${python_bin} -S - "${target}" <<'PY'
from pathlib import Path
import sys
print(Path(sys.argv[1]).expanduser().resolve())
PY
)"

if [[ -e "${target}" ]]; then
  if [[ "${force}" != "true" ]]; then
    echo "Target already exists: ${target}" >&2
    echo "Re-run with --force to replace it." >&2
    exit 1
  fi
  rm -rf "${target}"
fi

mkdir -p "$(dirname "${target}")"
cp -R "${template_dir}" "${target}"

"${python_bin}" -S - "${target}" "${app_name}" "${bundle_id}" "${min_macos}" "${status_symbol}" <<'PY'
from __future__ import annotations

from pathlib import Path
import datetime as _dt
import re
import sys

target = Path(sys.argv[1])
app_name = sys.argv[2]
bundle_id = sys.argv[3]
min_macos = sys.argv[4]
status_symbol = sys.argv[5]

def swift_identifier(value: str) -> str:
    parts = re.split(r"[^A-Za-z0-9]+", value)
    identifier = "".join(part[:1].upper() + part[1:] for part in parts if part)
    if not identifier:
        identifier = "MenuBarApp"
    if identifier[0].isdigit():
        identifier = f"App{identifier}"
    return identifier

safe_project_name = re.sub(r"[^A-Za-z0-9_-]+", "-", app_name).strip("-") or "MenuBarApp"

tokens = {
    "__APP_NAME__": app_name,
    "__APP_IDENTIFIER__": swift_identifier(app_name),
    "__BUNDLE_ID__": bundle_id,
    "__MIN_MACOS__": min_macos,
    "__STATUS_SYMBOL__": status_symbol,
    "__PROJECT_DIR_HINT__": safe_project_name,
    "__YEAR__": str(_dt.date.today().year),
}

text_suffixes = {
    ".swift", ".md", ".yml", ".yaml", ".plist", ".entitlements", ".xcconfig", ".txt", ".gitignore"
}

for path in target.rglob("*"):
    if not path.is_file():
        continue
    if path.suffix.lower() not in text_suffixes and path.name not in {".gitignore", "project.yml"}:
        continue
    text = path.read_text(encoding="utf-8")
    for old, new in tokens.items():
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")
PY

if [[ "${run_xcodegen}" != "false" ]] && command -v xcodegen >/dev/null 2>&1; then
  (
    cd "${target}"
    xcodegen generate >/dev/null
  )
  xcodegen_note="Generated .xcodeproj with xcodegen."
else
  xcodegen_note="xcodegen not run. Use project.yml later, or copy App/ and Config/ into a new Xcode macOS App target."
fi

cat <<EOF
Scaffold created:
  ${target}

Template:
  ${template}

App:
  ${app_name}
  ${bundle_id}
  macOS ${min_macos}+

${xcodegen_note}

Suggested next steps:
  1. Open ${target}/README.md
  2. Review ${target}/Config/Info.plist
  3. Run:
       python3 "${skill_dir}/scripts/verify-menubar-app.py" "${target}"
EOF
