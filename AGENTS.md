# AGENTS.md

Entry point for every coding agent working on **Remex Meter** (`remexstudio/remex-meter`), a local-first macOS menu-bar meter for AI coding tool usage and plan limits. The data plane is adapted from [Javis603/token-monitor](https://github.com/Javis603/token-monitor) (MIT, see `NOTICE`). This file is loaded automatically; the documents it routes to are not.

The Remex Meter rules below come first. The engineering guide after them is inherited from upstream and still binding for the data plane.

## Required skills

Load these from `.agents/skills/` **before** any change to the menu bar extra, the tray popover, quota modules, native materials/vibrancy, settings UI, app icons, SF Symbols or the Swift widget:

1. `apple-menubar-monitor` — Remex Meter's house guide for the menu bar, popover, pools, symbols and accessibility.
2. `macos-design` — native macOS layout, interaction and visual design.
3. `macos-menubar-app-development` — **currently blocked and not vendored** because of its license (see `.agents/skills/macos-menubar-app-development/BLOCKED.md` and [issue #2](https://github.com/remexstudio/remex-meter/issues/2)). Do not fetch or install it into this repository. Until the issue is resolved, items 1 and 2 are the required set.

Load `apple-design` as well for design reviews and accessibility audits. `macos-gui-app-design` is blocked for the same reason as item 3. Vendored skill pins and license status are in `.agents/skills/VENDORED.md`; never hand-edit vendored skill files.

## Names

Use exactly these names. Do not invent alternatives.

| Thing | Value |
|---|---|
| Product | Remex Meter |
| Repository | `remexstudio/remex-meter` |
| Electron `productName` | Remex Meter |
| Menu bar extra label | Meter |
| Bundle id | `studio.remex.meter` |
| DMG | `Remex-Meter-${version}-arm64.dmg` |
| About | Remex Meter · Remex Studio |

Never use "Token Monitor", "Remex Monitor", "remex-monitor", "token-monitor", "AI Usage" or "Quota App" as a product, repository, bundle or UI name. "Token Monitor" / `Javis603/token-monitor` may appear only as upstream attribution. The inherited code still carries upstream names (package metadata, `APP_NAME`, `TOKEN_MONITOR_*` env vars, `TokenMonitorWidget`); they are renamed deliberately in Phase 1 ([issue #3](https://github.com/remexstudio/remex-meter/issues/3)), not piecemeal.

## Language

- Everything **we** author is English: files, code comments, docs, UI strings, commit messages, issues, PRs and briefs.
- Inherited Chinese text from upstream (localized READMEs, i18n tables, comments) stays untouched unless that exact line must change for behaviour. Do not mass-translate or delete it.
- The default app locale is English. Do not add new Chinese (or other) localizations in v1.
- A Remex Meter commit must not add Chinese characters. Check before committing: `git diff --cached | grep -P '^\+.*[\p{Han}]'` must print nothing.

## Product invariants

Details and rationale are in `docs/PRODUCT.md`, `docs/POOLS.md`, `docs/UPSTREAM.md` and `docs/UI.md`.

- **Client ids are partition keys.** Keep the upstream partition invariants (below and in `docs/providers/README.md`).
- **Limits are not usage.** Token/cost usage comes from tokscale; plan limits come from the provider registry. Never derive one from the other.
- **Unavailable is not zero.** A missing window or a non-`ok` provider status renders as a state, never as `0%`.
- **Pools stay separate.** Grok Heavy Weekly and Grok Bolt Weekly are never summed; Cursor Mode Pool and Cursor Other Modes are never merged into one bar.
- **No invented numbers.** Never display a quota percentage the provider did not return.
- **Catalog-driven UI.** Tools, order, labels and marks come from `CLIENT_CATALOG`, `LIMIT_PROVIDER_CATALOG` and `VENDOR_PRESENTATION`; no provider-specific markup.
- **Real vibrancy.** Native material first; CSS blur only as a fallback.
- **macOS Apple Silicon only.** Do not enable Windows or Linux builds or add new branches for them.
- **Six tools.** Cursor, Grok, Claude Code, Codex, OpenCode, DeepSeek — enabled in Phase 1. Until then the inherited tool list is unchanged.
- **No new data architecture.** Adapt tokscale, the limits runtime and the provider registry; do not add a parallel collector, store or IPC family.

## Remex Meter documents

| Changing… | Read first |
|---|---|
| anything user-facing, scope or defaults | `docs/PRODUCT.md` |
| Cursor or Grok quota windows, or any meter that could be summed | `docs/POOLS.md` |
| which upstream module owns what; merging upstream changes | `docs/UPSTREAM.md` |
| the six enabled tools and their ids | `docs/PROVIDERS.md` |
| the menu bar extra, popover, settings or widget visuals | `docs/UI.md` and the required skills above |

The phase plan is tracked in GitHub issues labelled `P0`, `P1` and `P2`.

---

# Engineering guide (inherited)

## Commands

```bash
npm start          # launch the Electron widget (= npm run widget / npm run dev)
npm run hub        # start the Node hub on port 17321
npm run agent      # start the headless collector→hub agent
npm run agent:once # one-shot collect+post, then exit (useful for cron/launchd)
npm test           # run the node:test suite (node --test "tests/**/*.test.js")
npm run lint       # ESLint flat config (eslint.config.js)
npm run verify     # lint + test (single local entry point)
```

Automated verification is `npm run verify`; CI (`.github/workflows/ci.yml`) runs lint + test on push/PR across Node 22 & 24. The toolchain (ESLint 10 + the node:test glob) needs Node 22.13+ and DSH session decoding needs `zlib.zstdDecompressSync` (Node 22.15+), which is why `engines.node` is `>=22.15.0`.

To dry-run the agent without posting: `npm run agent:once -- --dry-run`.

## Where guidance lives

| Changing… | Read first |
|---|---|
| a boundary shared by the widget, agent, Hub or Worker; the collector, limits runtime, credentials or wire record | `docs/architecture.md` |
| anything under `src/shared/providers/<id>/` or `src/electron/providers/<id>/` | `docs/providers/README.md`, then the note whose `ids:` front matter lists that id if one exists — `grep -lE '^ids:.*[[, ]<id>[],]' docs/providers/*.md`. Most providers have no note; the README and the code/tests are then authoritative |
| adding or renaming a tracked client or limits provider | `docs/providers/README.md` (both registration checklists) |
| the device wire shape or Hub endpoints | `docs/API.md` |

Update the matching document in the same change when its contract moves, and delete stale claims rather than preserving history.

## Tripwires

Each line is a constraint that a change elsewhere has broken before, or would break silently.

- **Worker isolation.** `worker/` cannot import above itself. Edit `src/shared/`, never the `@generated` copies under `worker/src/shared/`, then run `npm run sync:worker`; CI fails on drift. Modules in that closure stay free of Node built-ins. → `docs/architecture.md` (Entry points)
- **Hub build marker.** Run `npm run update:hub-build` once after the final Hub/shared change; never hand-edit generated Worker metadata. `limits/providers.js` is in the Hub core, so adding, reordering or renaming a limits provider moves the marker too. → `docs/architecture.md` (Generated and registered state)
- **tokscale binary.** Only app, agent and packaging entry points run `ensure:tokscale`; install, hub, lint, test and verify must never download it. → `docs/architecture.md` (Generated and registered state)
- **Serial scans, exact deltas.** Full ticks scan today/month/allTime serially; watch ticks scan `--today` only and apply an exact delta. Do not parallelise the scans or turn the delta into an estimate. → `docs/architecture.md` (Collector pipeline)
- **No watch cooldown.** The product promises 3–5 s updates; a mid-tick watch event re-arms the debounce. Do not add a cooldown, and do not watch the self-synced tokscale cache dirs (they re-trigger forever). → `docs/architecture.md` (Watching)
- **Client ids are partition keys.** Each tracked-client id must be a fixed point of `normalizeClientName()`, every tokscale alias must filter back to its parent, and the filter must never emit `synthetic`. → `docs/providers/README.md` (Partition invariants)
- **Limits refresh triggers.** Local token usage never triggers a limits refresh, and `burn-rate` stays out of `COOLDOWN_BYPASS_REASONS`. → `docs/architecture.md` (Limits collector)
- **Electron transport.** Provider calls take the injected transport. Under Chromium never set a `Host` header, keep `credentials: 'omit'`, and expect a cross-origin `Referer` with a path to be cancelled. → `docs/architecture.md` (Outbound transport)
- **Credentials stay in main.** Renderer settings are default-deny; a raw credential crosses only through an explicit allowlist. New fixed credentials declare a `storePath` in the provider's `account.js` (`CREDENTIAL_SETTING_PATHS` derives from it) — never a literal entry in `credentialStore.js`, never a provider-specific store. Limits account leaves must stay require-free; renderer form DTOs expose display/action metadata, never store paths, resolvers or secrets. → `docs/architecture.md` (Settings and credentials)
- **Public stats stay public.** The subscription version stamp is added by `statsWithSubscriptionVersion()` on authenticated paths only; folding it into `getStats()` leaks through the unauthenticated route. → `docs/architecture.md` (Subscriptions)
- **Balance quotas.** Key money display off `windows[].metric === 'credits'` through `limits/balanceDisplay.js`, never a provider whitelist; display-only percentages stay out of the wire shape. → `docs/architecture.md` (Balance quotas)
- **Compatibility surfaces.** Settings keys, env vars, CLI flags, Hub endpoints and the wire shape have external users. Treat changes as breaking and plan the migration.

## Conventions

- **Consider best practices first.** When picking an approach — library vs hand-roll, pattern vs custom, framework default vs override — start by checking the ecosystem convention, not by optimizing for "fewer deps" or "less code". If a hand-rolled solution is genuinely better, argue that *after* weighing the convention.
- **Don't add dependencies or new tooling without discussing it first** (in the issue or PR description).
- **Keep documentation close to its scope and current.** This file holds cross-cutting commands, tripwires and conventions; subsystem reasoning belongs in `docs/architecture.md` and provider knowledge in `docs/providers/`. Document non-obvious constraints and gotchas, not descriptions the code already makes obvious. Avoid hardcoded counts and exhaustive lists (prefer a command like `ls src/shared/` over a hand-maintained one); verify claims against the code before writing them; delete anything that has gone stale — an outdated note is worse than none.

### Commit messages

Format: `<type>(<scope>): <subject>` — conventional-commit types (`feat` / `fix` / `refactor` / `docs` / `chore` / `perf` / `test` / …), with a scope when the change targets a clear subsystem (`fix(hermes):`, `fix(collector):`, `feat(limits):`); leave it off for cross-cutting or general changes. When a change belongs to a single provider, scope it by that provider (`fix(opencode):`, `fix(codex):`) rather than by the subsystem it happens to live in. Aim for a subject ≤ ~72 chars that describes the actual change. Add a **body** only when the diff doesn't make the *why* obvious — rationale, rejected alternatives, behaviour-preserving notes, linked issues; trivial changes stay single-line. Write body paragraphs as continuous lines, not hard-wrapped.

**Do:**

```
fix(dashboard): balance stat card widths
feat(wsl): scan usage from running WSL distros
docs(i18n): add Japanese README
```

**Don't** — vague subjects, or internal review/agent jargon (`P0`/`P1`, "review findings", "hardening pass"):

```
fix: address P0 review findings   ❌
fix: hardening pass round 2       ❌
fix: various improvements         ❌
```

Never add an AI `Co-Authored-By` trailer. **Do** keep the genuine human `Co-authored-by:` trailer on a multi-author squash (e.g. a maintainer follow-up on a contributor PR) and keep the `(#NN)` PR-number suffix GitHub appends to squash subjects.

### Pull requests

- PR titles follow the commit-message convention above — they become the squash-merge subject.
- In the description: summarize the behaviour change, note the commands you ran (`npm run verify` at minimum), attach screenshots/GIFs for UI changes, and link the related issue.

### Authoring GitHub content via `gh`

Write PR/issue bodies and comments to a file and pass it, rather than inline heredocs: `gh issue comment --body-file <path>`, `gh api -X PATCH … -F body=@<path>`. Inline `--body "$(cat <<EOF … EOF)"` mangles backtick escaping and renders as a literal `` \` `` in GitHub markdown. Same spirit for prose: write paragraphs as continuous lines and let GitHub wrap them — don't hard-wrap at 80 columns.
