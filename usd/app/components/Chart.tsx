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
  const [range, setRange] = useState("4month")
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const { data, error, isLoading } = useSWR(`/api/gold-data?range=${range}`, fetcher);


  useEffect(() => {
    if(!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      width: 1000,
      height: 500,
    });

    const candleSeries = chart.addSeries(CandlestickSeries);
    const smaSeries = chart.addSeries(LineSeries, {
      color: "blue",
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


  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button onClick={() => setRange("1day")} className="px-3 py-1 border rounded">1 Day</button>
        <button onClick={() => setRange("1week")} className="px-3 py-1 border rounded">1 Week</button>
        <button onClick={() => setRange("4month")} className="px-3 py-1 border rounded">1 Month</button>
      </div>
      {isLoading && (
        <div className="flex items-center gap-2 text-gray-600">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        <span>Loading gold data...</span>
        </div>
      )}
      {error && <p className="text-red-600">Failed to load gold data.</p>}
      <div ref={chartContainerRef} />
    </div>
  );
}