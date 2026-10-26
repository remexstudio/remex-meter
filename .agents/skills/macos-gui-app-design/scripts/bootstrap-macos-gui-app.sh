#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "$script_dir/.." && pwd)"
template_dir="$skill_dir/assets/swiftui-app-skeleton"
xcodegen_template="$skill_dir/assets/xcodegen/project.yml"

usage() {
  cat <<'USAGE'
Usage:
  bootstrap-macos-gui-app.sh --name "App Name" --output ./AppName --bundle-id com.example.appname [options]

Options:
  --name NAME              Human-readable app name. Required.
  --output PATH            Destination directory. Required.
  --bundle-id ID           Reverse-DNS bundle identifier. Required.
  --minimum-macos VERSION  Minimum macOS deployment target. Default: 15.0.
  --force                  Replace destination if it already exists.
  -h, --help               Show this help.

Creates a lightweight SwiftUI-first macOS starter with sidebar/content/inspector,
menu commands, settings, App Intents starter, entitlements, and a design brief.
USAGE
}

app_name=""
output=""
bundle_id=""
minimum_macos="15.0"
force=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)
      app_name="${2:-}"
      shift 2
      ;;
    --output)
      output="${2:-}"
      shift 2
      ;;
    --bundle-id)
      bundle_id="${2:-}"
      shift 2
      ;;
    --minimum-macos)
      minimum_macos="${2:-}"
      shift 2
      ;;
    --force)
      force=1
      shift
      ;;
    -h | --help)
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

if [[ -z "$app_name" || -z "$output" || -z "$bundle_id" ]]; then
  echo "--name, --output, and --bundle-id are required." >&2
  usage >&2
  exit 2
fi

if [[ ! -d "$template_dir" ]]; then
  echo "Template directory not found: $template_dir" >&2
  exit 1
fi

module_name="$(printf '%s' "$app_name" | perl -pe 's/[^A-Za-z0-9]+//g')"
if [[ -z "$module_name" ]]; then
  echo "Could not derive a Swift module name from: $app_name" >&2
  exit 2
fi
if [[ ! "$module_name" =~ ^[A-Za-z] ]]; then
  module_name="App$module_name"
fi

bundle_prefix="${bundle_id%.*}"
if [[ "$bundle_prefix" == "$bundle_id" ]]; then
  bundle_prefix="com.example"
fi

if [[ -e "$output" ]]; then
  if [[ "$force" -ne 1 ]]; then
    echo "Destination already exists: $output" >&2
    echo "Use --force to replace it." >&2
    exit 1
  fi
  rm -rf "$output"
fi

mkdir -p "$output"
cp -R "$template_dir/." "$output/"

mv "$output/Sources/__MODULE_NAME__" "$output/Sources/$module_name"
mv "$output/Sources/$module_name/__MODULE_NAME__App.swift" "$output/Sources/$module_name/${module_name}App.swift"
mv "$output/Tests/__MODULE_NAME__Tests" "$output/Tests/${module_name}Tests"
mv "$output/Tests/${module_name}Tests/__MODULE_NAME__Tests.swift" "$output/Tests/${module_name}Tests/${module_name}Tests.swift"
mv "$output/Entitlements/__MODULE_NAME__.entitlements" "$output/Entitlements/${module_name}.entitlements"

cp "$xcodegen_template" "$output/project.yml"

# Replace placeholders in text files. Limit to common source/config/doc types.
APP_NAME="$app_name" \
  MODULE_NAME="$module_name" \
  BUNDLE_ID="$bundle_id" \
  BUNDLE_PREFIX="$bundle_prefix" \
  MINIMUM_MACOS="$minimum_macos" \
  python3 -S - "$output" <<'PYPLACEHOLDERS'
from __future__ import annotations

import os
import sys
from pathlib import Path

root = Path(sys.argv[1])
replacements = {
    "__APP_NAME__": os.environ["APP_NAME"],
    "__MODULE_NAME__": os.environ["MODULE_NAME"],
    "__BUNDLE_ID__": os.environ["BUNDLE_ID"],
    "__BUNDLE_PREFIX__": os.environ["BUNDLE_PREFIX"],
    "__MINIMUM_MACOS__": os.environ["MINIMUM_MACOS"],
}
allowed_suffixes = {".swift", ".md", ".yml", ".yaml", ".plist", ".entitlements", ".sh"}
allowed_names = {"Package.swift"}
for path in root.rglob("*"):
    if not path.is_file():
        continue
    if path.suffix not in allowed_suffixes and path.name not in allowed_names:
        continue
    text = path.read_text(encoding="utf-8")
    for old, new in replacements.items():
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")
PYPLACEHOLDERS

chmod +x "$output/scripts/check.sh"

cat <<EOF2
Created macOS GUI starter:
  App name:       $app_name
  Module:         $module_name
  Bundle ID:      $bundle_id
  Minimum macOS:  $minimum_macos
  Destination:    $output

Next commands:
  cd "$output"
  open Package.swift
  scripts/check.sh

For an Xcode app target, install XcodeGen and run:
  xcodegen generate

Review before production:
  Docs/design-brief.md
  Entitlements/${module_name}.entitlements
  project.yml
EOF2
