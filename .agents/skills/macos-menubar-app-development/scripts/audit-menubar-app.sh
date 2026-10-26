#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Run a combined macOS menu bar app audit.

Usage:
  bash scripts/audit-menubar-app.sh /path/to/repo [--out /path/to/output-dir]

Outputs:
  inspection.md
  verification.md
  verification.json
EOF
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python_bin="${PYTHON:-python3}"
repo=""
out=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out)
      out="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ -z "${repo}" ]]; then
        repo="$1"
        shift
      else
        echo "Unexpected argument: $1" >&2
        usage >&2
        exit 2
      fi
      ;;
  esac
done

if [[ -z "${repo}" ]]; then
  echo "Repository path is required." >&2
  usage >&2
  exit 2
fi

repo="$(${python_bin} -S - "${repo}" <<'PY'
from pathlib import Path
import sys
print(Path(sys.argv[1]).expanduser().resolve())
PY
)"

if [[ -z "${out}" ]]; then
  out="${repo}/menubar-audit"
fi

out="$(${python_bin} -S - "${out}" <<'PY'
from pathlib import Path
import sys
print(Path(sys.argv[1]).expanduser().resolve())
PY
)"

mkdir -p "${out}"

"${python_bin}" "${script_dir}/inspect-menubar-app.py" "${repo}" --write "${out}/inspection.md"
"${python_bin}" "${script_dir}/verify-menubar-app.py" "${repo}" --write "${out}/verification.md"
"${python_bin}" "${script_dir}/verify-menubar-app.py" "${repo}" --format json --write "${out}/verification.json"

cat <<EOF
Audit written:
  ${out}/inspection.md
  ${out}/verification.md
  ${out}/verification.json
EOF
