# Vendored agent skills

Skills in this directory are copied verbatim from their upstream repositories with `git archive` at the pinned commit, not rewritten. Update a vendored skill by re-archiving a newer upstream commit and changing the pin here in the same commit; do not hand-edit vendored files.

| Local path | Upstream | Pinned commit | License status | Contents |
|---|---|---|---|---|
| `macos-design/` | [ceorkm/macos-design-skill](https://github.com/ceorkm/macos-design-skill) | `8f528a2364f996cd42f02a10b1b27198a74ca2a3` | README states MIT; upstream ships no `LICENSE` file | Whole repository |
| `apple-design/` | [dickwu/apple-design-skill](https://github.com/dickwu/apple-design-skill) | `39ea3fbab3011e0798c076dbeabf4917001499da` | No `LICENSE` file; README says the skill is provided as-is and the HIG text belongs to Apple Inc. | Whole repository except `references/hig/siri.md` (see below) |
| `macos-menubar-app-development/` | [zhutao100/macos-menubar-app-dev-skill](https://github.com/zhutao100/macos-menubar-app-dev-skill) | `c2a7ff7b9c08d3c0c803f55ee872c2ba2ec53df4` | "MIT License with Anthropic-Related Restrictions"; restrictions waived by the repository owner (see below) | Upstream `macos-menubar-app-development/` skill directory, plus the root `LICENSE` and `README.md` |
| `macos-gui-app-design/` | [zhutao100/macos-gui-app-design-skill](https://github.com/zhutao100/macos-gui-app-design-skill) | `bef171cc079a955093827b16875de8814f387ab1` | "MIT License with Anthropic-Related Restrictions"; restrictions waived by the repository owner (see below) | Upstream `macos-gui-app-design/` skill directory, plus the root `LICENSE` and `README.md` |

`apple-menubar-monitor/` is authored in this repository and is not vendored.

For the two zhutao100 skills, the upstream repository root also holds `AGENTS.md`, `.githooks/` and `.pre-commit-config.yaml` for maintaining the skill repository itself; they are not copied. Re-vendor with:

```bash
git -C <upstream-clone> archive <sha> <skill-dir> LICENSE README.md | tar -x -C <tmp>
# then copy <tmp>/<skill-dir>/. and <tmp>/{LICENSE,README.md} into .agents/skills/<skill-dir>/
```

## Exclusions

- `apple-design/references/hig/siri.md` is omitted. Its wake-phrase table contains CJK text, and this repository's language policy forbids adding Chinese characters in Remex Meter commits. Siri guidance does not apply to a menu-bar meter. Links to `siri.md` from other HIG pages are therefore dangling.

## Licensing

- **zhutao100 skills.** Both ship "MIT License with Anthropic-Related Restrictions" (commercial use needs written permission; no grant to Anthropic or parties commercially related to it; no use in software that interfaces with Anthropic APIs or models). On 2026-09-25 the repository owner decided to disregard these restrictions for this repository and to vendor and require both skills ([issue #2](https://github.com/remexstudio/remex-meter/issues/2)). The upstream `LICENSE` is kept verbatim next to each skill for attribution. The waiver is the owner's decision; it is not a grant from the upstream author.
- **`macos-design`, `apple-design`.** No `LICENSE` file upstream; confirm with the authors or remove them before any public release that ships `.agents/`.
