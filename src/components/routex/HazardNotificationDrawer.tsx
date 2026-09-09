import { X, AlertTriangle, ShieldCheck, ArrowRight, CheckCircle2, Clock, MapPin, Truck, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useRerouteWorkflow } from "@/lib/route-store";

interface HazardNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HazardNotificationDrawer({ isOpen, onClose }: HazardNotificationDrawerProps) {
  const { t } = useI18n();
  const {
    notifications,
    unreadCount,
    isRerouteAuthorized,
    selectedNotificationId,
    comparison,
    authorizeReroute,
    markNotificationRead,
    markAllRead,
    setSelectedNotificationId,
  } = useRerouteWorkflow();

  if (!isOpen) return null;

  const activeNotif =
    notifications.find((n) => n.id === selectedNotificationId) || notifications[0];

  const handleAuthorize = (notifId: string) => {
    authorizeReroute(notifId);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass w-full max-w-xl h-full flex flex-col bg-white/95 shadow-2xl border-l border-border/80 overflow-hidden animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-white/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-500/15 text-rose-600">
              <AlertTriangle className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                {t("notifications")}
              </h2>
              <p className="text-xs text-muted-foreground">
                Critical Hazard Alerts & Real-Time Reroute Control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-semibold text-primary hover:underline px-2 py-1"
              >
                {t("mark_all_read")}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Drawer Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {/* Notifications Tab Pill Selector */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {notifications.map((n) => {
              const isSelected = n.id === activeNotif.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setSelectedNotificationId(n.id);
                    markNotificationRead(n.id);
                  }}
                  className={`glass-soft flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-left transition-all shrink-0 ${
                    isSelected
                      ? "ring-2 ring-primary border-primary/50 bg-primary/10 shadow-sm"
                      : "hover:bg-black/5 text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      n.severity === "Critical" ? "bg-[var(--status-blocked)]" : "bg-[var(--status-risk)]"
                    }`}
                  />
                  <div>
                    <span className="block font-bold text-foreground truncate max-w-[160px]">
                      {n.incidentType}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{n.road}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Notification Details Card */}
          {activeNotif && (
            <div className="glass rounded-2xl p-4 border border-border/80 space-y-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-rose-500/15 text-rose-600 border border-rose-500/30 text-xs font-bold px-2 py-0.5 rounded-md">
                      {activeNotif.severity} Severity
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {activeNotif.timestamp}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mt-1.5">
                    {activeNotif.incidentType} · {activeNotif.location}
                  </h3>
                </div>

                {activeNotif.status === "rerouted" && (
                  <span className="flex items-center gap-1 bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Reroute Authorized
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeNotif.details}
              </p>

              {/* Affected Road & Delay */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="glass-soft rounded-xl p-2.5">
                  <span className="text-[11px] text-muted-foreground block">Affected Highway</span>
                  <span className="font-bold text-foreground">{activeNotif.road}</span>
                </div>
                <div className="glass-soft rounded-xl p-2.5">
                  <span className="text-[11px] text-muted-foreground block">Expected Delay</span>
                  <span className="font-bold text-rose-600">{activeNotif.delayEstimate}</span>
                </div>
              </div>

              {/* Affected Vehicles & Deliveries */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Identified Vehicles & Convoys at Risk
                </span>
                <div className="glass-soft rounded-xl p-3 space-y-2">
                  {activeNotif.affectedVehicles.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Truck className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-semibold text-foreground">{v}</span>
                    </div>
                  ))}
                  {activeNotif.affectedDeliveries.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Action & Trigger */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-amber-900 block font-bold">Recommended Action:</strong>
                  <p className="text-amber-800 mt-0.5">{activeNotif.recommendedAction}</p>
                </div>
              </div>

              {/* Authorize Action Button */}
              {activeNotif.id === "HAZ-PIPHEMA-01" && (
                <div className="pt-2">
                  {!isRerouteAuthorized ? (
                    <button
                      type="button"
                      onClick={() => handleAuthorize(activeNotif.id)}
                      className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-xl shadow-lg transition-all text-sm"
                    >
                      <ShieldCheck className="h-4.5 w-4.5" />
                      <span>{t("authorize_reroute")}</span>
                    </button>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Official Reroute Authorized: Convoy RX-217 updated to NH-29 Bypass</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reroute Comparison Card */}
          <div className="glass rounded-2xl p-4 border border-border/80 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm font-bold text-foreground">
                {t("route_comparison")}
              </h4>
              <span className="text-[11px] font-semibold text-muted-foreground">
                Live Algorithmic Risk Comparison
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Current High Risk Route */}
              <div className="rounded-xl border border-rose-500/30 bg-rose-50/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-800">{comparison.currentRoute.name}</span>
                  <span className="bg-rose-500/20 text-rose-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                    High Risk
                  </span>
                </div>
                <div className="space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("nav_remaining")}:</span>
                    <span className="font-semibold">{comparison.currentRoute.distance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("nav_eta")}:</span>
                    <span className="font-semibold">{comparison.currentRoute.eta}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("risk_score")}:</span>
                    <span className="font-bold text-rose-700">{comparison.currentRoute.riskScore} / 100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Holding Delay:</span>
                    <span className="font-semibold text-rose-600">{comparison.currentRoute.delay}</span>
                  </div>
                </div>
                <p className="text-[11px] text-rose-900/80 pt-1 border-t border-rose-200">
                  {comparison.currentRoute.condition}
                </p>
              </div>

              {/* Safer Alternate Route */}
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-50/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900">{comparison.saferAlternate.name}</span>
                  <span className="bg-emerald-500/20 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                    Open / Safe
                  </span>
                </div>
                <div className="space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("nav_remaining")}:</span>
                    <span className="font-semibold">{comparison.saferAlternate.distance} ({comparison.saferAlternate.deltaDistance})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("nav_eta")}:</span>
                    <span className="font-semibold">{comparison.saferAlternate.eta} ({comparison.saferAlternate.deltaEta})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("risk_score")}:</span>
                    <span className="font-bold text-emerald-700">{comparison.saferAlternate.riskScore} / 100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transit Delay:</span>
                    <span className="font-semibold text-emerald-700">{comparison.saferAlternate.delay}</span>
                  </div>
                </div>
                <p className="text-[11px] text-emerald-900/80 pt-1 border-t border-emerald-200">
                  {comparison.saferAlternate.condition}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
