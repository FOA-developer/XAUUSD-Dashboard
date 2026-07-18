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
    close: null,
  });

   
  const defaultReadoutRef = useRef<Readout>({ open: null, high: null, low: null, close: null });
  // SMA lookup keyed by candle time (for reverting/initial state).
  const smaByTimeRef = useRef<Map<number, number>>(new Map());
  // Throttling + touch-retain timers for the crosshair handler.
  const lastMoveRef = useRef(0);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Timeframe buttons: fixed set, paged one-at-a-time by the arrows.
  const timeframes = [
    { value: "5min", label: "5 min" },
    { value: "15min", label: "15 min" },
    { value: "1hour", label: "1h" },
    { value: "4hours", label: "4h" },
    { value: "1day", label: "1d" },
  ];
  // Which button occupies the first (always-visible) slot. Arrows rotate this.
  const [tfOffset, setTfOffset] = useState(0);
  const pageTimeframes = (dir: number) => {
    setTfOffset((prev) => (prev + dir + timeframes.length) % timeframes.length);
  };

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
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
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
          close: latest.close,
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
          close: candle.close,
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

  // Rotate the list so `tfOffset` sits first; CSS reveals as many as width allows.
  const orderedTimeframes = [
    ...timeframes.slice(tfOffset),
    ...timeframes.slice(0, tfOffset),
  ];
  // Reveal by position: 1 (≤850) · 2 (≥851) · 3 (lg≥1024) · 4 (xl≥1280) · 5 (2xl≥1536)
  const revealByPosition = ["", "hidden min-[851px]:block", "hidden lg:block", "hidden xl:block", "hidden 2xl:block"];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/5 bg-[#111827] p-4 shadow-2xl shadow-black/40 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-base font-semibold text-[#e6e9ef] sm:text-lg">XAU/USD</div>
            <div className="text-[10px] uppercase tracking-widest text-[#8b93a7] sm:text-xs">Gold Spot</div>
          </div>
        </div>
        <div className="font-mono text-xl font-semibold text-[#e6e9ef] sm:text-3xl">
          {latestPrice != null
            ? `$${latestPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "—"}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <div className="flex min-w-0 shrink items-center gap-1">
          <button
            type="button"
            aria-label="Previous timeframe"
            onClick={() => pageTimeframes(-1)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-lg leading-none text-[#8b93a7] transition hover:bg-white/10 max-[400px]:h-6 max-[400px]:w-6 max-[400px]:text-sm 2xl:hidden"
          >
            ‹
          </button>
          <div className="flex gap-2">
            {orderedTimeframes.map((tf, i) => (
              <button
                key={tf.value}
                onClick={() => setRange(tf.value)}
                className={`${revealByPosition[i]} shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition max-[400px]:px-2.5 max-[400px]:py-1 max-[400px]:text-[11px] ${
                  range === tf.value
                    ? "bg-[#f5c451] text-[#2a2205]"
                    : "bg-white/5 text-[#8b93a7] hover:bg-white/10"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Next timeframe"
            onClick={() => pageTimeframes(1)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-lg leading-none text-[#8b93a7] transition hover:bg-white/10 max-[400px]:h-6 max-[400px]:w-6 max-[400px]:text-sm 2xl:hidden"
          >
            ›
          </button>
        </div>

        {/* OHLC + SMA readout: always one row, expands into space the buttons free up */}
        <div className="min-w-0 flex-1 border-t border-white/5 pt-3">
          <OhlcReadout {...readout} />
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