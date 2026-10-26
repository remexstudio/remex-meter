#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json

from _menubar_repo_lib import render_inspection_markdown, scan_repo, to_json_payload, write_output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inspect a macOS menu bar app repository and classify its shell and integration patterns."
    )
    parser.add_argument("repo", help="Path to the repository to inspect.")
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

    if args.format == "json":
        payload = to_json_payload(result)
        write_output(json.dumps(payload, indent=2, sort_keys=True) + "\n", args.write)
    else:
        write_output(render_inspection_markdown(result), args.write)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
