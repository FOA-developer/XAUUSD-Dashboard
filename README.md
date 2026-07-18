## XAUUSD Gold Price Dashboard

A web dashboard for gold (XAU/USD) price data, candlestick chart, timeframe switching, an SMA overlay, and handling for the ways APIs break.

**Live demo:** https://xauusd-dashboard-tan.vercel.app/

## Tech Stack

- **Next.js + TypeScript**
- **Twelve Data API (free tier)** 
- **lightweight-charts**
- **SWR**
- **Tailwind CSS**

## Features

- Candlestick chart with five timeframes
- SMA plotted as an overlay line.
- SWR caching keyed on the request URL.
- 60-second polling refresh so prices update without a page reload. 
- A price header pulling the latest close straight from the polled data.

## Why Twelve Data

I looked at Polygon.io, Alpha Vantage, and Finnhub first. Polygon has no free tier, so that was quick. Alpha Vantage caps out at 25 requests/day,  you'll burn through that in minutes of actual use. Finnhub's rate limit is generous (60/min) but its metals coverage is thin to nonexistent on the free tier. Twelve Data treats forex/commodities as first-class data, gives 800 calls/day and 8/min free, and I confirmed in the browser before writing any code that it actually returns proper gold OHLC data. Gold coverage was the deciding factor.

## Why SMA

It's the simplest indicator to implement correctly and explain to someone else, a rolling average of the last N closes.The first N-1 candles on any chart won't have an SMA value yet, since there's no history to average. That's just how moving averages work,and you'll see it as a small gap at the start of the SMA line on longer timeframes.

## Caching

SWR keys on `/api/gold-data?range=...`, so each timeframe caches independently, revisit one you've already fetched this session and it's instant, no network call. `keepPreviousData: true` stops the chart from going blank while a new timeframe loads. This isn't just nice UX, Twelve Data's free tier caps at 8 requests/min, and re-fetching on every click would hit that fast.

## Known Limitations

- **Real-time streaming**: Twelve Data's WebSocket access is paid-tier only. 60-second polling is the workaround for now.
- **Weekend gaps**: forex/commodity markets close on weekends, so you'll see flat or sparse candles then, that's the market, not a bug.
- With more time: a second indicator (RSI or Bollinger Bands), and real WebSocket streaming on a paid plan.

## Environment Variables

```
TWELVE_DATA_API_KEY=your_key_here
```

AI was used in creating design 

Set in `.env.local` (gitignored) locally, and in Vercel's project settings for deployment.

## Running Locally

```bash
npm install
npm run dev
```
