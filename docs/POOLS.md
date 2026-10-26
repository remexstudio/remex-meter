# Quota pools

Some providers meter one plan through several independent allowances ("pools"). Each pool has its own limit and its own reset. Adding or averaging them produces a number that no provider enforces, so Remex Meter never does it.

## Rules

1. **One pool, one meter.** Each pool is rendered as its own module with its own meter, value and reset time.
2. **Never sum, never average, never synthesize.** No "total", "overall" or "combined" bar is computed from pools. If a provider itself returns an overall figure, it is shown only as that provider's own window, labelled as such.
3. **Unavailable is not zero.** If a pool's window is absent, or the provider status is not `ok`, the module shows a state ("Unavailable", "Sign in required", "Not configured") and no bar.
4. **No invented percentages.** A meter shows `usedPercent` exactly as the normalized limits record carries it. If the provider returned only used/limit, `normalizeLimitWindow()` derives the percentage; the UI derives nothing.
5. **Identity, not labels.** Modules select windows by provider id and a stable window identity. Upstream display labels (`Cursor Models`, `Weekly`) are not a contract and may change.

## Cursor

| Module | `limitId` | Upstream window | Source field |
|---|---|---|---|
| **Cursor Mode Pool** | `cursor.modePool` | `Cursor Models` (`kind: 'billing'`) | `cursor.com/api/usage-summary` → `individualUsage.plan.autoPercentUsed` |
| **Cursor Other Modes** | `cursor.otherModes` | `Other Models` (`kind: 'billing'`) | `cursor.com/api/usage-summary` → `individualUsage.plan.apiPercentUsed` |

- These are two different allowances on one Cursor plan. **Never merge them into one bar**, and never show `plan.totalPercentUsed` as if it were either pool.
- The popover selects each row by `limitId`. The upstream label is not the contract.
- Upstream emits a pool id only for a percent that was actually present. One side can be present without the other; the missing side renders Unavailable and is not filled with `0`.
- A legacy request plan (`requestsUsed` and `requestsLimit > 0`) emits `cursor.requests` labelled `Requests` and does not also emit the pool ids, even if `autoPercentUsed` / `apiPercentUsed` are present on the same summary. An account with `individualUsage.overall` and no percent pools emits `cursor.overall` labelled `Overall`, and only when `planPercent` is a returned or derived figure rather than a fill-in zero. In both cases Mode Pool and Other Modes render as Unavailable, with text that names the window the account did report. Do not relabel `Requests` or `Overall` as a pool.
- `parseUsageSummary()` keeps `plan.totalPercentUsed` when it is present, and otherwise derives a percentage only from a used/limit pair whose used amount and positive limit were both returned. If neither exists, `planPercent` is `null`. It is not `0`.
- Both pools share the billing-cycle reset (`billingCycleEnd`).
- Other Cursor windows stay separate rows, with their own ids: `cursor.grokBot` (`Grok Bot`, a weekly allowance on the Cursor account; unrelated to the Grok pools below), `cursor.teamPool` (`Team pool`), and `cursor.onDemand` (`On-demand spend`, money, not a meter).

## Grok

| Module | `limitId` | Upstream window | Source |
|---|---|---|---|
| **Grok Heavy Weekly** | `grok.heavyWeekly` | none | not in any documented payload; see `docs/providers/grok.md` |
| **Grok Bolt Weekly** | `grok.boltWeekly` | none | not in any documented payload; see `docs/providers/grok.md` |

- These are two different weekly allowances. **Never sum them**, and never show one as the other.
- The Grok provider reads one credit percentage, from the CLI `x.ai/billing` RPC or the grok.com `GetGrokCreditsConfig` gRPC-web endpoint, and emits **one** billing window with `limitId: grok.credits`. The label is the period (`Weekly`, `Monthly`, or `Billing`). That window is not Heavy, not Bolt, and not their sum. The popover shows it under that period label and renders both pool rows as Unavailable, with text that says Grok does not report the allowance separately.
- `productUsage` shares (Grok Build, Grok Chat, and the other products named in `docs/providers/grok.md`) are shares of `grok.credits`. They are not parsed into pool windows.
- `parseGrokGrpcWebBilling()` returns `0` only for the gated proto3 case: a usage period and a future reset are present, and the message contains no float at all. Anything else with no percent is unavailable, not `0`. The JSON path does not infer that zero. An explicit `0` from either path is kept. The evidence and the gate are in `docs/providers/grok.md`.

## Adding a pool

Document the pool here first: module name, provider id, the exact source field (captured from a real response, not guessed), the reset rule, and what the module shows when the field is absent. Then add the parser with tests for both the present and absent cases.
