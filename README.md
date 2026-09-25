# Remex Meter

A local-first macOS menu-bar meter for AI coding tool usage, cost and plan limits. Built by Remex Studio.

> **Status: Phase 1.** The app builds as Remex Meter for macOS on Apple Silicon, enables the six tools below and opens a native Meter popover from the menu bar ([issue #3](https://github.com/remexstudio/remex-meter/issues/3)). Cursor and Grok pool modules from real provider windows are Phase 2 ([issue #4](https://github.com/remexstudio/remex-meter/issues/4)).

## What it is

Remex Meter lives in the macOS menu bar as **Meter**. Clicking it opens a compact, native popover that shows, for each enabled tool, today's token usage and cost plus the plan limits the provider reports — each quota pool as its own meter, with its reset time.

Enabled tools, in default order:

1. Cursor
2. Grok
3. Claude Code
4. Codex
5. OpenCode
6. DeepSeek

Platform: macOS on Apple Silicon.

Principles:

- **Local-first.** Usage is read from each tool's local logs by [tokscale](https://github.com/junhoyeo/tokscale); nothing leaves the machine except the provider quota requests you enable.
- **Limits are not usage.** Token counts and plan quotas are separate facts from separate sources.
- **Unavailable is not zero.** If a provider does not report a number, Meter says so instead of drawing an empty bar.
- **No invented numbers.** Pools are never summed or synthesized; see [`docs/POOLS.md`](docs/POOLS.md).
- **Native.** Real macOS vibrancy, system typography, SF Symbols and full accessibility support.

## Documentation

| Document | Contents |
|---|---|
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Product definition, scope, the six tools and the visual system |
| [`docs/POOLS.md`](docs/POOLS.md) | Cursor and Grok quota pools and why they are never combined |
| [`docs/PROVIDERS.md`](docs/PROVIDERS.md) | The six tools mapped to upstream client and limits-provider ids |
| [`docs/UI.md`](docs/UI.md) | Menu bar extra, popover, settings and widget design |
| [`docs/UPSTREAM.md`](docs/UPSTREAM.md) | What was imported from upstream and the boundaries Remex Meter relies on |
| [`AGENTS.md`](AGENTS.md) | Rules for coding agents and contributors |

The inherited upstream engineering documents (`docs/architecture.md`, `docs/providers/`, `docs/API.md`, `docs/configuration.md` and others) remain authoritative for the data plane. The upstream English README is preserved at [`docs/upstream/README.upstream.md`](docs/upstream/README.upstream.md); the localized upstream READMEs at the repository root are inherited as-is.

## Development

Requires Node.js 22.15 or newer.

```bash
npm ci
npm run verify   # lint + tests
npm start        # launch the Electron app (downloads the pinned tokscale binary on first run)
```

## License and attribution

MIT — see [`LICENSE`](LICENSE). The data plane is adapted from [Javis603/token-monitor](https://github.com/Javis603/token-monitor) by Javis, MIT-licensed; its commit history is preserved in this repository. See [`NOTICE`](NOTICE).
