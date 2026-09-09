import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  supabase,
  fetchLatestIncidents,
  fetchLatestAlerts,
  enrichAlertsWithIncidents,
  isAlertActive,
  normalizeRoadToCorridorId,
  sortAlertsNewestActiveFirst,
  formatAlertTime,
  type SupabaseIncident,
  type SupabaseAlert,
  type EnrichedSupabaseAlert,
} from "@/lib/supabase-service";
import { AppHeader } from "@/components/routex/AppHeader";
import { AuthorityMap } from "@/components/routex/AuthorityMap";
import { HazardNotificationDrawer } from "@/components/routex/HazardNotificationDrawer";
import { StatusPill } from "@/components/routex/StatusPill";
import { useI18n } from "@/lib/i18n";
import { RoleGuard } from "@/components/routex/RoleGuard";
import { useRerouteWorkflow } from "@/lib/route-store";
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
  MapPin,
  CheckCircle2,
  ShieldCheck,
  X,
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
  component: () => (
    <RoleGuard allowedRole="authority">
      <AuthorityDashboard />
    </RoleGuard>
  ),
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

function LatestIncidentAlertCard({
  incident,
  onSelectRoad,
}: {
  incident: SupabaseIncident;
  onSelectRoad?: (roadId: string) => void;
}) {
  const isCritical = incident.severity === "Critical";
  const isLandslide = incident.incident_type?.toLowerCase().includes("landslide");
  const isBlocked = isCritical && isLandslide;

  return (
    <div
      onClick={() => onSelectRoad?.(incident.road_id)}
      className={`mx-1 my-1.5 p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
        isBlocked
          ? "bg-rose-50/90 border-rose-300 ring-2 ring-rose-500/20"
          : isCritical
            ? "bg-red-50/80 border-red-300"
            : "bg-amber-50/80 border-amber-300"
      }`}
      title="Click to highlight affected highway corridor on Google Map"
    >
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="h-2.5 w-2.5 rounded-full animate-pulse shrink-0"
            style={{ backgroundColor: isCritical ? "var(--status-blocked)" : "var(--status-risk)" }}
          />
          <span className="text-xs font-black uppercase tracking-wider text-slate-900 truncate">
            {incident.incident_type}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-primary/15 text-primary shrink-0">
            {incident.road_id}
          </span>
        </div>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
            isCritical ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"
          }`}
        >
          {incident.severity}
        </span>
      </div>

      {isBlocked && (
        <div className="mb-2 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-black flex items-center justify-between shadow-xs animate-pulse">
          <span>ROAD BLOCKED TO CONVOYS</span>
          <span className="text-[10px] uppercase font-bold tracking-wider">Reroute Advised</span>
        </div>
      )}

      <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">
        {incident.description}
      </p>

      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-600 font-semibold pt-1.5 border-t border-black/5">
        <span className="flex items-center gap-1 truncate">
          <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
          <span>
            {typeof incident.latitude === "number" && typeof incident.longitude === "number"
              ? `${incident.latitude.toFixed(4)}° N, ${incident.longitude.toFixed(4)}° E`
              : "Field location"}
          </span>
        </span>
        <span className="shrink-0 text-primary font-bold">
          Field Report · Live
        </span>
      </div>
    </div>
  );
}

export interface StaticDemoAlert {
  id: string;
  title: string;
  message: string;
  severity: "Critical" | "High" | "Moderate" | "Low";
  alert_type: string;
  road_id: string;
  road: string;
  location: string;
  status: "active" | "rerouted";
  delayEstimate: string;
  recommendedAction: string;
  affectedVehicles: string[];
  affectedDeliveries: string[];
  created_at: string;
}

export const STATIC_DEMO_ALERTS: StaticDemoAlert[] = [
  {
    id: "demo-alert-nh6",
    title: "Critical Landslide — NH-6, Meghalaya",
    alert_type: "Critical Landslide",
    road_id: "NH-6",
    road: "NH-6",
    location: "Sonapur Tunnel Sector, East Jaintia Hills, Meghalaya",
    severity: "Critical",
    status: "active",
    message: "Massive mudslide and boulder debris obstructing both lanes near Sonapur tunnel. Complete corridor blockage for heavy vehicles and convoys.",
    delayEstimate: "45–90 min holding time",
    recommendedAction: "Authorize emergency reroute away from NH-6 Sonapur stretch immediately",
    affectedVehicles: ["Convoy #NER-42 (Silchar Medical Supplies)", "3 Military Freight Transports"],
    affectedDeliveries: ["Emergency pharmaceuticals to Silchar CHC", "Essential petroleum reserves"],
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-alert-nh10",
    title: "Heavy Rainfall — NH-10, Sikkim",
    alert_type: "Heavy Rainfall",
    road_id: "NH-10",
    road: "NH-10",
    location: "Rangpo – Teesta Lowlands, Sikkim",
    severity: "High",
    status: "active",
    message: "Flash torrential rainfall exceeding 85 mm/h causing waterlogging and low visibility along Teesta riverbank stretch. Speed advisory 25 km/h in effect.",
    delayEstimate: "20–30 min caution delay",
    recommendedAction: "Maintain convoy separation and engage headlight warning protocols",
    affectedVehicles: ["Gangtok Logistics Fleet DL-3391", "2 Civilian Rations Carriers"],
    affectedDeliveries: ["Rations and grain to Gangtok civil depot"],
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: "demo-alert-nh2",
    title: "Road Damage — NH-2, Nagaland",
    alert_type: "Road Damage",
    road_id: "NH-2",
    road: "NH-2",
    location: "Km 38, Piphema Valley, Nagaland",
    severity: "Moderate",
    status: "active",
    message: "Partial shoulder subsidence and tarmac cracks at km 38. Single-lane escorted movement enabled for light commercial vehicles.",
    delayEstimate: "15–20 min single-lane queue",
    recommendedAction: "Divert heavy freight via NH-29 Medziphema alternate bypass",
    affectedVehicles: ["Kohima Supply Convoy AS-01-E"],
    affectedDeliveries: ["Surgical supplies to Kohima South Hospital"],
    created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
  },
];

function DemoAlertCard({
  alert,
  isAuthorized,
  onAuthorize,
  onSelectRoad,
}: {
  alert: StaticDemoAlert;
  isAuthorized: boolean;
  onAuthorize: (id: string) => void;
  onSelectRoad?: (roadId: string) => void;
}) {
  const isCritical = alert.severity === "Critical";
  const isHigh = alert.severity === "High";
  const roadCorridor = normalizeRoadToCorridorId(alert.road_id);

  return (
    <div
      onClick={() => onSelectRoad?.(roadCorridor)}
      className={`mx-1 my-1.5 p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
        isAuthorized
          ? "bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-500/20"
          : isCritical
            ? "bg-rose-50/90 border-rose-300 ring-1 ring-rose-500/20"
            : isHigh
              ? "bg-amber-50/80 border-amber-300"
              : "bg-slate-50 border-slate-200"
      }`}
      title="Click to highlight affected highway corridor on Google Map"
    >
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
              isAuthorized
                ? "bg-emerald-600"
                : isCritical
                  ? "bg-rose-600 animate-pulse"
                  : "bg-amber-500"
            }`}
          />
          <span className="text-xs font-black uppercase tracking-wider text-slate-900 truncate">
            {alert.alert_type}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-primary/15 text-primary shrink-0">
            {alert.road_id}
          </span>
        </div>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
            isAuthorized
              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
              : isCritical
                ? "bg-red-200 text-red-800"
                : "bg-amber-200 text-amber-800"
          }`}
        >
          {isAuthorized ? "Authorized" : alert.severity}
        </span>
      </div>

      {isCritical && !isAuthorized && (
        <div className="mb-2 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-black flex items-center justify-between shadow-xs animate-pulse">
          <span>ROAD BLOCKED TO CONVOYS</span>
          <span className="text-[10px] uppercase font-bold tracking-wider">Reroute Advised</span>
        </div>
      )}

      {isAuthorized && (
        <div className="mb-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-between shadow-xs">
          <span>✓ REROUTE AUTHORIZED</span>
          <span className="text-[10px] font-semibold">Traffic Diverted</span>
        </div>
      )}

      <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">
        {alert.message}
      </p>

      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-600 font-semibold pt-1.5 border-t border-black/5">
        <span className="flex items-center gap-1 truncate">
          <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
          <span className="truncate">{alert.location}</span>
        </span>
        <span className="shrink-0 text-primary font-bold">
          {formatAlertTime(alert.created_at)}
        </span>
      </div>

      {/* Clear Authorize Reroute button on Critical Landslide */}
      {isCritical && (
        <div className="mt-2.5 pt-2 border-t border-black/5">
          {!isAuthorized ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAuthorize(alert.id);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Authorize Reroute</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1.5 rounded-lg border border-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>✓ Reroute Authorized: Traffic diverted to alternate corridor</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AlertsList({
  demoAlerts = STATIC_DEMO_ALERTS,
  authorizedAlertIds = [],
  onAuthorizeReroute,
  onSelectRoad,
}: {
  demoAlerts?: StaticDemoAlert[];
  authorizedAlertIds?: string[];
  onAuthorizeReroute?: (alertId: string) => void;
  onSelectRoad?: (roadId: string) => void;
}) {
  return (
    <div className="space-y-1">
      {demoAlerts.map((alert) => (
        <DemoAlertCard
          key={alert.id}
          alert={alert}
          isAuthorized={authorizedAlertIds.includes(alert.id)}
          onAuthorize={onAuthorizeReroute || (() => {})}
          onSelectRoad={onSelectRoad}
        />
      ))}
    </div>
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

function IncidentsList({
  supabaseIncidents = [],
}: {
  supabaseIncidents?: SupabaseIncident[];
}) {
  return (
    <ul className="divide-y divide-border/60">
      {supabaseIncidents.map((i) => (
        <li key={i.id} className="px-3 py-2 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs sm:text-sm font-bold text-foreground truncate">
              {i.incident_type} <span className="text-primary font-bold">({i.road_id})</span>
            </p>
            <span
              className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md glass-soft shrink-0"
              style={{ color: levelColor[i.severity.toLowerCase()] || "var(--status-caution)" }}
            >
              {i.severity}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
            {i.description}
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span className="truncate">
              {typeof i.latitude === "number" && typeof i.longitude === "number"
                ? `${i.latitude.toFixed(3)}° N, ${i.longitude.toFixed(3)}° E`
                : "Field GPS"}
            </span>
            <span className="shrink-0 font-semibold text-primary">Live Field Sync</span>
          </div>
        </li>
      ))}
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
  const { unreadCount: storeUnreadCount } = useRerouteWorkflow();
  const [mobileTab, setMobileTab] = useState<MobileTab>("alerts");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Static Demo NER Alerts state (for SIH Presentation)
  const [authorizedAlertIds, setAuthorizedAlertIds] = useState<string[]>([]);
  const [highlightedRoadId, setHighlightedRoadId] = useState<string | null>("nh6");

  // Optional background incident polling for map markers
  const [supabaseIncidents, setSupabaseIncidents] = useState<SupabaseIncident[]>([]);

  const isNh6Authorized = authorizedAlertIds.includes("demo-alert-nh6");

  const handleAuthorizeReroute = useCallback((alertId: string) => {
    setAuthorizedAlertIds((prev) => (prev.includes(alertId) ? prev : [...prev, alertId]));
  }, []);

  // Background incidents sync for map markers
  useEffect(() => {
    let isCancelled = false;
    async function pollIncidents() {
      try {
        const { data: incidentsData } = await supabase
          .from("incidents")
          .select("*")
          .order("created_at", { ascending: false });
        if (!isCancelled && incidentsData && Array.isArray(incidentsData)) {
          setSupabaseIncidents(incidentsData as unknown as SupabaseIncident[]);
        }
      } catch (err) {
        console.error("[pollIncidents exception]", err);
      }
    }

    pollIncidents();
    const interval = setInterval(pollIncidents, 10000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Blocked Corridors: NH-6 blocked by default until rerouted; NH-108 blocked
  const blockedCorridorsCount = isNh6Authorized ? 3 : 4;
  const blockedRoadIds = useMemo(() => {
    return isNh6Authorized ? ["nh108"] : ["nh108", "nh6"];
  }, [isNh6Authorized]);

  // Static demo alerts unread count (SIH presentation: 3 active alerts)
  const notificationCount = STATIC_DEMO_ALERTS.length;

  return (
    <div className="min-h-screen flex flex-col lg:h-screen lg:overflow-hidden bg-background">
      <AppHeader
        role={t("role_authority")}
        subtitle="NER Control Room · Guwahati"
        onOpenNotifications={() => {
          setDrawerOpen(true);
        }}
        unreadCount={notificationCount}
      />

      <HazardNotificationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        demoAlerts={STATIC_DEMO_ALERTS}
        authorizedAlertIds={authorizedAlertIds}
        onAuthorizeReroute={handleAuthorizeReroute}
      />

      <main className="flex-1 min-h-0 min-w-0 flex flex-col px-3 py-2 sm:px-5 sm:py-2.5 w-full max-w-[1800px] mx-auto overflow-hidden">
        {/* Top metrics bar: Compact, glanceable, high visibility (~46px) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 shrink-0">
          {authorityStats.map((s, idx) => {
            const labels = [t("stat_convoys"), t("stat_incidents"), t("stat_blocked"), t("stat_reach")];
            const displayLabel = labels[idx] || s.label;
            const displayValue = idx === 2 ? String(blockedCorridorsCount) : idx === 1 ? String(11 + supabaseIncidents.length) : s.value;
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
                    {displayValue}
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
                  {STATIC_DEMO_ALERTS.length} active
                </span>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto p-1 scrollbar-thin">
                <AlertsList
                  demoAlerts={STATIC_DEMO_ALERTS}
                  authorizedAlertIds={authorizedAlertIds}
                  onAuthorizeReroute={handleAuthorizeReroute}
                  onSelectRoad={(r) => setHighlightedRoadId(r)}
                />
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
                  {incidents.length + supabaseIncidents.length} logs
                </span>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto p-1 scrollbar-thin">
                <IncidentsList supabaseIncidents={supabaseIncidents} />
              </div>
            </section>
          </div>

          {/* Center Column: Large Real NER Google Map (Visual Center) */}
          <div className="h-full min-h-0 min-w-0 flex flex-col rounded-2xl overflow-hidden shadow-lg border border-border/80">
            <AuthorityMap
              highlightedRoadId={highlightedRoadId}
              blockedRoadIds={blockedRoadIds}
              liveIncidents={supabaseIncidents}
              onFocusCorridor={(c) => setHighlightedRoadId(c)}
            />
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
            <AuthorityMap
              highlightedRoadId={highlightedRoadId}
              blockedRoadIds={blockedRoadIds}
              liveIncidents={supabaseIncidents}
              onFocusCorridor={(c) => setHighlightedRoadId(c)}
            />
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
              Alerts ({STATIC_DEMO_ALERTS.length})
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
            {mobileTab === "alerts" && (
              <AlertsList
                demoAlerts={STATIC_DEMO_ALERTS}
                authorizedAlertIds={authorizedAlertIds}
                onAuthorizeReroute={handleAuthorizeReroute}
                onSelectRoad={(r) => setHighlightedRoadId(r)}
              />
            )}
            {mobileTab === "weather" && <WeatherList />}
            {mobileTab === "deliveries" && <DeliveriesList />}
            {mobileTab === "incidents" && <IncidentsList supabaseIncidents={supabaseIncidents} />}
          </div>
        </div>
      </main>
    </div>
  );
}
