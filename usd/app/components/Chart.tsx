"use client"

import { useEffect, useState, useRef } from "react";
import { createChart, LineSeries, CandlestickSeries, IChartApi, ISeriesApi, UTCTimestamp, CandlestickData, LineData } from "lightweight-charts";
import useSWR from "swr";
import { calculateSMA } from "../lib/calculateSMA"
import OhlcReadout, { Readout } from "./OhlcReadout"

interface Candle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

async function fetcher(url: string): Promise<Candle[]> {
  const response = await fetch(url);
  const rawData = await response.json();

  
  return rawData
    .map((item: any) => ({
      time: Math.floor(new Date(item.datetime).getTime() / 1000) as UTCTimestamp,
      open: Number(item.open),
      high: Number(item.high),
      low: Number(item.low),
      close: Number(item.close),
    }))
    .reverse();
}

export default function Chart() {
  const [range, setRange] = useState("5min");
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Live crosshair / candle readout shared with the header.
  const [readout, setReadout] = useState<Readout>({
    open: null,
    high: null,
    low: null,
    sma: null,
  });

  // Latest candle + SMA, used as the default and the hover-off fallback.
  const defaultReadoutRef = useRef<Readout>({ open: null, high: null, low: null, sma: null });
  // SMA lookup keyed by candle time (for reverting/initial state).
  const smaByTimeRef = useRef<Map<number, number>>(new Map());
  // Throttling + touch-retain timers for the crosshair handler.
  const lastMoveRef = useRef(0);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, error, isLoading, isValidating} = useSWR(`/api/gold-data?range=${range}`, fetcher, { refreshInterval: 60000, keepPreviousData: true });


  useEffect(() => {
    if(!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: "#8b93a7",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26c281",
      downColor: "#f0616d",
      borderUpColor: "#26c281",
      borderDownColor: "#f0616d",
      wickUpColor: "#26c281",
      wickDownColor: "#f0616d",
    });
    const smaSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 1,
    })

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    smaSeriesRef.current = smaSeries;

    return ()  => {
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (data && seriesRef.current && smaSeriesRef.current) {
      seriesRef.current.setData(data);

      const smaData = calculateSMA(data, 20);
      smaSeriesRef.current.setData(smaData);

      // Build a time -> SMA lookup for revert/initial defaults.
      const smaMap = new Map<number, number>();
      for (const point of smaData) {
        smaMap.set(point.time as number, point.value);
      }
      smaByTimeRef.current = smaMap;

      // Default to the latest candle before any hover.
      const latest = data[data.length - 1];
      if (latest) {
        const next: Readout = {
          open: latest.open,
          high: latest.high,
          low: latest.low,
          sma: smaMap.get(latest.time as number) ?? null,
        };
        defaultReadoutRef.current = next;
        // Only reset the visible readout to latest when not actively hovering.
        if (retainTimerRef.current == null) setReadout(next);
      }
    }
  }, [data]);

  // Crosshair subscription: throttled hover readout with touch-retain.
  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = seriesRef.current;
    const smaSeries = smaSeriesRef.current;
    if (!chart || !candleSeries || !smaSeries) return;

    const applyMove = (param: Parameters<Parameters<IChartApi["subscribeCrosshairMove"]>[0]>[0]) => {
      // Cursor left the chart area: briefly retain, then revert to latest.
      if (param.time == null || param.point == null) {
        if (retainTimerRef.current) clearTimeout(retainTimerRef.current);
        retainTimerRef.current = setTimeout(() => {
          retainTimerRef.current = null;
          setReadout(defaultReadoutRef.current);
        }, 700);
        return;
      }

      if (retainTimerRef.current) {
        clearTimeout(retainTimerRef.current);
        retainTimerRef.current = null;
      }

      const candle = param.seriesData.get(candleSeries) as CandlestickData | undefined;
      const smaPoint = param.seriesData.get(smaSeries) as LineData | undefined;
      const smaValue =
        smaPoint?.value ?? smaByTimeRef.current.get(param.time as number) ?? null;

      if (candle) {
        setReadout({
          open: candle.open,
          high: candle.high,
          low: candle.low,
          sma: smaValue,
        });
      }
    };

    const handler = (param: Parameters<typeof applyMove>[0]) => {
      const now = Date.now();
      const elapsed = now - lastMoveRef.current;
      // Let hover-off (revert) run immediately; throttle active moves.
      if (param.time == null || elapsed >= 50) {
        lastMoveRef.current = now;
        if (throttleTimerRef.current) {
          clearTimeout(throttleTimerRef.current);
          throttleTimerRef.current = null;
        }
        applyMove(param);
      } else {
        // Ensure the trailing move is not dropped.
        if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = setTimeout(() => {
          lastMoveRef.current = Date.now();
          throttleTimerRef.current = null;
          applyMove(param);
        }, 50 - elapsed);
      }
    };

    chart.subscribeCrosshairMove(handler);
    return () => {
      chart.unsubscribeCrosshairMove(handler);
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
      if (retainTimerRef.current) clearTimeout(retainTimerRef.current);
    };
  }, [data]);


  const latestPrice = data?.[data.length - 1]?.close;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/5 bg-[#111827] p-4 shadow-2xl shadow-black/40 sm:p-6">
      {/* Price header (visual only) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-base font-semibold text-[#e6e9ef] sm:text-lg">XAU/USD</div>
            <div className="text-[10px] uppercase tracking-widest text-[#8b93a7] sm:text-xs">Gold Spot</div>
          </div>
        </div>
        <div className="font-mono text-2xl font-semibold text-[#e6e9ef] sm:text-4xl">
          {latestPrice != null
            ? `$${latestPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "—"}
        </div>
      </div>

      <div className="flex justify-between flex-row-reverse items-center">
        <div className="mb-4 border-t border-white/5 pt-3 sm:mb-6">
          <OhlcReadout {...readout} />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
        <button
            onClick={() => setRange("5min")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              range === "5min"
                ? "bg-[#f5c451] text-[#2a2205]"
                : "bg-white/5 text-[#8b93a7] hover:bg-white/10"
            }`}
          >
            5 minutes
          </button>
          <button
            onClick={() => setRange("15min")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              range === "15min"
                ? "bg-[#f5c451] text-[#2a2205]"
                : "bg-white/5 text-[#8b93a7] hover:bg-white/10"
            }`}
          >
            15 minutes
          </button>
          <button
            onClick={() => setRange("1hour")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              range === "1hour"
                ? "bg-[#f5c451] text-[#2a2205]"
                : "bg-white/5 text-[#8b93a7] hover:bg-white/10"
            }`}
          >
            1 hour
          </button>
          <button
            onClick={() => setRange("4hours")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              range === "4hours"
                ? "bg-[#f5c451] text-[#2a2205]"
                : "bg-white/5 text-[#8b93a7] hover:bg-white/10"
            }`}
          >
            4 hours
          </button>
          <button
            onClick={() => setRange("1day")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              range === "1day"
                ? "bg-[#f5c451] text-[#2a2205]"
                : "bg-white/5 text-[#8b93a7] hover:bg-white/10"
            }`}
          >
            1 Day
          </button>
        </div>
      </div>
      
      {isLoading && (
        <div className="flex items-center gap-2 text-[#8b93a7]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[#f5c451]" />
          <span>Loading gold data...</span>
        </div>
      )}
      {isValidating && !isLoading && (
        <div className="text-xs text-[#8b93a7]">Refreshing…</div>
      )}
      {error && <p className="text-[#f0616d]">Failed to load gold data.</p>}
      <div ref={chartContainerRef} className="min-h-0 flex-1 overflow-hidden rounded-xl" />
    </div>
  );
}