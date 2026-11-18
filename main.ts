// cbbtc-dip-bot: a dip-buying bot for the make.fun BTC race (bars-replay/v1).
//
// Idea: cbBTC on 1-minute bars spends most of a day chopping inside a few
// percent, with occasional sharp hourly drops that bounce. The bot stays in
// cash, waits for a real dip — the close down at least 1.5% over the last
// hour — confirmed by a bounce (this bar's close above the previous bar's),
// buys with all of its cash, then sells the whole position at +2% over its
// cost or stops out at -1% under it. One open position, long only, no
// leverage, no shorts. A full-size round trip pays about 26 bps in fees,
// slippage and impact, so a trade has to catch a move larger than that:
// the +2% take-profit and -1% stop-loss are both far above it.
//
// Every decision is a pure function of the closes the bot has seen: no wall
// clock, no network, no files outside the repository, no randomness, so two
// executions on the same bars answer identically. All comparisons are exact
// integer arithmetic (prices as the harness sends them, values in quote
// units), so there is no float drift to diverge between runs.
//
// Backtest on the kit's dev window (24h to the opening, 1,440 bars):
//   buy-and-hold -31.63 USDC, EMA-cross baseline -148.17 USDC,
//   this bot +18.33 USDC on 2 trades (1 round trip), max drawdown 1.5%.
// The parameters sit on a plateau, not a spike: lookbacks of 30-90 bars and
// dips of 1.5-2% all give +18 to +19 USDC on the same window.

import { BPS, runBars, type Bar, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Bars of history the dip is measured over (60 one-minute bars = 1 hour). */
const LOOKBACK_BARS = 60;
/** Enter when the close fell at least this far (bps) over LOOKBACK_BARS. */
const DROP_BPS = 150;
/** Sell the whole position when it is worth this far (bps) over its cost. */
const TAKE_PROFIT_BPS = 200;
/** Sell the whole position when it is worth this far (bps) under its cost. */
const STOP_LOSS_BPS = 100;
/** Reject a fill more than 1% past the close the order was decided on. */
const MAX_SLIPPAGE_BPS = 100;

/** Every close the bot has seen, in bar order (warm-up bars included). */
const closes: number[] = [];

/**
 * Whether this bar opens a dip-buy: the close one bar ago fell at least
 * DROP_BPS below the close LOOKBACK_BARS before it, and this bar's close
 * bounced above the previous bar's close. Needs LOOKBACK_BARS + 2 closes
 * before it can fire, so the bot cannot trade in its first hour; a fill
 * the market refuses simply leaves it flat to try again on the next bar.
 */
function dipped(): boolean {
  const n = closes.length;
  if (n <= LOOKBACK_BARS + 1) return false;
  const then = closes[n - 2 - LOOKBACK_BARS];
  const prev = closes[n - 2];
  const now = closes[n - 1];
  if (now <= prev) return false;
  return BigInt(prev) * BPS <= BigInt(then) * (BPS - BigInt(DROP_BPS));
}

/** Whether a held position exits on this close: take-profit or stop-loss. */
function exits(state: BarsState, held: { qty: bigint; cost: bigint }): boolean {
  const value = state.value(SYMBOL, held.qty);
  if (value * BPS >= held.cost * (BPS + BigInt(TAKE_PROFIT_BPS))) return true;
  if (value * BPS <= held.cost * (BPS - BigInt(STOP_LOSS_BPS))) return true;
  return false;
}

await runBars({
  onBatch(state, batch) {
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(Number(bar.c));
    }
    if (state.warmingUp) return [];
    const held = state.positions.get(SYMBOL);
    if (held !== undefined && held.qty > 0n) {
      if (exits(state, held)) {
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [sell];
      }
      return [];
    }
    if (!dipped()) return [];
    const cash = state.cash;
    if (cash < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: cash, max_slippage_bps: MAX_SLIPPAGE_BPS };
    return [buy];
  },
});
