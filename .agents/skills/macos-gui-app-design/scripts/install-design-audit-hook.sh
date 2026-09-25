#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "$script_dir/.." && pwd)"
repo="."
force=0

usage() {
  cat <<'USAGE'
Usage:
  install-design-audit-hook.sh [--repo PATH] [--force]

Installs a nonblocking Git pre-commit hook that runs the macOS GUI design
inspector and writes `.agent-tools/macos-gui-app-design/latest-report.md`.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      repo="${2:-}"
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

repo_root="$(cd "$repo" && pwd)"
if [[ ! -d "$repo_root/.git" ]]; then
  echo "Not a Git repository: $repo_root" >&2
  exit 1
fi

tool_dir="$repo_root/.agent-tools/macos-gui-app-design"
hook_path="$repo_root/.git/hooks/pre-commit"
marker_begin="# macos-gui-app-design: begin"
marker_end="# macos-gui-app-design: end"

mkdir -p "$tool_dir"
cp "$skill_dir/scripts/inspect-macos-gui-app.py" "$tool_dir/inspect-macos-gui-app.py"
chmod +x "$tool_dir/inspect-macos-gui-app.py"

if [[ -f "$hook_path" && "$force" -eq 0 && $(grep -cF "$marker_begin" "$hook_path" || true) -gt 0 ]]; then
  echo "Hook already contains macos-gui-app-design block: $hook_path"
  exit 0
fi

if [[ -f "$hook_path" && $(grep -cF "$marker_begin" "$hook_path" || true) -gt 0 ]]; then
  awk -v begin="$marker_begin" -v end="$marker_end" '
    $0 == begin { skip = 1; next }
    $0 == end { skip = 0; next }
    skip != 1 { print }
  ' "$hook_path" >"$hook_path.tmp"
  mv "$hook_path.tmp" "$hook_path"
fi

if [[ -f "$hook_path" ]]; then
  cp "$hook_path" "$hook_path.before-macos-gui-design.$(date +%Y%m%d%H%M%S)"
else
  cat >"$hook_path" <<'HEADER'
#!/usr/bin/env bash
set -euo pipefail
HEADER
fi

cat >>"$hook_path" <<'HOOK'

# macos-gui-app-design: begin
# Nonblocking design audit; inspect the generated report when changing Mac UI code.
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
tool_dir="$repo_root/.agent-tools/macos-gui-app-design"
if [[ -x "$tool_dir/inspect-macos-gui-app.py" ]]; then
  python3 -S "$tool_dir/inspect-macos-gui-app.py" \
    --path "$repo_root" \
    --quick \
    --output "$tool_dir/latest-report.md" >/dev/null 2>&1 || true
fi
# macos-gui-app-design: end
HOOK

chmod +x "$hook_path"
cat <<EOF2
Installed macOS GUI design audit hook:
  Repository: $repo_root
  Hook:       $hook_path
  Tool dir:   $tool_dir

Report path after commits:
  $tool_dir/latest-report.md
EOF2
