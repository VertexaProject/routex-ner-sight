import { useEffect, useState } from "react";
import type { SupabaseAlert, EnrichedSupabaseAlert, SupabaseIncident } from "@/lib/supabase-service";
import { formatAlertTime } from "@/lib/supabase-service";
import type { HazardNotification } from "@/lib/route-store";
import {
  X,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Truck,
  ExternalLink,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useRerouteWorkflow } from "@/lib/route-store";

export interface HazardNotificationWithMeta extends HazardNotification {
  rawAlertId?: string;
  title?: string;
  message?: string;
  createdAtRaw?: string;
  gpsLocation?: string;
  reportedBy?: string;
  photoUrl?: string;
}

interface HazardNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  demoAlerts?: any[];
  supabaseAlerts?: (SupabaseAlert | EnrichedSupabaseAlert)[];
  supabaseIncidents?: SupabaseIncident[];
  readAlertIds?: string[];
  onMarkAlertRead?: (id: string) => void;
  onMarkAllAlertsRead?: () => void;
  authorizedAlertIds?: string[];
  onAuthorizeReroute?: (id: string) => void;
}

export function HazardNotificationDrawer({
  isOpen,
  onClose,
  demoAlerts = [],
  supabaseAlerts = [],
  readAlertIds = [],
  onMarkAlertRead,
  onMarkAllAlertsRead,
  authorizedAlertIds = [],
  onAuthorizeReroute,
}: HazardNotificationDrawerProps) {
  const { t } = useI18n();
  const {
    comparison,
    authorizeReroute,
    markNotificationRead,
    markAllRead,
    isRerouteAuthorized,
  } = useRerouteWorkflow();

  const [localAuthorizedIds, setLocalAuthorizedIds] = useState<string[]>([]);

  // Use demoAlerts if provided (for Authority presentation), else fallback to live Supabase alerts
  const alertsToUse = (demoAlerts && demoAlerts.length > 0) ? demoAlerts : (supabaseAlerts || []);

  const liveAlertNotifs: HazardNotificationWithMeta[] = alertsToUse.map((a) => {
    const rawTitle = (a.title || "").trim();
    const alertType = (a as any).alert_type;
    const incidentType =
      alertType ||
      a.incident_type ||
      (a as any).resolvedIncidentType ||
      (rawTitle ? rawTitle.replace(/\s*Alert(\s*on.*)?$/i, "").trim() : "") ||
      "Hazard Alert";
    const road = a.road_id || (a as any).road || "NH-2";
    const rawSev = (a.severity || "Moderate").toString().trim();
    const rawSevLower = rawSev.toLowerCase();
    const severity = (
      rawSevLower.includes("crit")
        ? "Critical"
        : rawSevLower.includes("high")
          ? "High"
          : rawSevLower.includes("low")
            ? "Low"
            : "Moderate"
    ) as "Critical" | "High" | "Moderate" | "Low";
    const isCritical = severity === "Critical";
    const alertId = String(a.id);
    const isRead = readAlertIds ? readAlertIds.includes(alertId) : false;
    const isAuth =
      (authorizedAlertIds || []).includes(alertId) ||
      localAuthorizedIds.includes(alertId) ||
      a.status === "rerouted";
    const activeStatus = isAuth ? "rerouted" : (a.status || "active");

    // Database / demo fields mapped:
    const notificationTitle = a.title || incidentType || "Hazard Alert";
    const notificationDescription =
      a.message ||
      (a as any).description ||
      `${incidentType} active on ${road}. Emergency monitoring deployed.`;
    const timestamp = formatAlertTime(a.created_at);

    return {
      id: alertId,
      rawAlertId: alertId,
      title: notificationTitle,
      message: notificationDescription,
      incidentType,
      location: (a as any).location || ((a as any).gpsLocation ? `${road} Sector (${(a as any).gpsLocation})` : `${road} Corridor Sector`),
      road: road,
      severity,
      status: activeStatus as any,
      affectedVehicles: (a as any).affectedVehicles || [`Tracked convoys operating on ${road}`],
      affectedDeliveries: (a as any).affectedDeliveries || [`Priority supplies transiting ${road}`],
      recommendedAction: (a as any).recommendedAction || (isCritical
        ? `Authorize emergency reroute away from ${road} immediately`
        : `Issue advisory speed reduction to 30 km/h along ${road}`),
      isRead,
      timestamp,
      details: notificationDescription,
      delayEstimate: (a as any).delayEstimate || (isCritical ? "45–90 min holding time" : "15–20 min caution transit"),
      gpsLocation: (a as any).gpsLocation,
      reportedBy: (a as any).reportedBy,
      photoUrl: (a as any).photoUrl,
      createdAtRaw: a.created_at,
    };
  });

  // Preserve demoAlerts order so Critical Landslide NH-6 remains the first tab, else sort by created_at
  const sortedNotifications =
    demoAlerts && demoAlerts.length > 0
      ? [...liveAlertNotifs]
      : [...liveAlertNotifs].sort((a, b) => {
          // Show active alerts first
          const aActive = (a.status || "").toLowerCase() === "active" || a.status === "pending_review";
          const bActive = (b.status || "").toLowerCase() === "active" || b.status === "pending_review";
          if (aActive && !bActive) return -1;
          if (!aActive && bActive) return 1;

          // Within each group, sort by created_at descending (newest first)
          const timeA = a.createdAtRaw ? new Date(a.createdAtRaw).getTime() || 0 : 0;
          const timeB = b.createdAtRaw ? new Date(b.createdAtRaw).getTime() || 0 : 0;
          return timeB - timeA;
        });

  // Authority notification data source directly uses sorted notifications
  const allNotifications: HazardNotificationWithMeta[] = sortedNotifications;

  const [activeId, setActiveId] = useState<string | null>(null);

  // Directly select active notification: selected tab if exists, else newest active alert (first in list)
  const activeNotif =
    (activeId ? allNotifications.find((n) => n.id === activeId) : null) ||
    allNotifications[0];

  // Whenever notifications load/update, default to the newest active alert
  useEffect(() => {
    if (allNotifications.length > 0) {
      if (!activeId || !allNotifications.some((n) => n.id === activeId)) {
        setActiveId(allNotifications[0].id);
      }
    }
  }, [allNotifications]);

  // On drawer open, show newest active alert first
  useEffect(() => {
    if (isOpen && allNotifications.length > 0) {
      setActiveId(allNotifications[0].id);
    }
  }, [isOpen]);

  const totalUnreadCount = allNotifications.filter((n) => !n.isRead).length;

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAuthorize = (notifId: string) => {
    authorizeReroute(notifId);
    setLocalAuthorizedIds((prev) => (prev.includes(notifId) ? prev : [...prev, notifId]));
    onAuthorizeReroute?.(notifId);
  };

  return (
    /* Full-screen semi-transparent backdrop sitting above the entire dashboard at z-[9999] */
    <div
      className="fixed inset-0 z-[9999] flex justify-end bg-slate-950/45 backdrop-blur-xs animate-in fade-in duration-200 select-none"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Hazard Notifications and Reroute Panel"
    >
      {/* Solid, 100% Opaque White Notification Drawer (Insulated from underlying map) */}
      <aside
        className="w-full max-w-xl h-full flex flex-col bg-white shadow-2xl border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-250 relative z-10 select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header (Solid White, non-transparent) */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {t("notifications")}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Critical Hazard Alerts & Real-Time Reroute Control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalUnreadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  markAllRead();
                  onMarkAllAlertsRead?.();
                }}
                className="text-xs font-bold text-primary hover:underline px-2.5 py-1 rounded-lg hover:bg-primary/5 transition-colors"
              >
                {t("mark_all_read")}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
              aria-label="Close notifications panel"
              title="Close notifications"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Drawer Body (Clean scrollable content area, solid white) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 bg-white">
          {/* Notifications Tab Pill Selector */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {allNotifications.map((n) => {
              const isSelected = n.id === activeNotif?.id;
              const isUnread = !n.isRead;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setActiveId(n.id);
                    markNotificationRead(n.id);
                    if (n.rawAlertId) {
                      onMarkAlertRead?.(n.rawAlertId);
                    }
                  }}
                  className={`relative flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-left transition-all shrink-0 border ${
                    isSelected
                      ? "ring-2 ring-primary border-primary bg-primary/10 shadow-xs text-slate-900"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      n.severity === "Critical"
                        ? "bg-rose-600 ring-2 ring-rose-200"
                        : "bg-amber-500 ring-2 ring-amber-200"
                    }`}
                  />
                  <div>
                    <span className="block font-bold text-slate-900 truncate max-w-[150px]">
                      {n.title || n.incidentType}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">{n.road}</span>
                  </div>
                  {isUnread && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Notification Details Card (Solid white card with clear border) */}
          {activeNotif ? (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* severity → severity badge */}
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                        activeNotif.severity === "Critical"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : activeNotif.severity === "High"
                            ? "bg-orange-50 text-orange-800 border-orange-200"
                            : activeNotif.severity === "Low"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {activeNotif.severity} Severity
                    </span>
                    {/* created_at → timestamp */}
                    <span className="text-xs text-slate-500 font-medium">
                      {activeNotif.timestamp}
                    </span>
                  </div>

                  {/* title → notification title */}
                  <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 mt-2">
                    {activeNotif.title || activeNotif.incidentType}
                  </h3>

                  {/* alert_type → incident type */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold text-slate-500">
                      Type: <strong className="text-slate-800">{activeNotif.incidentType}</strong>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {activeNotif.location}
                    </span>
                  </div>
                </div>

                {/* status → active status */}
                <span
                  className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 border ${
                    activeNotif.status === "rerouted" || authorizedAlertIds.includes(activeNotif.id) || localAuthorizedIds.includes(activeNotif.id)
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : (activeNotif.status || "").toLowerCase() === "active"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      activeNotif.status === "rerouted" || authorizedAlertIds.includes(activeNotif.id) || localAuthorizedIds.includes(activeNotif.id)
                        ? "bg-emerald-600"
                        : "bg-rose-600 animate-pulse"
                    }`}
                  />
                  {activeNotif.status === "rerouted" || authorizedAlertIds.includes(activeNotif.id) || localAuthorizedIds.includes(activeNotif.id)
                    ? "Reroute Authorized"
                    : activeNotif.status
                      ? activeNotif.status.charAt(0).toUpperCase() + activeNotif.status.slice(1)
                      : "Active"}
                </span>
              </div>

              {/* message → notification description */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {activeNotif.message || activeNotif.details}
              </p>

              {/* Enriched Incident Details (GPS & Reporter) */}
              {(activeNotif.gpsLocation || activeNotif.reportedBy) && (
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 font-medium px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200/80">
                  {activeNotif.gpsLocation && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>GPS Coordinates: {activeNotif.gpsLocation}</span>
                    </span>
                  )}
                  {activeNotif.reportedBy && (
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Reported by: {activeNotif.reportedBy}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Affected Road & Expected Delay */}
              {/* road_id → affected highway/road */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
                    Affected Highway
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {activeNotif.road}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
                    Expected Delay
                  </span>
                  <span className="font-bold text-rose-600 text-sm mt-0.5 block">
                    {activeNotif.delayEstimate}
                  </span>
                </div>
              </div>

              {/* Identified Vehicles & Deliveries at Risk */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Identified Vehicles & Convoys at Risk
                </span>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                  {activeNotif.affectedVehicles.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Truck className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-bold text-slate-900">{v}</span>
                    </div>
                  ))}
                  {activeNotif.affectedDeliveries.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200"
                    >
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Action */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <strong className="text-amber-950 block font-bold">Recommended Action:</strong>
                  <p className="text-amber-900 mt-0.5 leading-relaxed">
                    {activeNotif.recommendedAction}
                  </p>
                </div>
              </div>

              {/* Authorize Action Button */}
              <div className="pt-2">
                {activeNotif.status !== "rerouted" &&
                !authorizedAlertIds.includes(activeNotif.id) &&
                !localAuthorizedIds.includes(activeNotif.id) &&
                !isRerouteAuthorized ? (
                  <button
                    type="button"
                    onClick={() => handleAuthorize(activeNotif.id)}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all text-sm active:scale-[0.99] cursor-pointer"
                  >
                    <ShieldCheck className="h-4.5 w-4.5" />
                    <span>{t("authorize_reroute")}</span>
                  </button>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-900 font-semibold">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                      <span>Official Reroute Authorized: Traffic on {activeNotif.road} safely rerouted via alternate corridor</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Clean Empty State when no live alerts exist */
            <div className="bg-white rounded-2xl p-8 border border-slate-200/90 text-center space-y-3 shadow-xs">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                No Active Hazard Alerts
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                All monitored North-East highway corridors are operating under normal status. Real-time alerts submitted by Field Officers will stream here automatically.
              </p>
            </div>
          )}

          {/* Reroute Comparison Card (Solid white card, no transparency) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm sm:text-base font-bold text-slate-900">
                {t("route_comparison")}
              </h4>
              <span className="text-[11px] font-semibold text-slate-500">
                Live Algorithmic Risk Comparison
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Current High Risk Route */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-900">{comparison.currentRoute.name}</span>
                  <span className="bg-rose-200 text-rose-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                    High Risk
                  </span>
                </div>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("nav_remaining")}:</span>
                    <span className="font-bold text-slate-900">{comparison.currentRoute.distance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("nav_eta")}:</span>
                    <span className="font-bold text-slate-900">{comparison.currentRoute.eta}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("risk_score")}:</span>
                    <span className="font-black text-rose-700">{comparison.currentRoute.riskScore} / 100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Holding Delay:</span>
                    <span className="font-bold text-rose-600">{comparison.currentRoute.delay}</span>
                  </div>
                </div>
                <p className="text-[11px] text-rose-900 pt-2 border-t border-rose-200 font-medium leading-snug">
                  {comparison.currentRoute.condition}
                </p>
              </div>

              {/* Safer Alternate Route */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950">{comparison.saferAlternate.name}</span>
                  <span className="bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                    Open / Safe
                  </span>
                </div>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("nav_remaining")}:</span>
                    <span className="font-bold text-slate-900">
                      {comparison.saferAlternate.distance} ({comparison.saferAlternate.deltaDistance})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("nav_eta")}:</span>
                    <span className="font-bold text-slate-900">
                      {comparison.saferAlternate.eta} ({comparison.saferAlternate.deltaEta})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("risk_score")}:</span>
                    <span className="font-black text-emerald-700">{comparison.saferAlternate.riskScore} / 100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transit Delay:</span>
                    <span className="font-bold text-emerald-700">{comparison.saferAlternate.delay}</span>
                  </div>
                </div>
                <p className="text-[11px] text-emerald-900 pt-2 border-t border-emerald-200 font-medium leading-snug">
                  {comparison.saferAlternate.condition}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
