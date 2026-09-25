#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json

from _menubar_repo_lib import build_checks, render_verification_markdown, scan_repo, to_json_payload, write_output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify a macOS menu bar app repository against a practical pass/warn/fail checklist."
    )
    parser.add_argument("repo", help="Path to the repository to verify.")
    parser.add_argument(
        "--format",
        choices=("md", "json"),
        default="md",
        help="Output format. Defaults to markdown.",
    )
    parser.add_argument(
        "--write",
        help="Optional output file path. Defaults to stdout.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    result = scan_repo(args.repo)
    checks = build_checks(result)

    if args.format == "json":
        payload = to_json_payload(result, checks=checks)
        write_output(json.dumps(payload, indent=2, sort_keys=True) + "\n", args.write)
    else:
        write_output(render_verification_markdown(result, checks), args.write)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
