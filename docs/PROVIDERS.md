# Providers

Remex Meter enables six tools. Each is an existing upstream tracked client (usage) and limits provider (quota); Remex Meter adds no new provider code in v1. This page maps each tool to its upstream ids and sources. The per-provider notes in `docs/providers/` and the code are authoritative; this page only routes to them.

| Order | Tool | Tracked client id (usage) | Limits provider id | Upstream note |
|---|---|---|---|---|
| 1 | Cursor | `cursor` | `cursor` | `docs/providers/cursor.md` |
| 2 | Grok | `grok` | `grok` | none; see `src/shared/providers/grok/limits.js` |
| 3 | Claude Code | `claude` | `claude` (label "Claude", settings label "Claude Code") | `docs/providers/claude.md` |
| 4 | Codex | `codex` | `codex` | `docs/providers/codex.md` |
| 5 | OpenCode | `opencode` | `opencode` | `docs/providers/opencode.md` |
| 6 | DeepSeek | `dsh` | `deepseek` | `docs/providers/dsh.md` (usage); `src/shared/providers/deepseek/` (limits) |

The client → provider mapping is `limitProviderForClient()` in `src/shared/limits/providers.js`; `dsh` → `deepseek` is one of its explicit exceptions. Labels in the Remex Meter UI come from the catalogs. Phase 1 renamed the upstream client labels "Grok Build" and "DeepSeek Harness" to Grok and DeepSeek; `tests/docs/remexMeterTools.test.js` pins this table against the catalogs.

## Sources at a glance

| Tool | Usage source | Limits source |
|---|---|---|
| Cursor | tokscale over a self-synced Cursor cache (`createCursorSelfSync()`) | `cursor.com` dashboard APIs with the account's session cookie; see `docs/UPSTREAM.md` → Cursor sources |
| Grok | tokscale over `~/.grok/sessions` and `~/.grok/logs/unified.jsonl` | Grok CLI `x.ai/billing` RPC, falling back to grok.com gRPC-web billing; credential from `~/.grok/auth.json` or `GROK_BEARER_TOKEN` |
| Claude Code | tokscale over Claude Code transcripts | Claude Web `sessionKey` if configured, else Claude Code OAuth (env/file/Keychain), else the Claude CLI usage screen as a fallback |
| Codex | tokscale over Codex rollouts | ChatGPT/Codex backend with the current `auth.json`; app-server RPC as fallback; managed workspaces |
| OpenCode | tokscale over OpenCode sessions | OpenCode Go quota via API, then Web; optional local estimates |
| DeepSeek | tokscale over DeepSeek Harness transcripts | DeepSeek API key → account balance (`metric: 'credits'`, a money amount, not a meter) |

## Remex Meter constraints on these providers

- **Limits are not usage.** OpenCode's optional *local estimates* derive quota from the local usage ledger. Remex Meter keeps them off by default; if they are ever shown, they are labelled as estimates and never presented as the provider's number.
- **DeepSeek is a balance.** Render it through `src/shared/limits/balanceDisplay.js` as an amount with currency. Do not draw a percentage meter for it.
- **Claude and Codex windows** (session / weekly / model-specific) are separate windows from the provider; show each as its own meter under the same rules as `docs/POOLS.md`.
- **Cursor and Grok pools** are specified in `docs/POOLS.md`.
- **Unavailable is not zero** for every provider: a non-`ok` status renders as a state.

## Enabling and disabling

The six lead `CLIENT_CATALOG` and `LIMIT_PROVIDER_CATALOG` in this order. Every other inherited adapter is `defaultTracked: false` (clients) or `defaultEnabled: false` (limits providers): still wired, still selectable in Settings, off on a fresh install. Saved selections are never rewritten. Do not add a second allowlist beside the catalogs.
