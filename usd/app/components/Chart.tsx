"use client"

import { useEffect, useState, useRef } from "react";
import { createChart, LineSeries, CandlestickSeries, IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import useSWR from "swr";
import { calculateSMA } from "../lib/calculateSMA"

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
  const [range, setRange] = useState("15min");
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const { data, error, isLoading } = useSWR(`/api/gold-data?range=${range}`, fetcher, { refreshInterval: 60000 });


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

    }
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

      <div className="mb-4 flex flex-wrap gap-2">
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
          onClick={() => setRange("1day")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            range === "1day"
              ? "bg-[#f5c451] text-[#2a2205]"
              : "bg-white/5 text-[#8b93a7] hover:bg-white/10"
          }`}
        >
          1 Day
        </button>
        <button
          onClick={() => setRange("1week")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            range === "1week"
              ? "bg-[#f5c451] text-[#2a2205]"
              : "bg-white/5 text-[#8b93a7] hover:bg-white/10"
          }`}
        >
          1 Week
        </button>
        <button
          onClick={() => setRange("4month")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            range === "4month"
              ? "bg-[#f5c451] text-[#2a2205]"
              : "bg-white/5 text-[#8b93a7] hover:bg-white/10"
          }`}
        >
          1 Month
        </button>
      </div>
      {isLoading && (
        <div className="flex items-center gap-2 text-[#8b93a7]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[#f5c451]" />
          <span>Loading gold data...</span>
        </div>
      )}
      {error && <p className="text-[#f0616d]">Failed to load gold data.</p>}
      <div ref={chartContainerRef} className="min-h-0 flex-1 overflow-hidden rounded-xl" />
    </div>
  );
}