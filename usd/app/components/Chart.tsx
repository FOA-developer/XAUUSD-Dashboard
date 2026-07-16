"use client"

import { useEffect, useState, useRef } from "react";
import { createChart, CandlestickSeries, IChartApi, ISeriesApi } from "lightweight-charts";
import useSWR from "swr";

interface Candle {
  time: string;
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
      time: Math.floor(new Date(item.datetime).getTime() / 1000),
      open: Number(item.open),
      high: Number(item.high),
      low: Number(item.low),
      close: Number(item.close),
    }))
    .reverse();
}

export default function Chart() {
  const [range, setRange] = useState("4month")
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const { data, error, isLoading } = useSWR(`/api/gold-data?range=${range}`, fetcher);


  useEffect(() => {
    if(!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      width: 1000,
      height: 400,
    });

    const candleSeries = chart.addSeries(CandlestickSeries);

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    return ()  => {
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (data && seriesRef.current) {
      seriesRef.current.setData(data);
    }
  }, [data]);


  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button onClick={() => setRange("1day")} className="px-3 py-1 border rounded">1 Day</button>
        <button onClick={() => setRange("1week")} className="px-3 py-1 border rounded">1 Week</button>
        <button onClick={() => setRange("4month")} className="px-3 py-1 border rounded">1 Month</button>
      </div>
      {isLoading && <p>Loading gold data...</p>}
      {error && <p className="text-red-600">Failed to load gold data.</p>}
      <div ref={chartContainerRef} />
    </div>
  );
}