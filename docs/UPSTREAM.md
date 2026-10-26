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

- The upstream English README moved verbatim to `docs/upstream/README.upstream.md`; the README-backed guard tests (`tests/docs/readmeConsistency.test.js`, `tests/shared/clientTracking.test.js` until Phase 1, `tests/electron/limitProviderPresentation.test.js`, `tests/electron/thirdPartySettings.test.js`, `tests/electron/openrouterSettings.test.js`) read it from there. The localized upstream READMEs (`README.zh-CN.md`, `README.zh-TW.md`, `README.ja.md`, `README.ko.md`) stay at the root untouched; their language links now point at the Remex Meter README.
- `AGENTS.md` gained the Remex Meter rules on top; the upstream guide below them is unchanged.
- `.gitignore` tracks `.agents/skills/`; `eslint.config.js` ignores `.agents/**`.

Nothing under `src/`, `native/`, `worker/` or `scripts/` changed.

## Phase 1 decisions

Phase 1 ([issue #3](https://github.com/remexstudio/remex-meter/issues/3)) renamed the identity and slimmed the platform. What changed in inherited files, and what deliberately did not:

| Surface | Decision |
|---|---|
| `package.json` `name` / `productName` / `build.productName` / `appId` | `remex-meter` / `Remex Meter` / `studio.remex.meter`. `repository`, `homepage`, `bugs` and `build.publish` point at `remexstudio/remex-meter`. |
| `APP_NAME` and `userData` | `APP_NAME` comes from `src/electron/appIdentity.js` (`Remex Meter`). `app.setName()` therefore moves `userData` and the shared data dir (`sharedDataDir()`) to `~/Library/Application Support/Remex Meter`. **No migration**: Remex Meter is a new product and starts with fresh settings, credentials and history. An upstream `Token Monitor` directory on the same Mac is ignored, not read or deleted. |
| Updater | `GITHUB_REPO` in `src/shared/appUpdater.js` is `remexstudio/remex-meter`; the `openExternal` allowlist admits only `github.com/remexstudio/remex-meter/…` (the `javis-ai.com` entry is gone). Until Remex Meter publishes a release the check finds nothing, so no upstream build can ever be offered. The release pipeline itself is [issue #5](https://github.com/remexstudio/remex-meter/issues/5). |
| Outbound `User-Agent` / `Referer` | `remex-meter/<version> (+https://github.com/remexstudio/remex-meter)` (and `RemexMeter/…` where upstream used the CamelCase form). OpenRouter's `X-OpenRouter-Title` is `Remex Meter`. |
| Widget identifiers | Defaults for the App Group, widget bundle id and widget kind are `group.studio.remex.meter`, `studio.remex.meter.widget` and `studio.remex.meter.dashboard`. The Xcode target, scheme and Swift types keep the `TokenMonitorWidget` names until the widget is restyled ([issue #5](https://github.com/remexstudio/remex-meter/issues/5)). |
| `TOKEN_MONITOR_*` env vars, settings keys, CLI flags | **Kept as internal names.** They are read by the agent, Hub, Worker, packaging scripts, CI and tests; renaming them would be a breaking change across all of those for no user-visible benefit. They are not shown in the Remex Meter UI. |
| Hub headers (`x-token-monitor-*`), export file names (`token-monitor-*.json/csv`), widget URL scheme, renderer globals (`window.tokenMonitor`, `TokenMonitor*` UMD names), tray/asset file names | Kept as internal compatibility names for the same reason. The export `meta.app.name` is `remex-meter`. |
| Default locale | Fresh installs store `language: 'en'`. The inherited translations stay; `auto` (follow the system) is still selectable. |
| Platform | electron-builder packages only an arm64 DMG and zip (`Remex-Meter-${version}-arm64.{dmg,zip}`). The Windows/Linux builder sections, `dist:win*` / `dist:linux` / `*:x64` scripts, SignPath and NSIS files, the tag release workflow, GitHub Pages deploy, star-history job and `FUNDING.yml` were removed. Windows/Linux branches inside app code are untouched. `site/` is inherited and no longer deployed. |
| Tools | `CLIENT_CATALOG` and `LIMIT_PROVIDER_CATALOG` lead with the six tools; the rest are `defaultTracked: false` / `defaultEnabled: false` (see `docs/PROVIDERS.md`). The first-run limits seed enables the six instead of only detected providers. |
| Menu bar | On macOS the status item opens the Meter popover (`src/electron/meterPopover.js`); the inherited widget window is the Settings/details window and macOS fresh installs start in tray mode (no window, no Dock icon). See `docs/UI.md`. |

## Runtime boundaries

| Runtime | Entry | Remex Meter use |
|---|---|---|
| Electron app ("widget" upstream) | `src/electron/main.js` | The product. Owns the tray/menu bar, windows, settings, credentials and IPC. |
| Headless agent | `src/agent/agent.js` | Inherited, not a product surface. Useful for dry runs (`npm run agent:once -- --dry-run`). |
| Node Hub | `src/hub/server.js` | Inherited multi-device sync. Not in the v1 product; its fate is [issue #5](https://github.com/remexstudio/remex-meter/issues/5) (tests and `src/shared/` depend on it). |
| Cloudflare Worker Hub | `worker/` | Same as the Node Hub. `worker/` cannot import above itself; its `src/shared/` copies are generated by `npm run sync:worker`. |
| Native WidgetKit extension | `native/macos/` | Optional. Built only by `pack:mac:widget` / `dist:mac:widget*`. Reads the App Group snapshot; never collects data itself. |

All runtimes share `src/shared/`. Settings keys, env vars (`TOKEN_MONITOR_*`), CLI flags, Hub endpoints and the device wire shape are compatibility surfaces upstream; Remex Meter keeps them as internal names (see Phase 1 decisions).

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
- `LIMIT_PROVIDER_CATALOG` (`src/shared/limits/providers.js`): limits-provider identity, fresh-install order, `label` / `settingsLabel`. Part of the portable Hub core: adding, reordering or renaming a provider moves the Hub build marker (`npm run update:hub-build`).
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

- **Usage:** tracked client `grok` (label "Grok Build"), parsed by tokscale from `~/.grok/sessions` and `~/.grok/logs/unified.jsonl` (`GROK_HOME` overrides the root).
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
