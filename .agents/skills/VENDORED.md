# Vendored agent skills

Skills in this directory are copied verbatim from their upstream repositories with `git archive` at the pinned commit, not rewritten. Update a vendored skill by re-archiving a newer upstream commit and changing the pin here in the same commit; do not hand-edit vendored files.

| Local path | Upstream | Pinned commit | License status | Notes |
|---|---|---|---|---|
| `macos-design/` | [ceorkm/macos-design-skill](https://github.com/ceorkm/macos-design-skill) | `8f528a2364f996cd42f02a10b1b27198a74ca2a3` | README states MIT; upstream ships no `LICENSE` file | Whole repository |
| `apple-design/` | [dickwu/apple-design-skill](https://github.com/dickwu/apple-design-skill) | `39ea3fbab3011e0798c076dbeabf4917001499da` | No `LICENSE` file; README says the skill is provided as-is and the HIG text belongs to Apple Inc. | Whole repository except `references/hig/siri.md` (see below) |
| `macos-menubar-app-development/` | [zhutao100/macos-menubar-app-dev-skill](https://github.com/zhutao100/macos-menubar-app-dev-skill) | `c2a7ff7b9c08d3c0c803f55ee872c2ba2ec53df4` | **Blocked** — MIT with Anthropic-related restrictions | Not vendored; see `BLOCKED.md` |
| `macos-gui-app-design/` | [zhutao100/macos-gui-app-design-skill](https://github.com/zhutao100/macos-gui-app-design-skill) | `bef171cc079a955093827b16875de8814f387ab1` | **Blocked** — MIT with Anthropic-related restrictions | Not vendored; see `BLOCKED.md` |

`apple-menubar-monitor/` is authored in this repository and is not vendored.

## Exclusions

- `apple-design/references/hig/siri.md` is omitted. Its wake-phrase table contains CJK text, and this repository's language policy forbids adding Chinese characters in Remex Meter commits. Siri guidance does not apply to a menu-bar meter. Links to `siri.md` from other HIG pages are therefore dangling.

## Licensing follow-up

The two unlicensed or README-only-licensed skills (`macos-design`, `apple-design`) and the two blocked skills need a maintainer decision before any release that ships this directory. The tracking issue is linked from `AGENTS.md`.
