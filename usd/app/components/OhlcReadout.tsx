"use client";

export interface Readout {
  open: number | null;
  high: number | null;
  low: number | null;
  sma: number | null;
}

function format(value: number | null): string {
  return value != null && Number.isFinite(value) ? value.toFixed(2) : "—";
}

interface ValueGroupProps {
  label: string;
  value: string;
  colorClass: string;
}

function ValueGroup({ label, value, colorClass }: ValueGroupProps) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-medium uppercase tracking-wider text-[#8b93a7] sm:text-xs">
        {label}
      </span>
      <span
        className={`font-mono text-sm font-bold tabular-nums sm:text-lg ${colorClass}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function OhlcReadout({ open, high, low, sma }: Readout) {
  return (
    <div className="flex flex-nowrap items-start justify-end gap-x-3 whitespace-nowrap sm:gap-x-8">
      <ValueGroup label="Open" value={format(open)} colorClass="text-[#e6e9ef]" />
      <ValueGroup label="High" value={format(high)} colorClass="text-[#26c281]" />
      <ValueGroup label="Low" value={format(low)} colorClass="text-[#f0616d]" />
      <ValueGroup label="SMA 20" value={format(sma)} colorClass="text-[#e6e9ef]" />
    </div>
  );
}
