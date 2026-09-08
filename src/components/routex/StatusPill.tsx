import { roadStatusMeta, type RoadStatus } from "@/lib/mock-data";

export function StatusDot({ status, size = 8 }: { status: RoadStatus; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: roadStatusMeta[status].colorVar,
        boxShadow: `0 0 10px ${roadStatusMeta[status].colorVar}`,
      }}
    />
  );
}

export function StatusPill({ status, label }: { status: RoadStatus; label?: string }) {
  return (
    <span className="glass-soft inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide">
      <StatusDot status={status} />
      <span style={{ color: roadStatusMeta[status].colorVar }}>
        {label ?? roadStatusMeta[status].label}
      </span>
    </span>
  );
}
