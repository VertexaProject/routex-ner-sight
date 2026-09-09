import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/routex/AppHeader";
import { AuthorityMap } from "@/components/routex/AuthorityMap";
import { HazardNotificationDrawer } from "@/components/routex/HazardNotificationDrawer";
import { StatusPill } from "@/components/routex/StatusPill";
import { useI18n } from "@/lib/i18n";
import {
  affectedDeliveries,
  alerts,
  authorityStats,
  incidents,
  weatherSummary,
} from "@/lib/mock-data";
import {
  AlertTriangle,
  Bell,
  CloudRain,
  Package,
  Radio,
  Truck,
  Wind,
  ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/authority")({
  head: () => ({
    meta: [
      { title: "Authority Dashboard — RouteX NER Control Room" },
      {
        name: "description",
        content:
          "Region-wide RouteX dashboard: real Google Maps road status across the eight North Eastern states, convoy positions, incidents, weather risk and affected deliveries.",
      },
      { property: "og:title", content: "Authority Dashboard — RouteX NER Control Room" },
      {
        property: "og:description",
        content:
          "Live real Google Maps road status, convoy tracking, incident feed and delivery impact for the North Eastern Region.",
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
  low: "var(--status-open)",
};

type MobileTab = "alerts" | "weather" | "deliveries" | "incidents";

function AlertsList() {
  return (
    <ul className="divide-y divide-border/60">
      {alerts.map((a) => (
        <li key={a.id} className="flex gap-2.5 px-3 py-2 hover:bg-black/[0.02] transition-colors">
          <span
            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full animate-pulse"
            style={{
              backgroundColor: levelColor[a.level],
              boxShadow: `0 0 6px ${levelColor[a.level]}`,
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-1.5">
              <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug truncate">
                {a.title}
              </p>
              <span className="shrink-0 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {a.ago} ago
              </span>
            </div>
            <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {a.detail}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function WeatherList() {
  return (
    <div className="flex flex-col h-full">
      {/* Weather Alert Headline */}
      <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-1.5 shrink-0">
        <Wind className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        <span className="text-[11px] font-semibold text-amber-900 truncate">
          Monsoon Watch: High landslide risk on NH-29 & NH-2
        </span>
      </div>

      <ul className="divide-y divide-border/60 flex-1 overflow-y-auto">
        {weatherSummary.map((w) => (
          <li
            key={w.region}
            className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-black/[0.02] transition-colors"
          >
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{w.region}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {w.condition} · {w.rainfall}
              </p>
            </div>
            <span
              className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md glass-soft shrink-0"
              style={{ color: riskColor[w.risk] }}
            >
              {w.risk} Risk
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IncidentsList() {
  return (
    <ul className="divide-y divide-border/60">
      {incidents.map((i) => (
        <li key={i.id} className="px-3 py-2 hover:bg-black/[0.02] transition-colors">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{i.type}</p>
            <span
              className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md glass-soft shrink-0"
              style={{ color: levelColor[i.severity.toLowerCase()] || "var(--status-caution)" }}
            >
              {i.severity}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="truncate">{i.place}</span>
            <span className="shrink-0">{i.ago}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DeliveriesList() {
  return (
    <ul className="divide-y divide-border/60">
      {affectedDeliveries.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-black/[0.02] transition-colors">
          <div className="min-w-0">
            <p className="truncate text-xs sm:text-sm font-semibold text-foreground">{d.cargo}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {d.id} → {d.to}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <StatusPill status={d.status} />
            <span className="text-[11px] font-semibold text-foreground/85">{d.delay}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AuthorityDashboard() {
  const { t } = useI18n();
  const [mobileTab, setMobileTab] = useState<MobileTab>("alerts");
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col lg:h-screen lg:overflow-hidden bg-background">
      <AppHeader
        role={t("role_authority")}
        subtitle="NER Control Room · Guwahati"
        onOpenNotifications={() => setDrawerOpen(true)}
      />

      <HazardNotificationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <main className="flex-1 min-h-0 min-w-0 flex flex-col px-3 py-2 sm:px-5 sm:py-2.5 w-full max-w-[1800px] mx-auto overflow-hidden">
        {/* Top metrics bar: Compact, glanceable, high visibility (~46px) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 shrink-0">
          {authorityStats.map((s, idx) => {
            const labels = [t("stat_convoys"), t("stat_incidents"), t("stat_blocked"), t("stat_reach")];
            const displayLabel = labels[idx] || s.label;
            return (
              <div
                key={s.label}
                className="glass rounded-xl px-3.5 py-1.5 sm:py-2 flex items-center justify-between shadow-sm"
              >
                <div>
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-snug truncate">
                    {displayLabel}
                  </p>
                  <p className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-tight">
                    {s.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop 3-Column Command Layout: Visual Center is Large Real NER Google Map */}
        <div className="mt-2 flex-1 min-h-0 min-w-0 hidden lg:grid gap-2.5 lg:grid-cols-[17.5rem_minmax(0,1fr)_18.5rem] xl:grid-cols-[19.5rem_minmax(0,1fr)_20.5rem] items-stretch overflow-hidden">
          {/* Left Column: Active Alerts & Open Incidents */}
          <div className="h-full min-h-0 flex flex-col gap-2.5 overflow-hidden">
            {/* Active Alerts Panel */}
            <section className="glass rounded-2xl flex flex-col flex-1 min-h-0 overflow-hidden shadow-sm">
              <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3.5 py-2 shrink-0 bg-white/60">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--status-blocked)" }}
                  />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Active Alerts
                  </h2>
                </div>
                <span className="glass-soft rounded-full px-2 py-0.5 text-[10px] font-bold text-primary">
                  {alerts.length} active
                </span>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto p-1 scrollbar-thin">
                <AlertsList />
              </div>
            </section>

            {/* Open Incidents Panel */}
            <section className="glass rounded-2xl flex flex-col flex-1 min-h-0 overflow-hidden shadow-sm">
              <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3.5 py-2 shrink-0 bg-white/60">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Open Incidents
                  </h2>
                </div>
                <span className="glass-soft rounded-full px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50">
                  {incidents.length} logs
                </span>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto p-1 scrollbar-thin">
                <IncidentsList />
              </div>
            </section>
          </div>

          {/* Center Column: Large Real NER Google Map (Visual Center) */}
          <div className="h-full min-h-0 min-w-0 flex flex-col rounded-2xl overflow-hidden shadow-lg border border-border/80">
            <AuthorityMap />
          </div>

          {/* Right Column: Dedicated Weather & Regional Risk + Deliveries Impact */}
          <div className="h-full min-h-0 flex flex-col gap-2.5 overflow-hidden">
            {/* Dedicated Weather & Regional Risk Section */}
            <section className="glass rounded-2xl flex flex-col flex-1 min-h-0 overflow-hidden shadow-sm">
              <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3.5 py-2 shrink-0 bg-white/60">
                <div className="flex items-center gap-2">
                  <CloudRain className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Weather & Regional Risk
                  </h2>
                </div>
                <span className="glass-soft rounded-full px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-50">
                  {weatherSummary.length} sectors
                </span>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                <WeatherList />
              </div>
            </section>

            {/* Deliveries & Logistics Impact Panel */}
            <section className="glass rounded-2xl flex flex-col flex-1 min-h-0 overflow-hidden shadow-sm">
              <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3.5 py-2 shrink-0 bg-white/60">
                <div className="flex items-center gap-2">
                  <Truck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Deliveries Impact
                  </h2>
                </div>
                <span className="glass-soft rounded-full px-2 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50">
                  {affectedDeliveries.length} tracked
                </span>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto p-1 scrollbar-thin">
                <DeliveriesList />
              </div>
            </section>
          </div>
        </div>

        {/* Mobile / Tablet Responsive Fallback Layout */}
        <div className="mt-2.5 flex-1 min-h-0 flex flex-col lg:hidden gap-2.5 overflow-y-auto pb-6">
          {/* Map on Mobile / Tablet */}
          <div className="h-[360px] sm:h-[430px] min-h-[340px] shrink-0 rounded-2xl overflow-hidden shadow-md border border-border/80">
            <AuthorityMap />
          </div>

          {/* Tab Switcher for Mobile */}
          <div className="glass-soft rounded-xl p-1 grid grid-cols-4 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab("alerts")}
              className={`rounded-lg py-1.5 px-1 text-[11px] font-bold transition-all text-center truncate ${
                mobileTab === "alerts"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Alerts ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("weather")}
              className={`rounded-lg py-1.5 px-1 text-[11px] font-bold transition-all text-center truncate ${
                mobileTab === "weather"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Weather ({weatherSummary.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("deliveries")}
              className={`rounded-lg py-1.5 px-1 text-[11px] font-bold transition-all text-center truncate ${
                mobileTab === "deliveries"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Deliveries ({affectedDeliveries.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("incidents")}
              className={`rounded-lg py-1.5 px-1 text-[11px] font-bold transition-all text-center truncate ${
                mobileTab === "incidents"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Incidents ({incidents.length})
            </button>
          </div>

          {/* Active Tab Panel on Mobile */}
          <div className="glass rounded-2xl p-2 shadow-sm min-h-[220px]">
            {mobileTab === "alerts" && <AlertsList />}
            {mobileTab === "weather" && <WeatherList />}
            {mobileTab === "deliveries" && <DeliveriesList />}
            {mobileTab === "incidents" && <IncidentsList />}
          </div>
        </div>
      </main>
    </div>
  );
}
