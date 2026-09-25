# Quota pools

Some providers meter one plan through several independent allowances ("pools"). Each pool has its own limit and its own reset. Adding or averaging them produces a number that no provider enforces, so Remex Meter never does it.

## Rules

1. **One pool, one meter.** Each pool is rendered as its own module with its own meter, value and reset time.
2. **Never sum, never average, never synthesize.** No "total", "overall" or "combined" bar is computed from pools. If a provider itself returns an overall figure, it is shown only as that provider's own window, labelled as such.
3. **Unavailable is not zero.** If a pool's window is absent, or the provider status is not `ok`, the module shows a state ("Unavailable", "Sign in required", "Not configured") and no bar.
4. **No invented percentages.** A meter shows `usedPercent` exactly as the normalized limits record carries it. If the provider returned only used/limit, `normalizeLimitWindow()` derives the percentage; the UI derives nothing.
5. **Identity, not labels.** Modules select windows by provider id and a stable window identity. Upstream display labels (`Cursor Models`, `Weekly`) are not a contract and may change.

## Cursor

| Module | Upstream window today | Source field |
|---|---|---|
| **Cursor Mode Pool** | `Cursor Models` (`kind: 'billing'`) | `cursor.com/api/usage-summary` → `individualUsage.plan.autoPercentUsed` |
| **Cursor Other Modes** | `Other Models` (`kind: 'billing'`) | `cursor.com/api/usage-summary` → `individualUsage.plan.apiPercentUsed` |

- These are two different allowances on one Cursor plan. **Never merge them into one bar**, and never show `plan.totalPercentUsed` as if it were either pool.
- Upstream emits the pair only on percent-based plans. A legacy request plan yields a single `Requests` window; some accounts yield `Overall`. In those cases Mode Pool and Other Modes render as unavailable, and the provider's own window is shown under its own name. Do not relabel `Requests` or `Overall` as a pool.
- Both pools share the billing-cycle reset (`billingCycleEnd`).
- Other Cursor windows stay separate modules or lines: `Grok Bot` (a weekly allowance on the Cursor account; unrelated to the Grok pools below), `Team pool`, and `On-demand spend` (money, not a meter).

## Grok

| Module | Upstream window today | Source |
|---|---|---|
| **Grok Heavy Weekly** | none | not yet identified |
| **Grok Bolt Weekly** | none | not yet identified |

- These are two different weekly allowances. **Never sum them**, and never show one as the other.
- The upstream Grok provider (`src/shared/providers/grok/limits.js`) reads one credit percentage, from the CLI `x.ai/billing` RPC or the grok.com `GetGrokCreditsConfig` gRPC-web endpoint, and emits **one** billing window. That window is not Heavy, not Bolt and not their sum. Until a source that reports the two allowances separately is identified and documented, both Grok modules render as unavailable. Whether the single window is shown elsewhere is a Phase 2 decision ([issue #4](https://github.com/remexstudio/remex-meter/issues/4)).
- Upstream's `parseGrokGrpcWebBilling()` returns `0` when a usage period exists but no percent field does. Treat that as unverified until issue #4 resolves it.

## Adding a pool

Document the pool here first: module name, provider id, the exact source field (captured from a real response, not guessed), the reset rule, and what the module shows when the field is absent. Then add the parser with tests for both the present and absent cases.
