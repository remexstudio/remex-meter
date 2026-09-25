#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "${script_dir}/.." && pwd)"
repo_root="$(cd "${skill_dir}/.." && pwd)"
skill_name="$(basename "${skill_dir}")"
python_bin="${PYTHON:-python3}"

required_paths=(
  "${repo_root}/README.md"
  "${repo_root}/AGENTS.md"
  "${skill_dir}/SKILL.md"
  "${skill_dir}/references/research-and-best-practices.md"
  "${skill_dir}/references/stats-case-study.md"
  "${skill_dir}/references/verification-and-improvement-playbook.md"
  "${skill_dir}/scripts/install-skill.sh"
  "${skill_dir}/scripts/new-menubar-app.sh"
  "${skill_dir}/scripts/audit-menubar-app.sh"
  "${skill_dir}/scripts/inspect-menubar-app.py"
  "${skill_dir}/scripts/verify-menubar-app.py"
  "${skill_dir}/scripts/_menubar_repo_lib.py"
  "${skill_dir}/assets/swiftui-menubarextra/README.md"
  "${skill_dir}/assets/hybrid-statusitem-popover/README.md"
  "${skill_dir}/assets/prompts/audit-request-template.md"
  "${skill_dir}/assets/prompts/bootstrap-request-template.md"
  "${skill_dir}/assets/support/menu-bar-visibility-note.md"
  "${skill_dir}/assets/release/sandboxed-app.entitlements"
  "${skill_dir}/assets/release/PrivacyInfo.xcprivacy.userdefaults-example"
)

missing=0
for path in "${required_paths[@]}"; do
  if [[ ! -e "${path}" ]]; then
    echo "Missing required path: ${path}" >&2
    missing=1
  fi
done

"${python_bin}" -S - "${skill_dir}" "${skill_name}" <<'PY'
from pathlib import Path
import re
import sys

skill_dir = Path(sys.argv[1])
expected_name = sys.argv[2]
text = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
match = re.search(r"^---\n(.*?)\n---", text, re.S)
if not match:
    raise SystemExit("SKILL.md is missing YAML frontmatter")
frontmatter = match.group(1)
name_match = re.search(r"^name:\s*(.+)$", frontmatter, re.M)
description_match = re.search(r"^description:\s*(.+)$", frontmatter, re.M)
if not name_match:
    raise SystemExit("SKILL.md frontmatter is missing name:")
if not description_match:
    raise SystemExit("SKILL.md frontmatter is missing description:")
actual_name = name_match.group(1).strip()
if actual_name != expected_name:
    raise SystemExit(f"SKILL.md name {actual_name!r} does not match directory name {expected_name!r}")
line_count = len(text.splitlines())
if line_count > 500:
    print(f"Warning: SKILL.md has {line_count} lines; keep it under 500 when possible.", file=sys.stderr)
PY

"${python_bin}" -S -m py_compile \
  "${skill_dir}/scripts/_menubar_repo_lib.py" \
  "${skill_dir}/scripts/inspect-menubar-app.py" \
  "${skill_dir}/scripts/verify-menubar-app.py"

if [[ "${missing}" -ne 0 ]]; then
  exit 1
fi

echo "Skill repo structure and Python scripts validated successfully."
