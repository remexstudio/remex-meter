# Product

## Definition

**Remex Meter** is a local-first macOS menu-bar utility that shows how much of each AI coding tool you have used and how much of each plan limit remains. It is made by Remex Studio. Repository: `remexstudio/remex-meter`.

| | |
|---|---|
| Product name | Remex Meter |
| Electron `productName` | Remex Meter |
| Menu bar extra | Meter |
| Bundle id | `studio.remex.meter` |
| Distribution | `Remex-Meter-${version}-arm64.dmg` |
| About | Remex Meter · Remex Studio |
| Platform | macOS on Apple Silicon (arm64) only |
| Default locale | English. No other localizations in v1. |

Other names ("Token Monitor", "Remex Monitor", "AI Usage", "Quota App" and variants) are not this product. "Token Monitor" appears only as upstream attribution.

## Enabled tools

Six tools are enabled in v1, in this default order:

| # | Tool | Usage (tokens, cost) | Limits (plan quota) |
|---|---|---|---|
| 1 | Cursor | yes | yes |
| 2 | Grok | yes | yes |
| 3 | Claude Code | yes | yes |
| 4 | Codex | yes | yes |
| 5 | OpenCode | yes | yes |
| 6 | DeepSeek | yes | yes (account balance) |

The order is the fresh-install order; a user's saved order is never overwritten. Tool ids and data sources are in `docs/PROVIDERS.md`. The inherited upstream supports many more tools; they stay wired but are off by default, and can be ticked in Settings.

## What the user sees

- A **Meter** item in the menu bar: a template glyph plus an optional short figure.
- A **popover** on click: one compact module per enabled tool with today's usage and cost, each quota pool as its own meter with its reset time, and an explicit state line when data is missing.
- A **Settings** window for accounts, tool selection and order, refresh interval and appearance.
- Optionally, a **WidgetKit** widget fed by the same snapshot.

## Principles

1. **Local-first.** Usage comes from local logs via tokscale. Network calls are limited to the provider quota endpoints the user has credentials for.
2. **Limits are not usage.** Tokens/cost and plan quota are separate facts, shown separately.
3. **Unavailable is not zero.** Missing data is a state, never `0%`.
4. **No invented numbers.** Only percentages and amounts the provider returned are shown. Pools are never summed or merged (`docs/POOLS.md`).
5. **Catalog-driven.** Tools, order, labels and marks come from the shared catalogs, so every surface agrees.
6. **Native.** It should feel like a utility Apple could have shipped.

## Visual system

A native macOS menu-bar utility. Specifically:

- **Is:** system materials with real vibrancy, SF Pro and SF Symbols, system colours and accent, compact list rows, hairline separators, standard controls, light and dark appearance, full accessibility support.
- **Is not:** the inherited upstream widget look (dark blue-black cards, glassmorphism panels, dashboard charts), and not the Remex Studio marketing site (hero typography, gradients, brand illustration).

`docs/UI.md` specifies the surfaces; `.agents/skills/apple-menubar-monitor/SKILL.md` is the implementation guide.

## Out of scope for v1

- Windows and Linux builds.
- Multi-device sync through the Hub or Worker (the code stays; the product does not expose it).
- Tools other than the six above.
- New localizations.
- Any new data architecture: Remex Meter adapts tokscale, the limits runtime and the provider registry.

## Phases

| Phase | Label | Scope |
|---|---|---|
| 0 | `P0` | Import upstream, vendor skills, write these docs, file issues. |
| 1 | `P1` | Rename to Remex Meter identity, macOS arm64 only, six tools, native vibrancy menu-bar shell, English default. |
| 2 | `P2` | Cursor and Grok pool modules from real provider windows. |
| 3–5 | `P2` | Later threads: native widget, release pipeline, design audit, upstream sync, surface reduction. |

Issues on GitHub carry the details.
