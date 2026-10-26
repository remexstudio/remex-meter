---
summary: "Grok limits come from one credit allowance. Heavy and Bolt are not separate windows in any documented source."
ids: [grok]
read_when:
  - Changing Grok billing RPC, gRPC-web credits parsing, or the credit window identity
  - Changing how Grok Heavy Weekly or Grok Bolt Weekly are selected in the popover
  - Changing the proto3 no-usage-yet zero gate
---

# Grok

Grok has one tracked client (`grok`) and one limits provider (`grok`). Usage is tokscale over local sessions. Limits are the subscription credit allowance. They are not the same number, and neither is a Heavy or Bolt pool.

## Data sources

Usage is tokscale over `~/.grok/sessions` and `~/.grok/logs/unified.jsonl` (`GROK_HOME` overrides the root).

Limits, in order:

1. When the credential came from `auth.json`, the Grok CLI (`grok agent stdio`, JSON-RPC `x.ai/billing`).
2. Otherwise, and when that RPC fails for a reason other than unauthorized, `POST https://grok.com/grok_api_v2.GrokBuildBilling/GetGrokCreditsConfig` (gRPC-web, bearer token).

Both paths are parsed in `src/shared/providers/grok/limits.js`. The credential order is settings, then `GROK_BEARER_TOKEN`, then `~/.grok/auth.json`.

## One credit window

Every successful parse emits **one** billing window:

| Field | Value |
|---|---|
| `limitId` | `grok.credits` |
| `label` | `Weekly`, `Monthly`, or `Billing`, from the period length or `currentPeriod.type` |
| `usedPercent` | the single credit percentage the payload carried |

`grok.heavyWeekly` and `grok.boltWeekly` are popover identities (`src/shared/limits/poolModules.js`). This provider never emits them. The popover therefore renders both pools as Unavailable and shows `grok.credits` under its period label. That window is not Heavy, not Bolt, and not their sum. `productUsage` entries are ignored, including any future product name that merely looks like a pool.

## Evidence that Heavy and Bolt are not separate allowances

Checked before any parser change. None of these sources has a field path for a Heavy weekly allowance and a distinct Bolt weekly allowance.

1. **Official CLI schema.** [`billing.rs` in `xai-org/grok-build`](https://github.com/xai-org/grok-build/blob/b189869b7755d2b482969acf6c92da3ecfeffd36/crates/codegen/xai-grok-shell/src/extensions/billing.rs) defines `BillingConfig` with one `credit_usage_percent` and one `current_period`. `BillingConfigResponse.subscription_tier` is a plan name (the comment's example is `"SuperGrok Heavy"`), not a second meter. The same file's credits-shaped unit test includes `productUsage: [{ "product": "PRODUCT_GROK_BUILD", "usagePercent": 61.2 }]`, and the struct has no `product_usage` field, so serde drops it. There is no Heavy product and no Bolt product.
2. **Captured credits payload.** [claudia's `docs/grok-usage-billing.md`](https://github.com/marcelocantos/claudia/blob/master/docs/grok-usage-billing.md) records a live `GET https://cli-chat-proxy.grok.com/v1/billing?format=credits` body from 2026-08-10: `config.creditUsagePercent`, one `currentPeriod` of type `USAGE_PERIOD_TYPE_WEEKLY`, and `productUsage` of `GrokBuild` (with `usagePercent`) plus `GrokChat` (percent omitted). The note maps that to one weekly window. `creditUsagePercent` is used-percent, checked against the CLI panel.
3. **CodexBar, from live CLI-proxy samples.** [CodexBar `docs/grok.md`](https://github.com/steipete/codexbar/blob/main/docs/grok.md) names the verified `productUsage` products: `GrokBuild`, `GrokChat`, `GrokImagine`, `GrokAppBuilder`. It states that every product percentage is a share of the same credit pool as the primary window, so it is never its own rate window. On `GetGrokCreditsConfig` the same shares are repeated field `7` messages (`1` product id, `2` float percent). The only ids it names from live samples are `2 = GrokBuild` and `4 = GrokChat`. An omitted percent means a zero share of that one pool, not another allowance.
4. **gRPC-web field map used here.** The same `GetGrokCreditsConfig` config message is what `parseGrokGrpcWebBilling()` scans, and what [`grok-credits-tracker`](https://github.com/lsaether/grok-credits-tracker/blob/main/grok_credits.py) decodes: field `1` fixed32 `credit_usage_percent`, fields `2` and `3` on-demand cents, fields `4` and `5` period timestamps, field `6` history. One percent.
5. **xAI's own description of the pool.** [Usage limits](https://docs.x.ai/x-subscription/usage-limits) says the weekly pool "is shared across eligible Grok and Cursor surfaces for that seat rather than split into separate product quotas." Heavy is a larger tier of that pool, not a parallel meter.

No public `x.ai/billing` field, protobuf field, or docs page found in this pass names a Bolt weekly allowance. Public "Bolt" pages refer to Bolt.new, which is a different product and not a Grok credential source.

Until a captured payload shows two independent allowances, both popover pools stay Unavailable. Do not map `subscription_tier`, `productUsage`, or `creditUsagePercent` onto either id.

## Zero fallback

`parseGrokGrpcWebBilling()` still returns `0` when `noUsageYet` is true. The gate is all of: no percent float, no fixed32 field of any kind, a future reset, and a usage-period marker (`1.6*` or `1.8.1` in `{1, 2}`).

That is kept because proto3 does not serialize a zero float, so a fresh period cannot carry `0` any other way. The official schema says proto3 JSON omits zero-valued scalars ([`billing.rs`, `Cent.val`](https://github.com/xai-org/grok-build/blob/b189869b7755d2b482969acf6c92da3ecfeffd36/crates/codegen/xai-grok-shell/src/extensions/billing.rs)). CodexBar documents the grok.com path's "no-usage-yet zero", and [TokenBar #76](https://github.com/Nanako0129/TokenBar/pull/76) records that the weekly credits view omits its percent fields right after reset while the period remains. A payload that fails the gate throws `unavailable` and does not become `0`.

The JSON path does **not** use that inference. A missing `creditUsagePercent` falls through to `monthlyLimit` / `used` and otherwise throws. CodexBar treats a credits payload with no `creditUsagePercent` as unknown usage, not `0%` (its example is SuperGrok Heavy). An explicit `0` on either path is kept, because the provider returned it.

## Verification

```bash
node --test tests/shared/grokLimits.test.js tests/electron/meterPopoverModel.test.js
```
