import {
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Navigation,
  RotateCcw,
  Play,
} from "lucide-react";
import type { RouteData } from "@/services/google-maps";
import { useI18n } from "@/lib/i18n";

interface NavigationBottomBarProps {
  currentRoute: RouteData;
  alternateRoute: RouteData;
  isAlternateActive: boolean;
  onReroute: () => void;
  onRevert: () => void;
  onRecenter: () => void;
  isRecenterActive: boolean;
  isNavigating?: boolean;
  onStartNavigation?: () => void;
  onRestart?: () => void;
  remainingDistanceText?: string;
  remainingDurationText?: string;
  etaArrivalTime?: string;
}

export function NavigationBottomBar({
  currentRoute,
  alternateRoute,
  isAlternateActive,
  onReroute,
  onRevert,
  onRecenter,
  isRecenterActive,
  isNavigating = false,
  onStartNavigation,
  onRestart,
  remainingDistanceText,
  remainingDurationText,
  etaArrivalTime,
}: NavigationBottomBarProps) {
  const { t } = useI18n();

  const displayDuration = isNavigating && remainingDurationText ? remainingDurationText : currentRoute.durationText;
  const displayEtaTime = isNavigating && etaArrivalTime ? etaArrivalTime : currentRoute.etaArrivalTime;
  const displayDistance = isNavigating && remainingDistanceText ? remainingDistanceText : currentRoute.distanceText;

  return (
    <div className="flex flex-col gap-2 shrink-0">
      {/* Dynamic Hazard Ahead Alert Banner */}
      {!isAlternateActive ? (
        <div className="glass rounded-xl p-2.5 sm:p-3 border border-red-300 bg-red-50/95 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-red-100 text-red-600 animate-pulse border border-red-200">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                  {t("hazard_ahead")}
                </span>
                <span className="glass-soft rounded px-1.5 py-0.2 text-[10px] font-bold text-slate-700 bg-white/80 border border-slate-200">
                  NH-2 Piphema
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                Active Landslide in 12 km · 20–30 min holding delay reported
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onReroute}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 rounded-xl bg-primary px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white shadow-md transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{t("safe_bypass")} (+25m)</span>
          </button>
        </div>
      ) : (
        <div className="glass rounded-xl p-2.5 sm:p-3 border border-emerald-300 bg-emerald-50/95 flex items-center justify-between gap-2.5 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                Safe Alternate Active: Bypassing Piphema Landslide via Medziphema Ridge
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRevert}
            className="glass-soft rounded-lg px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white/80 border border-slate-200 shrink-0"
          >
            {t("revert_route")}
          </button>
        </div>
      )}

      {/* Main Bottom Navigation Summary Bar */}
      <div className="glass rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border border-border/80 shadow-lg bg-white/95">
        {/* Left Section: ETA & Remaining Distance */}
        <div className="flex items-center gap-3.5 sm:gap-5">
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("nav_eta")}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
                {displayDuration}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                ({displayEtaTime})
              </span>
            </div>
          </div>

          <div className="h-7 w-px bg-border/60" />

          <div className="flex flex-col">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("nav_remaining")}
            </span>
            <span className="font-display text-base sm:text-lg font-bold text-foreground">
              {displayDistance}
            </span>
          </div>

          <div className="h-7 w-px bg-border/60 hidden xs:block" />

          <div className="flex flex-col hidden xs:flex">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("severity")}
            </span>
            <span
              className="text-xs font-bold flex items-center gap-1.5"
              style={{ color: currentRoute.riskColor }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: currentRoute.riskColor }}
              />
              {currentRoute.riskLevel}
            </span>
          </div>
        </div>

        {/* Right Section: Destination & Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 border-t border-border/50 pt-2 sm:border-0 sm:pt-0">
          <div className="text-left sm:text-right min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("destination")}
            </span>
            <p className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-[240px]">
              {currentRoute.destination.name}
            </p>
          </div>

          {!isNavigating ? (
            <button
              type="button"
              onClick={onStartNavigation}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-600/30 active:scale-95 transition-all shrink-0"
              title="Begin turn-by-turn navigation from Dimapur origin"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>Start Navigation</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onRecenter}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                  isRecenterActive
                    ? "bg-primary text-white shadow-md hover:bg-primary/90"
                    : "glass-soft text-slate-800 bg-white/90 hover:bg-white border border-slate-200"
                }`}
                title="Recenter camera on vehicle"
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>Recenter</span>
              </button>

              <button
                type="button"
                onClick={onRestart}
                className="glass-soft flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 bg-white/80 hover:bg-white border border-slate-200 shadow-sm active:scale-95 transition-all"
                title="Restart navigation from beginning"
              >
                <RotateCcw className="h-3.5 w-3.5 text-primary" />
                <span>Restart</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
