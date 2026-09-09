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
  alerts,
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
  Sparkles,
  Clock,
  ArrowRight,
  Activity,
  Network,
  Calendar,
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

type MobileTab = "alerts" | "emergency" | "timeline" | "connectivity" | "weather" | "deliveries" | "incidents";

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

interface EmergencySituation {
  id: string;
  roadId: string;
  corridorId: string;
  hazard: string;
  severity: "Critical" | "High" | "Medium";
  status: string;
  recommended: string;
  location: string;
}

const EMERGENCY_SITUATIONS: EmergencySituation[] = [
  {
    id: "demo-alert-nh6",
    roadId: "NH-6",
    corridorId: "nh6",
    hazard: "Landslide",
    severity: "Critical",
    status: "Road blocked",
    recommended: "Authorize alternate route",
    location: "Sonapur Tunnel, Meghalaya",
  },
  {
    id: "demo-alert-nh10",
    roadId: "NH-10",
    corridorId: "nh10",
    hazard: "Heavy Rainfall",
    severity: "High",
    status: "Travel caution",
    recommended: "Monitor corridor",
    location: "Rangpo Sector, Sikkim",
  },
  {
    id: "demo-alert-nh2",
    roadId: "NH-2",
    corridorId: "nh2",
    hazard: "Road Damage",
    severity: "Medium",
    status: "Partial disruption",
    recommended: "Reduce convoy speed",
    location: "Km 38, Piphema Valley, Nagaland",
  },
];

function EmergencySituationCard({
  situation,
  isAuthorized,
  onAuthorize,
  onViewDetails,
}: {
  situation: EmergencySituation;
  isAuthorized: boolean;
  onAuthorize?: (id: string) => void;
  onViewDetails?: (corridorId: string) => void;
}) {
  const isCritical = situation.severity === "Critical";
  const isHigh = situation.severity === "High";

  return (
    <div
      data-testid={`emergency-situation-${situation.roadId.toLowerCase().replace('-', '')}`}
      className={`mx-1 my-1 p-2 rounded-xl border transition-all shadow-2xs select-text ${
        situation.id === "demo-alert-nh6" && isAuthorized
          ? "bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-500/20"
          : isCritical
          ? "bg-rose-50/80 border-rose-200/90"
          : isHigh
          ? "bg-amber-50/70 border-amber-200/90"
          : "bg-slate-50/80 border-slate-200"
      }`}
    >
      {/* Top line: Road — Hazard + Severity Badge */}
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold text-slate-900 truncate">
            {situation.roadId} — {situation.hazard}
          </span>
        </div>
        <span
          className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold shrink-0 border ${
            situation.id === "demo-alert-nh6" && isAuthorized
              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : isCritical
              ? "bg-rose-100 text-rose-800 border-rose-200"
              : isHigh
              ? "bg-amber-100 text-amber-800 border-amber-200"
              : "bg-blue-100 text-blue-800 border-blue-200"
          }`}
        >
          {situation.id === "demo-alert-nh6" && isAuthorized ? "Authorized" : situation.severity}
        </span>
      </div>

      {/* Sub-status line: e.g. Critical • Road blocked */}
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-700 mb-0.5">
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
            situation.id === "demo-alert-nh6" && isAuthorized
              ? "bg-emerald-600"
              : isCritical
              ? "bg-rose-600 animate-pulse"
              : isHigh
              ? "bg-amber-500"
              : "bg-blue-500"
          }`}
        />
        <span>
          {situation.id === "demo-alert-nh6" && isAuthorized
            ? "Reroute Authorized • Traffic Diverted"
            : `${situation.severity} • ${situation.status}`}
        </span>
      </div>

      {/* Recommended line */}
      <p className="text-[10.5px] text-slate-600 leading-tight mb-1.5">
        <span className="font-bold text-slate-800">Recommended:</span>{" "}
        <span>{situation.recommended}</span>
      </p>

      {/* Action buttons: View Details & Authorize Reroute (for NH-6) */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-black/5">
        <button
          type="button"
          data-testid={`view-details-${situation.roadId.toLowerCase().replace('-', '')}`}
          onClick={() => onViewDetails?.(situation.corridorId)}
          className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[9.5px] font-bold shadow-2xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
        >
          <MapPin className="h-3 w-3 text-slate-500" />
          <span>View Details</span>
        </button>

        {situation.id === "demo-alert-nh6" && !isAuthorized && onAuthorize && (
          <button
            type="button"
            data-testid="emergency-authorize-btn"
            onClick={() => onAuthorize(situation.id)}
            className="px-2 py-0.5 bg-primary hover:bg-primary/90 text-white rounded-md text-[9.5px] font-bold shadow-2xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer ml-auto"
          >
            <ShieldCheck className="h-3 w-3" />
            <span>Authorize Reroute</span>
          </button>
        )}
      </div>
    </div>
  );
}

function EmergencyResponseList({
  situations = EMERGENCY_SITUATIONS,
  isNh6Authorized,
  onAuthorize,
  onViewDetails,
}: {
  situations?: EmergencySituation[];
  isNh6Authorized: boolean;
  onAuthorize?: (id: string) => void;
  onViewDetails?: (corridorId: string) => void;
}) {
  return (
    <div className="space-y-1">
      {situations.map((sit) => (
        <EmergencySituationCard
          key={sit.id}
          situation={sit}
          isAuthorized={isNh6Authorized}
          onAuthorize={onAuthorize}
          onViewDetails={onViewDetails}
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

interface CriticalDelivery {
  id: string;
  cargo: string;
  from: string;
  to: string;
  severity: "Critical" | "High" | "Moderate";
  eta: string;
}

const CRITICAL_DELIVERIES: CriticalDelivery[] = [
  {
    id: "RX-217",
    cargo: "Medical Supplies",
    from: "Dimapur",
    to: "Kohima",
    severity: "Critical",
    eta: "ETA 1h 25m",
  },
  {
    id: "RX-218",
    cargo: "Food Supplies",
    from: "Guwahati",
    to: "Pasighat",
    severity: "High",
    eta: "ETA 5h 10m",
  },
  {
    id: "RX-219",
    cargo: "Fuel",
    from: "Agartala",
    to: "Aizawl",
    severity: "High",
    eta: "ETA 4h 20m",
  },
];

function CriticalLogisticsList() {
  return (
    <div className="space-y-1 p-1">
      {CRITICAL_DELIVERIES.map((d) => {
        const isCritical = d.severity === "Critical";
        return (
          <div
            key={d.id}
            className={`p-2 rounded-xl border transition-all shadow-2xs ${
              isCritical
                ? "bg-rose-50/70 border-rose-200/90"
                : "bg-amber-50/60 border-amber-200/90"
            }`}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-primary/15 text-primary border border-primary/20 shrink-0">
                  {d.id}
                </span>
                <span className="text-xs font-bold text-slate-900 truncate">
                  {d.cargo}
                </span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 border ${
                  isCritical
                    ? "bg-rose-100 text-rose-800 border-rose-200"
                    : "bg-amber-100 text-amber-800 border-amber-200"
                }`}
              >
                {d.severity}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 font-medium pt-1 border-t border-black/5">
              <span className="flex items-center gap-1 truncate text-slate-700">
                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate">{d.from} → {d.to}</span>
              </span>
              <span className="flex items-center gap-1 shrink-0 font-bold text-slate-900">
                <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                <span>{d.eta}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface StateConnectivity {
  state: string;
  shortCode: string;
  status: "Connected" | "Caution" | "High Risk";
  corridorId?: string;
  detail?: string;
}

const NER_STATES_CONNECTIVITY: StateConnectivity[] = [
  { state: "Assam", shortCode: "AS", status: "Connected", corridorId: "nh27", detail: "Corridors operational" },
  { state: "Arunachal Pradesh", shortCode: "AR", status: "Connected", corridorId: "nh13", detail: "Corridors operational" },
  { state: "Manipur", shortCode: "MN", status: "Caution", corridorId: "nh37", detail: "Slow movement / escort" },
  { state: "Meghalaya", shortCode: "ML", status: "High Risk", corridorId: "nh6", detail: "NH-6 landslide blockage" },
  { state: "Mizoram", shortCode: "MZ", status: "Connected", corridorId: "nh54", detail: "Corridors operational" },
  { state: "Nagaland", shortCode: "NL", status: "Caution", corridorId: "nh2", detail: "NH-2 single-lane queue" },
  { state: "Sikkim", shortCode: "SK", status: "High Risk", corridorId: "nh10", detail: "NH-10 heavy rain alert" },
  { state: "Tripura", shortCode: "TR", status: "Connected", corridorId: "nh8", detail: "Corridors operational" },
];

function NerRegionalConnectivityList({
  onSelectRoad,
}: {
  onSelectRoad?: (roadId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 p-1.5">
      {NER_STATES_CONNECTIVITY.map((item) => {
        const isCaution = item.status === "Caution";
        const isHighRisk = item.status === "High Risk";

        return (
          <div
            key={item.state}
            data-testid={`state-connectivity-${item.shortCode.toLowerCase()}`}
            onClick={() => item.corridorId && onSelectRoad?.(item.corridorId)}
            className={`p-1.5 rounded-lg border transition-all flex flex-col justify-between text-xs cursor-pointer select-text hover:shadow-2xs active:scale-[0.98] ${
              isHighRisk
                ? "bg-rose-50/80 border-rose-200 hover:bg-rose-100/70"
                : isCaution
                ? "bg-amber-50/70 border-amber-200 hover:bg-amber-100/70"
                : "bg-white/80 border-slate-200/80 hover:bg-emerald-50/50 hover:border-emerald-200"
            }`}
            title={`${item.state} — ${item.status}: ${item.detail}. Click to view corridor on map.`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-slate-800 text-[11px] leading-tight">
                {item.state}
              </span>
              {item.corridorId && (
                <span className="text-[9px] text-slate-400 font-semibold uppercase">
                  {item.corridorId}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  isHighRisk
                    ? "bg-rose-500 animate-pulse"
                    : isCaution
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
              />
              <span
                className={`text-[10px] font-bold ${
                  isHighRisk
                    ? "text-rose-700"
                    : isCaution
                    ? "text-amber-700"
                    : "text-emerald-700"
                }`}
              >
                {item.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  actor: string;
  type: "report" | "analysis" | "route" | "authority" | "execution";
}

const LIVE_OPERATIONS_TIMELINE: TimelineEvent[] = [
  {
    id: "timeline-1",
    time: "10:42 AM",
    title: "Field Officer reported Landslide on NH-6",
    actor: "Field Officer",
    type: "report",
  },
  {
    id: "timeline-2",
    time: "10:44 AM",
    title: "RouteX marked corridor Critical",
    actor: "RouteX AI",
    type: "analysis",
  },
  {
    id: "timeline-3",
    time: "10:46 AM",
    title: "Alternate route identified",
    actor: "Routing Engine",
    type: "route",
  },
  {
    id: "timeline-4",
    time: "10:48 AM",
    title: "Authority authorized reroute",
    actor: "Authority HQ",
    type: "authority",
  },
  {
    id: "timeline-5",
    time: "10:50 AM",
    title: "Convoy RX-217 diverted",
    actor: "Convoy Ops",
    type: "execution",
  },
];

function LiveOperationsTimelineList() {
  return (
    <div className="px-2.5 py-1 select-text">
      <div className="relative border-l border-slate-200 ml-2 space-y-1.5 my-0.5">
        {LIVE_OPERATIONS_TIMELINE.map((evt) => {
          return (
            <div
              key={evt.id}
              data-testid={`timeline-event-${evt.id}`}
              className="relative pl-3.5 group"
            >
              {/* Timeline node icon */}
              <div
                className={`absolute -left-[10px] top-0.5 h-5 w-5 rounded-full border flex items-center justify-center bg-white shadow-2xs transition-transform group-hover:scale-110 ${
                  evt.type === "report"
                    ? "border-amber-300 text-amber-600 bg-amber-50/60"
                    : evt.type === "analysis"
                    ? "border-rose-300 text-rose-600 bg-rose-50/60"
                    : evt.type === "route"
                    ? "border-blue-300 text-blue-600 bg-blue-50/60"
                    : evt.type === "authority"
                    ? "border-emerald-300 text-emerald-600 bg-emerald-50/60"
                    : "border-teal-300 text-teal-600 bg-teal-50/60"
                }`}
              >
                {evt.type === "report" && <Radio className="h-2.5 w-2.5" />}
                {evt.type === "analysis" && <ShieldAlert className="h-2.5 w-2.5" />}
                {evt.type === "route" && <Sparkles className="h-2.5 w-2.5" />}
                {evt.type === "authority" && <ShieldCheck className="h-2.5 w-2.5" />}
                {evt.type === "execution" && <Truck className="h-2.5 w-2.5" />}
              </div>

              {/* Event timestamp & content */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 leading-none mb-0.5">
                  <span className="font-mono text-[10px] font-bold text-slate-500">
                    {evt.time}
                  </span>
                  <span className="text-slate-300 text-[10px]">•</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                      evt.type === "report"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : evt.type === "analysis"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : evt.type === "route"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : evt.type === "authority"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-teal-50 text-teal-700 border-teal-200"
                    }`}
                  >
                    {evt.actor}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-800 leading-tight">
                  {evt.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AiDecisionSupportSection({
  isAuthorized,
  onAuthorize,
  onReviewRoute,
}: {
  isAuthorized: boolean;
  onAuthorize: () => void;
  onReviewRoute?: () => void;
}) {
  return (
    <section
      data-testid="ai-decision-support-section"
      className="glass rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 bg-white/95 shadow-sm shrink-0 flex flex-col gap-2 select-text"
    >
      {/* Header Row: Title, Status Line, and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
            <h3 className="text-xs font-bold tracking-wide uppercase">AI Decision Support</h3>
          </div>

          {/* Clear Status Line */}
          {!isAuthorized ? (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse mr-0.5" />
              <span>● Recommendation Ready</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 animate-in fade-in duration-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mr-0.5 shrink-0" />
              <span>✓ Reroute Authorized</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Authorize Reroute and Review Route */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="review-route-btn"
            onClick={onReviewRoute}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <MapPin className="h-3.5 w-3.5 text-slate-500" />
            <span>Review Route</span>
          </button>

          {!isAuthorized ? (
            <button
              type="button"
              data-testid="ai-authorize-reroute-btn"
              onClick={onAuthorize}
              className="px-4 py-1.5 bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Authorize Reroute</span>
            </button>
          ) : (
            <div
              data-testid="ai-reroute-authorized-badge"
              className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>✓ Reroute Authorized</span>
            </div>
          )}
        </div>
      </div>

      {/* Details Grid: Current Risk, Affected Corridor, Primary Hazard, Estimated Delay */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
        <div className="min-w-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block truncate">
            Current Risk
          </span>
          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
            HIGH
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block truncate">
            Affected Corridor
          </span>
          <span className="font-bold text-slate-900 mt-0.5 block truncate">
            NH-6, Meghalaya
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block truncate">
            Primary Hazard
          </span>
          <span className="font-bold text-rose-600 mt-0.5 block truncate">
            Landslide
          </span>
        </div>
        <div className="min-w-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block truncate">
            Estimated Delay
          </span>
          <span className="font-bold text-amber-700 mt-0.5 block truncate">
            +45 min
          </span>
        </div>
      </div>

      {/* Recommended Action Row */}
      <div className="text-xs pt-1.5 border-t border-slate-100 flex items-start gap-1.5 leading-snug">
        <span className="font-bold text-slate-900 shrink-0">Recommended Action:</span>
        <span className="text-slate-600 font-medium">
          Divert critical logistics through the safer alternate corridor.
        </span>
      </div>
    </section>
  );
}

function RouteXSystemStatusBar() {
  return (
    <div
      data-testid="routex-system-status-bar"
      className="glass rounded-xl px-3 py-1.5 mb-2 bg-white/90 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs shrink-0 select-text"
    >
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Main status indicator */}
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>● All Systems Operational</span>
        </div>

        {/* Separator */}
        <span className="hidden md:inline text-slate-300">|</span>

        {/* Sub-system indicators */}
        <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap text-[11px] text-slate-600 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Road Network — <strong className="text-slate-800 font-semibold">Online</strong></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Vehicle Tracking — <strong className="text-slate-800 font-semibold">Online</strong></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Weather Monitoring — <strong className="text-slate-800 font-semibold">Online</strong></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span>Emergency Alerts — <strong className="text-rose-700 font-bold">Active</strong></span>
          </span>
        </div>
      </div>

      {/* Subtle timestamp */}
      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium shrink-0 ml-auto sm:ml-0">
        <Clock className="h-3 w-3 text-slate-400" />
        <span>Last updated: Just now</span>
      </div>
    </div>
  );
}

function AuthorityDashboard() {
  const { t } = useI18n();
  const { unreadCount: storeUnreadCount } = useRerouteWorkflow();
  const [mobileTab, setMobileTab] = useState<MobileTab>("emergency");
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
  const blockedCorridorsCount = isNh6Authorized ? 1 : 2;
  const blockedRoadIds = useMemo(() => {
    return isNh6Authorized ? ["nh108"] : ["nh108", "nh6"];
  }, [isNh6Authorized]);

  // Static demo alerts unread count (SIH presentation: 3 active alerts)
  const notificationCount = STATIC_DEMO_ALERTS.length;

  // Live browser clock for mission control heading
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [currentTime]);

  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }, [currentTime]);

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

      <main className="flex-1 min-h-0 min-w-0 flex flex-col px-3 py-1.5 sm:px-5 sm:py-2 w-full max-w-[1800px] mx-auto overflow-hidden">
        {/* Mission Control Top Heading Area */}
        <div
          data-testid="mission-control-header"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2 px-0.5 shrink-0 select-text"
        >
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
              <h1 className="text-sm sm:text-base md:text-lg font-black tracking-wider uppercase text-slate-900 font-display">
                NER LOGISTICS MISSION CONTROL
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider bg-slate-900 text-white uppercase shadow-2xs">
                HQ GUWAHATI
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Real-time accessibility, hazard & convoy intelligence
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
            {/* Live Monitoring Indicator */}
            <div
              data-testid="live-monitoring-indicator"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>● LIVE MONITORING</span>
            </div>

            {/* Small live browser date/time display */}
            <div
              data-testid="browser-datetime-display"
              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-medium bg-white/90 border border-slate-200/90 text-slate-700 shadow-2xs"
            >
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0 hidden sm:inline" />
              <span className="font-semibold text-slate-700">{formattedDate}</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono font-bold text-slate-900">{formattedTime}</span>
            </div>
          </div>
        </div>

        {/* RouteX System Status Bar: Compact, glanceable live health indicator */}
        <RouteXSystemStatusBar />

        {/* Top metrics bar: Visually prominent, professional RouteX KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 shrink-0">
          {/* Active Convoys: 12 */}
          <div className="glass rounded-2xl p-2.5 sm:px-3.5 sm:py-2.5 bg-white/95 border border-slate-200/90 shadow-xs flex items-center justify-between gap-2.5 hover:border-slate-300 transition-all select-text">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                  Active Convoys
                </span>
                <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live GPS
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl sm:text-3xl font-black tracking-tight leading-none text-slate-900">
                  12
                </span>
                <span className="xl:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live GPS
                </span>
                <span className="hidden 2xl:inline text-[10px] font-medium text-slate-400 truncate">
                  8 states monitored
                </span>
              </div>
            </div>
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 border border-blue-100 bg-blue-50 text-blue-600 shadow-2xs">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>

          {/* Critical Hazards: 3 */}
          <div className="glass rounded-2xl p-2.5 sm:px-3.5 sm:py-2.5 bg-white/95 border border-slate-200/90 shadow-xs flex items-center justify-between gap-2.5 hover:border-slate-300 transition-all select-text">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                  Critical Hazards
                </span>
                <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                  High Alert
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl sm:text-3xl font-black tracking-tight leading-none text-rose-600">
                  3
                </span>
                <span className="xl:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                  High Alert
                </span>
                <span className="hidden 2xl:inline text-[10px] font-medium text-slate-400 truncate">
                  Immediate action
                </span>
              </div>
            </div>
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 border border-rose-100 bg-rose-50 text-rose-600 shadow-2xs">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>

          {/* Blocked Corridors: 2 */}
          <div className="glass rounded-2xl p-2.5 sm:px-3.5 sm:py-2.5 bg-white/95 border border-slate-200/90 shadow-xs flex items-center justify-between gap-2.5 hover:border-slate-300 transition-all select-text">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                  Blocked Corridors
                </span>
                <span
                  className={`hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight border shrink-0 ${
                    isNh6Authorized
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      isNh6Authorized ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                    }`}
                  />
                  {isNh6Authorized ? "Reroute Active" : "Action Needed"}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl sm:text-3xl font-black tracking-tight leading-none text-slate-900">
                  {blockedCorridorsCount}
                </span>
                <span
                  className={`xl:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight border shrink-0 ${
                    isNh6Authorized
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      isNh6Authorized ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                    }`}
                  />
                  {isNh6Authorized ? "Reroute Active" : "Action Needed"}
                </span>
                <span className="hidden 2xl:inline text-[10px] font-medium text-slate-400 truncate">
                  {isNh6Authorized ? "NH-6 diverted" : "NH-6 & NH-108"}
                </span>
              </div>
            </div>
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 border border-amber-100 bg-amber-50 text-amber-700 shadow-2xs">
              <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>

          {/* Weather Risk: HIGH */}
          <div className="glass rounded-2xl p-2.5 sm:px-3.5 sm:py-2.5 bg-white/95 border border-slate-200/90 shadow-xs flex items-center justify-between gap-2.5 hover:border-slate-300 transition-all select-text">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                  Weather Risk
                </span>
                <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Monsoon Watch
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl sm:text-3xl font-black tracking-tight leading-none text-rose-600">
                  HIGH
                </span>
                <span className="xl:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Monsoon Watch
                </span>
                <span className="hidden 2xl:inline text-[10px] font-medium text-slate-400 truncate">
                  Rainfall advisory
                </span>
              </div>
            </div>
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100 bg-indigo-50 text-indigo-600 shadow-2xs">
              <CloudRain className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
        </div>

        {/* Desktop 3-Column Command Layout: Visual Center is Large Real NER Google Map */}
        <div className="mt-2 flex-1 min-h-0 min-w-0 hidden lg:grid gap-2.5 lg:grid-cols-[17.5rem_minmax(0,1fr)_18.5rem] xl:grid-cols-[19.5rem_minmax(0,1fr)_20.5rem] items-stretch overflow-hidden">
          {/* Left Column: Active Alerts, Live Operations Timeline & Open Incidents */}
          <div className="h-full min-h-0 flex flex-col gap-2 overflow-hidden">
            {/* Emergency Response Panel */}
            <section className="glass rounded-2xl flex flex-col flex-[1.02] min-h-0 overflow-hidden shadow-sm">
              <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-1.5 shrink-0 bg-white/60">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--status-blocked)" }}
                  />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Emergency Response
                  </h2>
                </div>
                <span className="glass-soft rounded-full px-2 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200">
                  {EMERGENCY_SITUATIONS.length} active
                </span>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto p-1 scrollbar-thin">
                <EmergencyResponseList
                  situations={EMERGENCY_SITUATIONS}
                  isNh6Authorized={isNh6Authorized}
                  onAuthorize={handleAuthorizeReroute}
                  onViewDetails={(corridorId) => {
                    setHighlightedRoadId(corridorId);
                    setDrawerOpen(true);
                  }}
                />
              </div>
            </section>

            {/* Live Operations Timeline Section */}
            <section
              data-testid="live-operations-timeline-section"
              className="glass rounded-2xl flex flex-col flex-[1.08] min-h-0 overflow-hidden shadow-sm"
            >
              <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-1.5 shrink-0 bg-white/60">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Live Operations Timeline
                  </h2>
                </div>
                <span className="glass-soft rounded-full px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                  {LIVE_OPERATIONS_TIMELINE.length} events
                </span>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                <LiveOperationsTimelineList />
              </div>
            </section>

            {/* Open Incidents Panel */}
            <section className="glass rounded-2xl flex flex-col flex-[0.7] min-h-0 overflow-hidden shadow-sm">
              <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-1.5 shrink-0 bg-white/60">
                <div className="flex items-center gap-1.5">
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

          {/* Center Column: Large Real NER Google Map (Visual Center) + AI Recommendation Card */}
          <div className="h-full min-h-0 min-w-0 flex flex-col gap-2.5 overflow-hidden">
            <div className="flex-1 min-h-0 min-w-0 rounded-2xl overflow-hidden shadow-lg border border-border/80">
              <AuthorityMap
                highlightedRoadId={highlightedRoadId}
                blockedRoadIds={blockedRoadIds}
                liveIncidents={supabaseIncidents}
                onFocusCorridor={(c) => setHighlightedRoadId(c)}
              />
            </div>
            <AiDecisionSupportSection
              isAuthorized={isNh6Authorized}
              onAuthorize={() => handleAuthorizeReroute("demo-alert-nh6")}
              onReviewRoute={() => {
                setHighlightedRoadId("nh6");
                setDrawerOpen(true);
              }}
            />
          </div>

          {/* Right Column: NER Regional Connectivity + Weather & Regional Risk + Critical Logistics */}
          <div className="h-full min-h-0 flex flex-col gap-2 overflow-hidden">
            {/* NER Regional Connectivity Section */}
            <section
              data-testid="ner-regional-connectivity-section"
              className="glass rounded-2xl flex flex-col flex-[1.15] min-h-0 overflow-hidden shadow-sm"
            >
              <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-1.5 shrink-0 bg-white/60">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    NER Regional Connectivity
                  </h2>
                </div>
                <span className="glass-soft rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200">
                  8 States
                </span>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                <NerRegionalConnectivityList onSelectRoad={(r) => setHighlightedRoadId(r)} />
              </div>
            </section>

            {/* Dedicated Weather & Regional Risk Section */}
            <section className="glass rounded-2xl flex flex-col flex-[0.75] min-h-0 overflow-hidden shadow-sm">
              <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-1.5 shrink-0 bg-white/60">
                <div className="flex items-center gap-1.5">
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

            {/* Critical Logistics Panel */}
            <section className="glass rounded-2xl flex flex-col flex-[1.1] min-h-0 overflow-hidden shadow-sm">
              <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-1.5 shrink-0 bg-white/60">
                <div className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary shrink-0" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Critical Logistics
                  </h2>
                </div>
                <span className="glass-soft rounded-full px-2 py-0.5 text-[10px] font-bold text-primary bg-primary/10">
                  {CRITICAL_DELIVERIES.length} active
                </span>
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto p-1 scrollbar-thin">
                <CriticalLogisticsList />
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

          <AiDecisionSupportSection
            isAuthorized={isNh6Authorized}
            onAuthorize={() => handleAuthorizeReroute("demo-alert-nh6")}
            onReviewRoute={() => {
              setHighlightedRoadId("nh6");
              setDrawerOpen(true);
            }}
          />

          {/* Tab Switcher for Mobile */}
          <div className="glass-soft rounded-xl p-1 grid grid-cols-6 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab("emergency")}
              className={`rounded-lg py-1.5 px-0.5 text-[9.5px] font-bold transition-all text-center truncate ${
                mobileTab === "emergency" || mobileTab === "alerts"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Alerts ({EMERGENCY_SITUATIONS.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("timeline")}
              className={`rounded-lg py-1.5 px-0.5 text-[9.5px] font-bold transition-all text-center truncate ${
                mobileTab === "timeline"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Timeline
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("connectivity")}
              className={`rounded-lg py-1.5 px-0.5 text-[9.5px] font-bold transition-all text-center truncate ${
                mobileTab === "connectivity"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              States (8)
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("weather")}
              className={`rounded-lg py-1.5 px-0.5 text-[9.5px] font-bold transition-all text-center truncate ${
                mobileTab === "weather"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Weather
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("deliveries")}
              className={`rounded-lg py-1.5 px-0.5 text-[9.5px] font-bold transition-all text-center truncate ${
                mobileTab === "deliveries"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Logistics
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("incidents")}
              className={`rounded-lg py-1.5 px-0.5 text-[9.5px] font-bold transition-all text-center truncate ${
                mobileTab === "incidents"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Logs ({incidents.length})
            </button>
          </div>

          {/* Active Tab Panel on Mobile */}
          <div className="glass rounded-2xl p-2 shadow-sm min-h-[220px]">
            {(mobileTab === "emergency" || mobileTab === "alerts") && (
              <EmergencyResponseList
                situations={EMERGENCY_SITUATIONS}
                isNh6Authorized={isNh6Authorized}
                onAuthorize={handleAuthorizeReroute}
                onViewDetails={(corridorId) => {
                  setHighlightedRoadId(corridorId);
                  setDrawerOpen(true);
                }}
              />
            )}
            {mobileTab === "timeline" && <LiveOperationsTimelineList />}
            {mobileTab === "connectivity" && (
              <NerRegionalConnectivityList onSelectRoad={(r) => setHighlightedRoadId(r)} />
            )}
            {mobileTab === "weather" && <WeatherList />}
            {mobileTab === "deliveries" && <CriticalLogisticsList />}
            {mobileTab === "incidents" && <IncidentsList supabaseIncidents={supabaseIncidents} />}
          </div>
        </div>
      </main>
    </div>
  );
}
