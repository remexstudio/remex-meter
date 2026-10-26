#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---", 4)
    if end == -1:
        return {}, text
    raw = text[4:end].strip().splitlines()
    data: dict[str, str] = {}
    for line in raw:
        if not line.strip() or line.startswith(" ") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        value = value.strip().strip('"')
        data[key.strip()] = value
    return data, text[end + 4 :]


def check(condition: bool, message: str, errors: list[str], warnings: list[str], warning: bool = False) -> None:
    if condition:
        return
    if warning:
        warnings.append(message)
    else:
        errors.append(message)


def validate(skill_dir: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    check(skill_dir.exists(), f"Skill directory does not exist: {skill_dir}", errors, warnings)
    if not skill_dir.exists():
        return errors, warnings

    skill_md = skill_dir / "SKILL.md"
    check(skill_md.is_file(), "Missing required SKILL.md", errors, warnings)
    if skill_md.is_file():
        text = skill_md.read_text(encoding="utf-8")
        frontmatter, body = parse_frontmatter(text)
        name = frontmatter.get("name", "")
        description = frontmatter.get("description", "")
        check(bool(frontmatter), "SKILL.md must start with YAML frontmatter", errors, warnings)
        check(bool(name), "SKILL.md frontmatter missing `name`", errors, warnings)
        check(bool(description), "SKILL.md frontmatter missing `description`", errors, warnings)
        check(bool(NAME_RE.match(name)), f"Skill name should be lowercase kebab-case: {name!r}", errors, warnings)
        check(
            len(description) <= 1024,
            "Description must be concise enough for tool use; keep <=1024 chars",
            errors,
            warnings,
        )
        check(
            name == skill_dir.name,
            f"Skill directory name should match frontmatter name: {skill_dir.name!r} != {name!r}",
            errors,
            warnings,
        )
        check(len(body.strip()) >= 500, "SKILL.md body is too short for actionable instructions", errors, warnings)
        check(
            "references/" in body or "references" in body,
            "SKILL.md should point to progressive-disclosure references",
            errors,
            warnings,
            warning=True,
        )

    references = skill_dir / "references"
    scripts = skill_dir / "scripts"
    assets = skill_dir / "assets"
    check(references.is_dir(), "Missing references/ directory", errors, warnings)
    check(scripts.is_dir(), "Missing scripts/ directory", errors, warnings)
    check(assets.is_dir(), "Missing assets/ directory", errors, warnings)

    if references.is_dir():
        ref_files = sorted(references.glob("*.md"))
        check(bool(ref_files), "references/ should contain Markdown reference files", errors, warnings)
        for path in ref_files:
            text = path.read_text(encoding="utf-8")
            check(
                len(text.strip()) >= 300, f"Reference file looks too short: {path.name}", errors, warnings, warning=True
            )

    if scripts.is_dir():
        script_files = [p for p in scripts.iterdir() if p.is_file()]
        check(bool(script_files), "scripts/ should contain executable helper scripts", errors, warnings)
        for path in script_files:
            mode = path.stat().st_mode
            check(bool(mode & 0o111), f"Script is not executable: {path.name}", errors, warnings)
            first = path.read_text(encoding="utf-8", errors="ignore").splitlines()[:1]
            check(
                bool(first and first[0].startswith("#!")),
                f"Script missing shebang: {path.name}",
                errors,
                warnings,
                warning=True,
            )

    return errors, warnings


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Validate an Agent Skill directory for structure and installability.")
    parser.add_argument("path", nargs="?", default=".", help="Skill directory to validate.")
    args = parser.parse_args(argv)

    errors, warnings = validate(Path(args.path).resolve())
    for warning in warnings:
        print(f"warning: {warning}")
    for error in errors:
        print(f"error: {error}", file=sys.stderr)

    if errors:
        print(f"Validation failed with {len(errors)} error(s).", file=sys.stderr)
        return 1
    print("Validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
