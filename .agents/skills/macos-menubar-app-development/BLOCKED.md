# macos-menubar-app-development — not vendored (license blocker)

Upstream: https://github.com/zhutao100/macos-menubar-app-dev-skill (inspected at `c2a7ff7b9c08d3c0c803f55ee872c2ba2ec53df4`, skill directory `macos-menubar-app-development/`).

This skill is **intentionally not copied** into this repository. Its `LICENSE` is "MIT License with Anthropic-Related Restrictions", which:

- requires express written permission for any commercial use (section 2a);
- grants no permission at all to Anthropic or to any party with a commercial relationship with Anthropic (section 2b);
- prohibits use in or adaptation for any software that interfaces with Anthropic's APIs, services or models such as Claude (section 3a).

Remex Meter reads Claude Code usage and Claude plan limits, so vendoring this skill into this tree would fall under section 3a regardless of who uses it. A maintainer must resolve the license (written permission from the author, or a replacement skill) before the content lands here. Do not fetch or install it into this repository in the meantime.

There is deliberately no `SKILL.md` in this directory, so skill loaders do not pick it up. Until the blocker is resolved, `apple-menubar-monitor` and `macos-design` are the required menu-bar guidance; see `AGENTS.md`.
