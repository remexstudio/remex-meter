#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Install the macos-menubar-app-development skill.

Usage:
  bash scripts/install-skill.sh --scope user
  bash scripts/install-skill.sh --scope repo --repo /path/to/repo
  bash scripts/install-skill.sh --scope admin [--force]
  bash scripts/install-skill.sh --scope custom --dest /path/to/skills-root [--force]

Options:
  --scope user|repo|admin|custom   Installation scope. Defaults to user.
  --repo PATH                      Target repo root when --scope repo is used.
  --dest PATH                      Target skills root when --scope custom is used.
  --force                          Replace an existing installed copy.
  -h, --help                       Show this help.
EOF
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "${script_dir}/.." && pwd)"
skill_name="$(basename "${skill_dir}")"

scope="user"
repo_path=""
dest_root=""
force="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope)
      scope="${2:-}"
      shift 2
      ;;
    --repo)
      repo_path="${2:-}"
      shift 2
      ;;
    --dest)
      dest_root="${2:-}"
      shift 2
      ;;
    --force)
      force="true"
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

if [[ ! -f "${skill_dir}/SKILL.md" ]]; then
  echo "SKILL.md not found at ${skill_dir}" >&2
  exit 1
fi

case "${scope}" in
  user)
    dest_root="${HOME}/.agents/skills"
    ;;
  repo)
    if [[ -z "${repo_path}" ]]; then
      echo "--repo is required when --scope repo is used." >&2
      exit 2
    fi
    dest_root="${repo_path}/.agents/skills"
    ;;
  admin)
    dest_root="/etc/codex/skills"
    ;;
  custom)
    if [[ -z "${dest_root}" ]]; then
      echo "--dest is required when --scope custom is used." >&2
      exit 2
    fi
    ;;
  *)
    echo "Unsupported scope: ${scope}" >&2
    exit 2
    ;;
esac

mkdir -p "${dest_root}"
installed_path="${dest_root}/${skill_name}"

if [[ -e "${installed_path}" ]]; then
  if [[ "${force}" != "true" ]]; then
    echo "Destination already exists: ${installed_path}" >&2
    echo "Re-run with --force to replace it." >&2
    exit 1
  fi
  rm -rf "${installed_path}"
fi

cp -R "${skill_dir}" "${installed_path}"

cat <<EOF
Installed:
  ${installed_path}

Skill roots used by current Codex CLI conventions:
  user:  ~/.agents/skills
  repo:  .agents/skills
  admin: /etc/codex/skills

Validate the source repo anytime with:
  bash ${skill_name}/scripts/check-skill.sh
EOF
