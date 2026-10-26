#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
tool_dir="$repo_root/.agent-tools/macos-gui-app-design"
inspector="$tool_dir/inspect-macos-gui-app.py"
report="$tool_dir/latest-report.md"

if [[ -x "$inspector" ]]; then
  python3 -S "$inspector" --path "$repo_root" --quick --output "$report" >/dev/null 2>&1 || true
fi
