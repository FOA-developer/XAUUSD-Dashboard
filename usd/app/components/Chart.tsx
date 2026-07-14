"use client"

import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export default function Chart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if(!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      width: 1000,
      height: 400,
    });

    const candleSeries = chart.addSeries(CandlestickSeries);

    async function loadData() {
      const response = await fetch("api/gold-data");
      const rawData = await response.json();

      const formatted : Candle[ ] = rawData.map((item: any) => ({
        time: item.datetime,
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
      })) 

      .reverse();

      candleSeries.setData(formatted);
    }

    loadData();

    return () => {
      chart.remove();
    };
  }, []);

  return <div ref={chartContainerRef} />;
}