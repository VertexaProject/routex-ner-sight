import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/routex/AppHeader";
import { Panel } from "@/components/routex/Panel";
import { StatusPill, StatusDot } from "@/components/routex/StatusPill";
import { driverRoute, roadStatusMeta } from "@/lib/mock-data";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "Convoy Route — RouteX Driver View" },
      {
        name: "description",
        content:
          "RouteX in-cab view: current route, destination, ETA, live road status, hazard warnings and a recommended alternate route.",
      },
      { property: "og:title", content: "Convoy Route — RouteX Driver View" },
      {
        property: "og:description",
        content:
          "Live road status, hazard warnings and alternate routing guidance for convoy drivers in the North Eastern Region.",
      },
    ],
  }),
  component: DriverScreen,
});

function DriverScreen() {
  const r = driverRoute;
  const [useAlternate, setUseAlternate] = useState(false);

  return (
    <div className="min-h-screen">
      <AppHeader role="Convoy Driver" subtitle={`${r.convoyId} · ${r.driver}`} />

      <main className="mx-auto grid max-w-3xl gap-3 px-4 pb-10 pt-4 sm:px-6">
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Current route
              </p>
              <h1 className="mt-1 font-display text-xl font-semibold">
                {useAlternate ? r.alternate.name : r.routeName}
              </h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {r.origin} → {r.destination}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">ETA</p>
              <p className="font-display text-2xl font-semibold">
                {useAlternate ? r.alternate.eta : r.eta}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {useAlternate ? "Arrives ~17:05 IST" : `Arrives ${r.arrivalAt}`}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="glass-soft rounded-xl px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">Destination</p>
              <p className="text-[13px]">{r.destination}</p>
            </div>
            <div className="glass-soft rounded-xl px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">Distance left</p>
              <p className="text-[13px]">{useAlternate ? "52 km" : r.distanceLeft}</p>
            </div>
            <div className="glass-soft rounded-xl px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">Road status</p>
              <p className="text-[13px]" style={{ color: roadStatusMeta[useAlternate ? r.alternate.status : r.status].colorVar }}>
                {roadStatusMeta[useAlternate ? r.alternate.status : r.status].label}
              </p>
            </div>
          </div>
        </Panel>

        <section
          className="glass rounded-2xl p-4"
          style={{ borderColor: "var(--status-blocked)" }}
        >
          <div className="flex items-start gap-3">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full"
              style={{ backgroundColor: "var(--status-blocked)" }}
            />
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--status-blocked)" }}>
                Hazard warning · {r.hazard.severity}
              </p>
              <p className="mt-1 text-[15px] font-semibold">{r.hazard.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{r.hazard.detail}</p>
            </div>
          </div>
        </section>

        <Panel title="Road status ahead" bodyClassName="p-2">
          <ul className="divide-y divide-border/60">
            {r.legs.map((leg) => (
              <li key={leg.name} className="flex items-center justify-between gap-3 px-2 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <StatusDot status={leg.status} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px]">{leg.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{leg.note}</p>
                  </div>
                </div>
                <StatusPill status={leg.status} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Alternate route">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[15px] font-semibold">{r.alternate.name}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{r.alternate.note}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                ETA {r.alternate.eta} · {r.alternate.extra}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUseAlternate((v) => !v)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 ${
                useAlternate
                  ? "glass-soft text-muted-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {useAlternate ? "Back to NH-2" : "Switch to alternate"}
            </button>
          </div>
        </Panel>
      </main>
    </div>
  );
}
