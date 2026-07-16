interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface SMAPoint {
  time: number;
  value: number;
}

export function calculateSMA(candles: Candle[], period: number): SMAPoint[] {
  const result: SMAPoint[] = [];

  for(let i = period - 1; i < candles.length; i++){
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].close;
    }
    result.push({
      time: candles[i].time,
      value: sum / period,
    });
  }

  return result;
}