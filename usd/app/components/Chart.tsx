"use client"

import { useEffect, useState, useRef } from "react";
import { createChart, CandlestickSeries, IChartApi, ISeriesApi } from "lightweight-charts";

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export default function Chart() {
  const [range, setRange] = useState("4month")
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

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

    async function loadData() {
      if(!seriesRef.current) return;


      const response = await fetch(`api/gold-data?range=${range}`);
      const rawData = await response.json();

      const formatted : Candle[ ] = rawData.map((item: any) => ({
        time: item.datetime,
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
      })) 

      .reverse();

      seriesRef.current.setData(formatted);
    }

    loadData();

  }, [range]);

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button onClick={() => setRange("1day")} className="px-3 py-1 border rounded">1 Day</button>
        <button onClick={() => setRange("1week")} className="px-3 py-1 border rounded">1 Week</button>
        <button onClick={() => setRange("1month")} className="px-3 py-1 border rounded">1 Month</button>
      </div>
      <div ref={chartContainerRef} />
    </div>
  );
}