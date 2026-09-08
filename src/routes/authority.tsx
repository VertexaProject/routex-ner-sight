import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/routex/AppHeader";
import { NERMap } from "@/components/routex/NERMap";
import { Panel } from "@/components/routex/Panel";
import { StatusPill } from "@/components/routex/StatusPill";
import {
  affectedDeliveries,
  alerts,
  authorityStats,
  incidents,
  weatherSummary,
} from "@/lib/mock-data";

export const Route = createFileRoute("/authority")({
  head: () => ({
    meta: [
      { title: "Authority Dashboard — RouteX NER Control Room" },
      {
        name: "description",
        content:
          "Region-wide RouteX dashboard: road status across the eight North Eastern states, convoy positions, incidents, weather risk and affected deliveries.",
      },
      { property: "og:title", content: "Authority Dashboard — RouteX NER Control Room" },
      {
        property: "og:description",
        content:
          "Live road status, convoy tracking, incident feed and delivery impact for the North Eastern Region.",
      },
    ],
  }),
  component: AuthorityDashboard,
});

const riskColor: Record<string, string> = {
  High: "var(--status-blocked)",
  Moderate: "var(--status-caution)",
  Low: "var(--status-open)",
};

const levelColor: Record<string, string> = {
  critical: "var(--status-blocked)",
  high: "var(--status-risk)",
  moderate: "var(--status-caution)",
};

function AuthorityDashboard() {
  return (
    <div className="min-h-screen">
      <AppHeader role="Authority" subtitle="NER Control Room · Guwahati" />

      <main className="px-4 pb-8 pt-4 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {authorityStats.map((s) => (
            <div key={s.label} className="glass rounded-2xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-h-[60vh] xl:min-h-[calc(100vh-13rem)]">
            <NERMap />
          </div>

          <div className="flex flex-col gap-3">
            <Panel title="Active alerts" bodyClassName="p-2">
              <ul className="divide-y divide-border/60">
                {alerts.map((a) => (
                  <li key={a.id} className="flex gap-3 px-2 py-2.5">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: levelColor[a.level] }}
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{a.title}</p>
                      <p className="text-[11px] text-muted-foreground">{a.detail}</p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                        {a.ago} ago
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Weather & risk" bodyClassName="p-2">
              <ul className="divide-y divide-border/60">
                {weatherSummary.map((w) => (
                  <li key={w.region} className="flex items-center justify-between gap-3 px-2 py-2">
                    <div>
                      <p className="text-[13px]">{w.region}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {w.condition} · {w.rainfall}
                      </p>
                    </div>
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: riskColor[w.risk] }}
                    >
                      {w.risk}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Recent incidents" bodyClassName="p-2">
              <ul className="divide-y divide-border/60">
                {incidents.map((i) => (
                  <li key={i.id} className="px-2 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium">{i.type}</p>
                      <span className="text-[11px] text-muted-foreground">{i.severity}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {i.place} · {i.ago}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Affected deliveries" bodyClassName="p-2">
              <ul className="divide-y divide-border/60">
                {affectedDeliveries.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px]">{d.cargo}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {d.id} → {d.to}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusPill status={d.status} />
                      <span className="text-[11px] text-muted-foreground">{d.delay}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}
