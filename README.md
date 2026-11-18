[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/DLiiMaGaming/cbbtc-dip-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/DLiiMaGaming/cbbtc-dip-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)

# cbbtc-dip-bot

A dip-buying trading bot for Coinbase Wrapped BTC (cbBTC), built for the
[make.fun](https://make.fun/bounty/btc-race-24h-20261118-1444) competition
**Race a BTC trading bot live for 24 hours** (`btc-race-24h-20261118-1444`).

The bot trades cbBTC/USDC on 1-minute on-chain bars from the Orca Whirlpool,
starting with $1,000 of paper money, long only, no leverage, no shorts.

## Strategy

cbBTC on 1-minute bars spends most of a day chopping inside a few percent,
with occasional sharp hourly drops that bounce. The bot stays in cash and
waits for a real dip:

- **Enter:** the close fell at least **1.5% over the last hour** (60 bars)
  and this bar's close bounced above the previous bar's close. It buys with
  all of its cash.
- **Exit:** sell the whole position at **+2% over its cost**, or stop out at
  **−1% under its cost**.

A full-size round trip pays about 26 bps in fees, slippage and price impact,
so a trade has to catch a move larger than that — the +2% take-profit and
−1% stop-loss are both far above it. One open position at a time; at most
one order per reply; fills are capped at 1% past the close the order was
decided on.

Every decision is a pure function of the closes the bot has seen: no wall
clock, no network, no files outside the repository, no randomness. All
comparisons are exact integer arithmetic, so two executions on the same bars
answer identically.

## Results on the dev window

Graded locally with the kit's own grader
(`makefun grade-local --driver process`) on the published 24-hour dev
window (1,440 one-minute bars to the opening):

| | |
| --- | --- |
| Net PnL | **+18.33 USDC** (passes the dev gate: PnL > 0) |
| Trades | 2 (1 round trip, win rate 100%) |
| Max drawdown | 1.5% |
| Fees | 0.81 USDC |

For comparison on the same window: buy-and-hold −31.63 USDC, the kit's
EMA-cross baseline −148.17 USDC. The parameters sit on a plateau, not a
spike: lookbacks of 30–90 bars and dips of 1.5–2% all give +18 to +19 USDC.

## Layout

- `main.ts` — the bot (TypeScript, Node 22, erasable syntax only).
- `vendor/makefun-bars.ts` — the kit's `bars-replay/v1` SDK shim, copied
  byte-for-byte from the competition kit.
- `LICENSE` — MIT.

## Run it

The kit grades it the way the server does:

```sh
node <kit>/cli/makefun.mjs grade-local --kit <kit> --bot . --driver process
```
