# Upstream baseline

Remex Meter's data plane is adapted from [Javis603/token-monitor](https://github.com/Javis603/token-monitor) (MIT, Copyright (c) 2026 Javis). This document records what was imported, how, and which upstream boundaries Remex Meter relies on. It was written after reading `AGENTS.md` (inherited section), `docs/architecture.md`, `docs/providers/README.md`, `docs/providers/cursor.md`, the Grok and Cursor limits modules, the two catalogs, `src/electron/macWidget/` and `native/macos/`. When this document and the inherited engineering docs disagree about the data plane, the inherited docs and the code win; fix this file.

## Import

| | |
|---|---|
| Upstream | `https://github.com/Javis603/token-monitor`, branch `main` |
| Imported commit | `5a68741d31d762f86214185762f03ab671859e9b` — "refactor(limits): move DeepSeek and MiniMax onto the generic account panel (#802)" |
| Upstream version | `0.62.0` (`package.json`) |
| Method | `git merge --allow-unrelated-histories` of `upstream/main` into this repository. All upstream commits are reachable from `main`; `git log --first-parent` shows only Remex Meter commits. |
| License | Upstream `LICENSE` kept verbatim at the root. Attribution in `NOTICE`. |

Phase 0 changes to inherited files:

- The upstream English README moved verbatim to `docs/upstream/README.upstream.md`; the README-backed guard tests (`tests/docs/readmeConsistency.test.js`, `tests/shared/clientTracking.test.js`, `tests/electron/limitProviderPresentation.test.js`, `tests/electron/thirdPartySettings.test.js`, `tests/electron/openrouterSettings.test.js`) read it from there. The localized upstream READMEs (`README.zh-CN.md`, `README.zh-TW.md`, `README.ja.md`, `README.ko.md`) stay at the root untouched; their language links now point at the Remex Meter README.
- `AGENTS.md` gained the Remex Meter rules on top; the upstream guide below them is unchanged.
- `.gitignore` tracks `.agents/skills/`; `eslint.config.js` ignores `.agents/**`.

Nothing under `src/`, `native/`, `worker/` or `scripts/` changed in Phase 0.

## Phase 1 changes

Phase 1 ([issue #3](https://github.com/remexstudio/remex-meter/issues/3)) moved the identity, the platform, the enabled tools and the menu-bar shell. These are the decisions an upstream merge has to respect.

### Identity

| Surface | Remex Meter value |
|---|---|
| `package.json` `name` / `productName` / `build.productName` | `remex-meter` / Remex Meter / Remex Meter |
| `build.appId` | `studio.remex.meter` |
| mac `artifactName` | `Remex-Meter-${version}-arm64.${ext}` (DMG and the updater zip) |
| `repository` / `homepage` / `bugs` / `build.publish` | `remexstudio/remex-meter` |
| `APP_NAME` (`src/electron/main.js`) and `sharedDataDir()` | Remex Meter |
| About panel | `app.setAboutPanelOptions()`: Remex Meter · Remex Studio |
| Widget defaults | App Group `group.studio.remex.meter`, widget bundle id `studio.remex.meter.widget`, widget kind `studio.remex.meter.dashboard` |

- **Fresh `userData`.** `app.setName(APP_NAME)` now resolves `~/Library/Application Support/Remex Meter`. Nothing is migrated from the upstream `Token Monitor` directory: this is a clean product, so settings, credentials and archives start empty.
- **Updater.** `src/shared/appUpdater.js` and `build.publish` point at `remexstudio/remex-meter`. There are no releases there yet, so a check currently ends in an update-check error (GitHub answers the latest-release route with 406); it can never offer an upstream Token Monitor release. A Remex Meter release pipeline is future work.
- **Outbound identity.** Provider `User-Agent`, OpenRouter `HTTP-Referer` / `X-OpenRouter-Title`, the Codex app-server `clientInfo`, the service-status and Codex reset-forecast agents, the tokscale updater and Discord Rich Presence name Remex Meter and link `remexstudio/remex-meter`. The `openExternal` allowlist admits `github.com/remexstudio/remex-meter` and no longer admits the upstream repository or website.
- **Inherited translations.** The English table was renamed in place. The zh-TW, zh-CN, ko and ja tables are kept verbatim (no new Chinese in Remex Meter commits); `translate()` substitutes the product name at lookup time. The default `language` setting is `en`, so a Chinese system no longer selects the inherited Chinese UI.

### Internal names that stay

These are compatibility or build-internal names, not product names. Renaming them buys nothing for users and would break external callers or the native build:

- `TOKEN_MONITOR_*` environment variables (runtime, packaging and widget build inputs) and every settings key.
- The Hub wire surface: `x-token-monitor-*` headers, endpoints and the device record.
- The preload bridge `window.tokenMonitor` and the `TokenMonitor*` renderer globals.
- The Xcode project, target and scheme `TokenMonitorWidget`, the `TokenMonitorWidgetReloader` helper and the `token-monitor-widget.json` resource. The bundle identifiers above are what macOS sees.
- Export file names (`token-monitor-export.json` and the CSVs) and temporary-directory prefixes.
- The pinned tokscale fork release (`Javis603/tokscale`, `scripts/vendor/tokscale.json`), which is a real upstream dependency.

### Platform

macOS on Apple Silicon is the only packaged target. The Windows, Linux and Intel scripts and electron-builder sections were removed, together with the upstream `release.yml`, `pages.yml`, `star-history.yml`, `FUNDING.yml`, SignPath and NSIS assets and the release-only helper scripts. `ci.yml` keeps Node coverage on Linux and macOS and the arm64 widget build; `vendor-tokscale.yml` runs on macOS arm64. Windows and Linux branches in `src/` are left in place until a later phase removes them. A Remex Meter release workflow is future work.

### Six tools

`CLIENT_CATALOG` and `LIMIT_PROVIDER_CATALOG` lead with Cursor, Grok, Claude Code, Codex, OpenCode and DeepSeek (`dsh` → `deepseek`). Every other inherited adapter stays wired and selectable in Settings but carries `defaultTracked: false` / `defaultEnabled: false`, so a fresh install scans and probes only the six (`DEFAULT_CLIENT_IDS`, `DEFAULT_LIMIT_PROVIDER_IDS`). The first-run limits seed still narrows to the detected subset of those six. The hand-wired registration tables were reordered to the new catalog order, as `docs/providers/README.md` requires, and the partition-invariant tests are unchanged.

### Menu bar shell

On macOS the tray click opens the Meter popover (`src/electron/meterPopover.js`, renderer in `src/electron/renderer/meter/`) instead of the inherited widget window. Fresh installs default to `trayMode: true` so that window stays hidden until Settings opens it. The popover reuses the existing preload bridge and the existing `stats:push`, `settings:push` and `window:*` channels; it adds `settings:open`, `app:quit` and `window:preferredHeight` sends within those families. See `docs/UI.md`.

## Runtime boundaries

| Runtime | Entry | Remex Meter use |
|---|---|---|
| Electron app ("widget" upstream) | `src/electron/main.js` | The product. Owns the tray/menu bar, windows, settings, credentials and IPC. |
| Headless agent | `src/agent/agent.js` | Inherited, not a product surface. Useful for dry runs (`npm run agent:once -- --dry-run`). |
| Node Hub | `src/hub/server.js` | Inherited multi-device sync. Not in the v1 product; do not delete in Phase 0–1 (tests and `src/shared/` depend on it). |
| Cloudflare Worker Hub | `worker/` | Same as the Node Hub. `worker/` cannot import above itself; its `src/shared/` copies are generated by `npm run sync:worker`. |
| Native WidgetKit extension | `native/macos/` | Optional. Built only by `pack:mac:widget` / `dist:mac:widget*`. Reads the App Group snapshot; never collects data itself. |

All runtimes share `src/shared/`. Settings keys, env vars (`TOKEN_MONITOR_*`), CLI flags, Hub endpoints and the device wire shape are compatibility surfaces upstream; Remex Meter keeps them as internal names (see Phase 1 changes above).

## Usage plane: tokscale

- `src/shared/collector.js` owns every tokscale scan. The binary is a pinned fork build described in `scripts/vendor/tokscale.json` (upstream `junhoyeo/tokscale`, fork and release assets from `Javis603/tokscale`). Only app, agent and packaging entry points run `ensure:tokscale`; install, lint, test and verify never download it.
- Full ticks scan today / month / all-time **serially**; file-watch ticks scan `--today` for the changed clients only and apply an exact delta (`applyPeriodDelta()`). Do not parallelise scans or approximate the delta.
- No cooldown on top of the watch debounce (3–5 s updates). The self-synced tokscale cache dirs (Cursor, Antigravity) are not watched.
- `src/shared/usage.js` extracts tokscale JSON defensively and owns `normalizeClientName()`.

### Client ids are partition keys

A tracked-client id is both the key a changed path maps to (`clientWatchCandidates()`) and the key tokscale rows land under (`normalizeClientName()`). Upstream enforces, in `tests/shared/clientPartitionInvariants.test.js`:

1. every id is a fixed point of `normalizeClientName()`;
2. every tokscale alias normalizes back to its parent and is expanded by `tokscaleClientFilter()`;
3. the filter never emits `synthetic`.

Breaking 1 or 2 zeroes a client's partition on watch ticks; breaking 3 silently turns targeted scans into full scans. Slimming to six tools must go through the catalog and keep these tests green.

## Limits plane

- `src/shared/deviceRuntime.js` runs `UsageRuntime` and `LimitsRuntime` independently. Local token usage never triggers a limits refresh; a credential change refreshes only that provider's lane (Cursor additionally forces one targeted usage sync).
- Dispatch: `src/shared/limits/collector.js` → static registry `src/shared/limits/registry.js` → `registerProvider(...)` lines in `src/shared/limits/accounts.js`, each pairing a require-free `src/shared/providers/<id>/account.js` with a lazily loaded `limits.js` exporting `fetchLimits`.
- Normalization: `src/shared/limits/core.js` (`normalizeLimitProvider`, `normalizeLimitWindow`). Provider status is one of `ok`, `disabled`, `notConfigured`, `unauthorized`, `rateLimited`, `sourceRateLimited`, `unavailable`, `error`. A window's `usedPercent` may be `null`; `remainingPercent` is then `null` too.
- Money windows are marked `metric: 'credits'` (balance) or `'spend'`; display goes through `src/shared/limits/balanceDisplay.js`, never a provider whitelist.
- Transport: providers take the injected transport (`src/electron/limits/fetch.js`: Electron `net.fetch`, or `outboundFetch` when a proxy env is set). Under Chromium never set `Host`, keep `credentials: 'omit'`. Cursor's probe uses `node:https` directly (see below).
- Credentials stay in the main process. Renderer settings are default-deny; fixed credentials declare a `storePath` in `account.js`.

### Limits are not usage

Usage (tokens, cost) comes from tokscale scans of local logs. Limits come from provider accounts. They meet only in presentation. `limitProviderForClient()` in `src/shared/limits/providers.js` maps a tracked-client id to its limits provider (`dsh` → `deepseek`, `droid` → `factory`, `zcode` → `zai`, `qodercn` → `qoder`; others are identity). Remex Meter never derives a quota from token counts or vice versa.

## Catalogs and provider registration

- `CLIENT_CATALOG` (`src/shared/clientCatalog.js`): tracked-client identity and display order (id, label, `defaultTracked`, `locallyParsed`). UMD, loaded by the renderer as a script and by Node via `require`.
- `LIMIT_PROVIDER_CATALOG` (`src/shared/limits/providers.js`): limits-provider identity, fresh-install order, `label` / `settingsLabel`, `defaultEnabled`. Part of the portable Hub core: adding, reordering or renaming a provider moves the Hub build marker (`npm run update:hub-build`).
- `VENDOR_PRESENTATION` (`src/shared/vendorPresentation.js`): brand colour and artwork per id; the macOS widget reads names, colours and artwork from its snapshot.
- The full touch-point checklists for adding or renaming a client or provider are in `docs/providers/README.md`. Follow them; do not hand-roll a Remex Meter registry.

## Cursor sources

Reference: `docs/providers/cursor.md`, `src/shared/providers/cursor/{limits,probe,auth,selfSync}.js`.

- **Usage:** self-synced. The collector hands its `SelfSyncThrottle` and tokscale resolver to `createCursorSelfSync()`, which syncs Cursor's server-side usage into tokscale's cache; tokscale then counts it. The generated cache is not watched.
- **Accounts:** one managed list (desktop-discovered access token plus manually added session tokens), shared by self-sync and limits. Every enabled account is probed independently; identity prefers the canonical API subject.
- **Limits:** `probe()` sends the `WorkosCursorSessionToken` cookie over `node:https` to `cursor.com/api/usage-summary` and `cursor.com/api/auth/me`, then `cursor.com/api/usage?user=<sub>` for legacy request plans, plus a best-effort `POST cursor.com/api/dashboard/get-sand-usage-status` (5 s cap) for the Grok Bot allowance. `fetchCursorAccountLimits()` then emits, in order:
  - `Requests` (legacy request plans), **or** `Cursor Models` (`plan.autoPercentUsed`) and `Other Models` (`plan.apiPercentUsed`) as separate windows, **or** `Overall` (only when the summary carries an `overall` block);
  - `Grok Bot` (weekly) when the account has a non-zero included limit;
  - `Team pool` when team pooled usage is present;
  - `On-demand spend` (`metric: 'spend'`, no meter).
- Upstream rule, kept: never synthesize an overall total by summing model pools. See `docs/POOLS.md`.

## Grok sources

Reference: `src/shared/providers/grok/limits.js`.

- **Usage:** tracked client `grok` (label "Grok"; upstream calls it "Grok Build"), parsed by tokscale from `~/.grok/sessions` and `~/.grok/logs/unified.jsonl` (`GROK_HOME` overrides the root).
- **Credential precedence:** explicit setting → `GROK_BEARER_TOKEN` env → `~/.grok/auth.json` (OIDC scope preferred, then legacy `/sign-in`, then any keyed entry). No GUI credential field.
- **Limits:** when the credential came from `auth.json`, first the Grok CLI (`grok agent stdio`, JSON-RPC `initialize` then `x.ai/billing`, 5 s timeout); on failure other than unauthorized, the grok.com gRPC-web endpoint `grok_api_v2.GrokBuildBilling/GetGrokCreditsConfig` with the bearer token, with one retry on transient network errors.
- **Shape today:** both paths produce **one** `billing` window from a single credit percentage, labelled `Weekly` / `Monthly` / `Billing` from the period length. There is no Heavy vs Bolt split in the upstream parser. Remex Meter's two Grok pools therefore have no source yet ([issue #4](https://github.com/remexstudio/remex-meter/issues/4)).
- **Zero fallback to review:** `parseGrokGrpcWebBilling()` returns `0` when the payload carries a usage period but no percent field (`noUsageYet`). That conflicts with "unavailable is not zero" unless the payload is proven to mean zero usage; tracked in issue #4.

## Native widget

- `src/electron/macWidget/` builds the App Group snapshot (`src/shared/macWidgetSnapshot.js`, schema v10), writes it atomically (`bridge.js`), coalesces writes (`snapshotController.js`), and asks WidgetKit to reload (`reloader.js`). It is gated by `TOKEN_MONITOR_WIDGET_ENABLED` at build time.
- `native/macos/TokenMonitorWidget/` is a WidgetKit extension (Small / Medium / Large families) that decodes the snapshot and keeps showing the last valid one with explicit missing/stale states. It has no status item and does not trigger usage or limits collection.
- Identifiers (App Group, widget bundle id, widget kind) come from env at build time; committed defaults are placeholders. See `native/macos/README.md`.

## Syncing later upstream changes

1. `git fetch upstream main` (remote `https://github.com/Javis603/token-monitor.git`).
2. Merge into a feature branch; resolve conflicts in favour of upstream for data-plane files unless a Remex Meter doc names the divergence.
3. Keep inherited Chinese text as upstream has it.
4. Run `npm run verify`, `npm run sync:worker` (no drift) and, if the Hub core moved, `npm run update:hub-build`.
5. Update this document's imported commit and any boundary that moved.
