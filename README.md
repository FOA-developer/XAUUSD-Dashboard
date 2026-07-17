## XAUUSD Gold Price Dashboard

A web dashboard for gold (XAU/USD) price data — candlestick chart, timeframe switching, an SMA overlay, and handling for the ways APIs break.

**Live demo:** https://xauusd-dashboard-tan.vercel.app/

## Tech Stack

- **Next.js (App Router) + TypeScript** — API routes so the Twelve Data key stays server-side, never exposed to the browser.
- **Twelve Data API (free tier)** for OHLC gold data.
- **lightweight-charts** (TradingView's library) for the candlesticks and SMA line.
- **SWR** for caching, loading, and error states.
- **Tailwind CSS** for styling.
- **Vercel** for deployment.

## Features

- Candlestick chart with five timeframes — 15m, 1H, 4H, 1D— each showing the past N periods up to now, same convention as TradingView: switching timeframes changes both the candle resolution and how far back you're looking, always ending at the current moment.
- 20-period SMA plotted as an overlay line.
- Loading and error states. The app shouldn't crash on a bad key, dead network, or empty response.
- SWR caching keyed on the request URL, so flipping back to a timeframe you already loaded this session is instant. `keepPreviousData` keeps the old chart on screen while a new timeframe loads instead of flashing blank.
- 60-second polling refresh so prices update without a page reload. Not true streaming.
- A price header pulling the latest close straight from the polled data, no extra fetch needed.

## Why Twelve Data

I looked at Polygon.io, Alpha Vantage, and Finnhub first. Polygon has no free tier, so that was quick. Alpha Vantage caps out at 25 requests/day — you'll burn through that in minutes of actual use. Finnhub's rate limit is generous (60/min) but its metals coverage is thin to nonexistent on the free tier. Twelve Data treats forex/commodities as first-class data, gives 800 calls/day and 8/min free, and I confirmed in the browser before writing any code that it actually returns proper gold OHLC data. Gold coverage was the deciding factor.

## Why SMA

It's the simplest indicator to implement correctly and explain to someone else — a rolling average of the last N closes. One quirk worth knowing: the first N-1 candles on any chart won't have an SMA value yet, since there's no history to average. That's just how moving averages work, not a bug, and you'll see it as a small gap at the start of the SMA line on longer timeframes.

## Error Handling

I tested three failure modes on purpose.

1. **Bad API key** — swapped in a garbage value in `.env.local`. Twelve Data comes back with `status: "error"`, the API route turns that into a 502, and the frontend shows "Failed to load gold data." instead of crashing.
2. **Empty/malformed data** — checked the code paths: the SMA loop just doesn't run on an empty array, and `setData([])` renders a blank chart with no exception.
3. **Network failure** — killed the connection with Chrome DevTools' offline mode. `fetch` fails, SWR catches it as an error, same message shows up instead of a spinner hanging forever.

## Caching

SWR keys on `/api/gold-data?range=...`, so each timeframe caches independently — revisit one you've already fetched this session and it's instant, no network call. `keepPreviousData: true` stops the chart from going blank while a new timeframe loads. This isn't just nice UX either — Twelve Data's free tier caps at 8 requests/min, and re-fetching on every click would hit that fast.

## Known Limitations / What I'd Add

- **Real-time streaming**: Twelve Data's WebSocket access is paid-tier only. 60-second polling is the workaround for now.
- **Weekend gaps**: forex/commodity markets close on weekends, so you'll see flat or sparse candles then — that's the market, not a bug.
- With more time: a second indicator (RSI or Bollinger Bands), and real WebSocket streaming on a paid plan.

## Environment Variables

```
TWELVE_DATA_API_KEY=your_key_here
```

Set in `.env.local` (gitignored) locally, and in Vercel's project settings for deployment.

## Running Locally

```bash
npm install
npm run dev
```
