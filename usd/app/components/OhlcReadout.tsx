"use client";

export interface Readout {
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
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
      <span className="text-[10px] font-medium uppercase tracking-wider text-[#8b93a7] max-[512px]:text-[8px] max-[512px]:tracking-normal sm:text-xs">
        {label}
      </span>
      <span
        className={`font-mono text-sm font-bold tabular-nums max-[512px]:text-[11px] sm:text-lg ${colorClass}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function OhlcReadout({ open, high, low, close }: Readout) {
  return (
    <div className="flex flex-nowrap items-start justify-end gap-x-3 whitespace-nowrap max-[512px]:gap-x-1 sm:gap-x-8">
      <ValueGroup label="Open" value={format(open)} colorClass="text-[#e6e9ef]" />
      <ValueGroup label="High" value={format(high)} colorClass="text-[#26c281]" />
      <ValueGroup label="Low" value={format(low)} colorClass="text-[#f0616d]" />
      <ValueGroup label="Close" value={format(close)} colorClass="text-[#e6e9ef]" />
    </div>
  );
}
