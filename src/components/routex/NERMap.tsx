import { useState } from "react";
import {
  corridors,
  incidents,
  nerStates,
  roadStatusMeta,
  vehicles,
  type RoadStatus,
} from "@/lib/mock-data";
import { StatusPill } from "@/components/routex/StatusPill";

type Selection =
  | { kind: "corridor"; id: string }
  | { kind: "vehicle"; id: string }
  | { kind: "incident"; id: string }
  | { kind: "state"; id: string }
  | null;

export function NERMap() {
  const [selected, setSelected] = useState<Selection>(null);
  const [layers, setLayers] = useState({ vehicles: true, incidents: true, weather: true });

  const detail = (() => {
    if (!selected) return null;
    if (selected.kind === "corridor") {
      const c = corridors.find((x) => x.id === selected.id)!;
      return { title: c.name, lines: [roadStatusMeta[c.status].label, c.note], status: c.status };
    }
    if (selected.kind === "vehicle") {
      const v = vehicles.find((x) => x.id === selected.id)!;
      return {
        title: `${v.label} · ${v.id}`,
        lines: [`Driver ${v.driver}`, `Cargo: ${v.cargo}`],
        status: v.status,
      };
    }
    if (selected.kind === "incident") {
      const i = incidents.find((x) => x.id === selected.id)!;
      return {
        title: `${i.type} · ${i.place}`,
        lines: [`Severity ${i.severity}`, `${i.reportedBy} · ${i.ago}`],
        status: undefined as RoadStatus | undefined,
      };
    }
    const s = nerStates.find((x) => x.id === selected.id)!;
    return { title: s.name, lines: ["Tap corridors and markers for details"], status: undefined };
  })();

  return (
    <div className="glass relative h-full min-h-[340px] sm:min-h-[420px] w-full overflow-hidden rounded-2xl">
      <svg
        viewBox="0 0 1000 620"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-label="Interactive map of India's North Eastern Region showing road status, convoys and incidents"
      >
        <defs>
          <radialGradient id="rxWeather" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--status-risk)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--status-risk)" stopOpacity="0" />
          </radialGradient>
          <pattern id="rxGrid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="var(--terrain-line)" strokeWidth="0.6" />
          </pattern>
        </defs>

        <rect width="1000" height="620" fill="url(#rxGrid)" />

        {nerStates.map((s) => {
          const active = selected?.kind === "state" && selected.id === s.id;
          return (
            <g key={s.id} className="cursor-pointer" onClick={() => setSelected({ kind: "state", id: s.id })}>
              <polygon
                points={s.points}
                fill="var(--terrain)"
                fillOpacity={active ? 0.95 : 0.7}
                stroke="var(--primary)"
                strokeOpacity={active ? 0.9 : 0.35}
                strokeWidth={active ? 2 : 1.2}
              />
              <text
                x={s.labelAt[0]}
                y={s.labelAt[1]}
                textAnchor="middle"
                className="pointer-events-none select-none"
                fill="var(--muted-foreground)"
                fontSize="15"
                letterSpacing="1"
              >
                {s.short}
              </text>
            </g>
          );
        })}

        {layers.weather ? (
          <g className="pointer-events-none">
            <circle cx="760" cy="180" r="150" fill="url(#rxWeather)" />
            <circle cx="820" cy="300" r="110" fill="url(#rxWeather)" />
            <circle cx="200" cy="150" r="90" fill="url(#rxWeather)" />
          </g>
        ) : null}

        {corridors.map((c) => (
          <g key={c.id} className="cursor-pointer" onClick={() => setSelected({ kind: "corridor", id: c.id })}>
            <path d={c.path} stroke="transparent" strokeWidth="18" fill="none" />
            <path
              d={c.path}
              stroke={roadStatusMeta[c.status].colorVar}
              strokeWidth={selected?.kind === "corridor" && selected.id === c.id ? 6 : 4}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={c.status === "blocked" ? "10 9" : undefined}
              opacity="0.95"
            />
          </g>
        ))}

        {layers.incidents
          ? incidents.map((i) => (
              <g
                key={i.id}
                className="cursor-pointer"
                onClick={() => setSelected({ kind: "incident", id: i.id })}
              >
                <circle cx={i.at[0]} cy={i.at[1]} r="16" fill="var(--status-blocked)" opacity="0.18" />
                <circle
                  cx={i.at[0]}
                  cy={i.at[1]}
                  r="6.5"
                  fill="var(--status-blocked)"
                  stroke="var(--background)"
                  strokeWidth="1.6"
                />
              </g>
            ))
          : null}

        {layers.vehicles
          ? vehicles.map((v) => (
              <g
                key={v.id}
                className="cursor-pointer"
                onClick={() => setSelected({ kind: "vehicle", id: v.id })}
              >
                <rect
                  x={v.at[0] - 9}
                  y={v.at[1] - 7}
                  width="18"
                  height="14"
                  rx="4"
                  fill="var(--primary)"
                  stroke="var(--background)"
                  strokeWidth="1.6"
                />
                <circle cx={v.at[0]} cy={v.at[1]} r="2" fill="var(--background)" />
              </g>
            ))
          : null}
      </svg>

      {/* Legend */}
      <div className="glass-soft absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-3 py-2 text-xs font-semibold z-10">
        {(Object.keys(roadStatusMeta) as RoadStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span
              className="h-2 w-4 sm:w-5 rounded-full"
              style={{ backgroundColor: roadStatusMeta[s].colorVar }}
            />
            <span className="text-foreground/85 font-medium">{roadStatusMeta[s].label}</span>
          </span>
        ))}
      </div>

      {/* Layer toggles */}
      <div className="glass-soft absolute right-2 sm:right-3 top-2 sm:top-3 flex flex-col gap-1 rounded-xl p-1.5 z-10">
        {(
          [
            ["vehicles", "Vehicles"],
            ["incidents", "Incidents"],
            ["weather", "Weather"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
            className={`rounded-lg px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold transition-colors ${
              layers[key] ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Selection detail */}
      {detail ? (
        <div className="glass absolute left-2 sm:left-3 top-2 sm:top-3 max-w-[calc(100%-6rem)] sm:max-w-[18rem] rounded-xl p-3 z-20 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-foreground">{detail.title}</p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full glass-soft text-xs text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="mt-1 space-y-0.5">
            {detail.lines.map((l) => (
              <p key={l} className="text-xs text-muted-foreground font-medium">
                {l}
              </p>
            ))}
          </div>
          {detail.status ? (
            <div className="mt-2">
              <StatusPill status={detail.status} />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="glass-soft absolute left-2 sm:left-3 top-2 sm:top-3 rounded-xl px-3 py-2 text-xs text-muted-foreground font-medium z-10 hidden sm:block">
          Tap a corridor, convoy or incident
        </p>
      )}
    </div>
  );
}
