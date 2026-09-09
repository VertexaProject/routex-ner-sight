import { useState, useRef, useEffect } from "react";
import {
  Navigation,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  AlertTriangle,
  MapPin,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  ChevronDown,
  Check,
} from "lucide-react";
import type { RouteStep } from "@/services/google-maps";
import { useI18n } from "@/lib/i18n";
import { SPEED_OPTIONS, type SimulationSpeed } from "@/hooks/useVehicleSimulation";

interface NavigationTurnCardProps {
  distanceToNextStep: string;
  nextStep: RouteStep | null;
  progressPercent: number;
  remainingDistance: string;
  eta: string;
  isPlaying: boolean;
  speed: number;
  currentRoad?: string;
  isNavigating?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset?: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: number) => void;
}

export function NavigationTurnCard({
  distanceToNextStep,
  nextStep,
  progressPercent,
  remainingDistance,
  eta,
  isPlaying,
  speed,
  currentRoad,
  isNavigating = false,
  onPlay,
  onPause,
  onRestart,
  onSpeedChange,
}: NavigationTurnCardProps) {
  const { t } = useI18n();
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  // Close speed dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setSpeedMenuOpen(false);
      }
    }
    if (speedMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [speedMenuOpen]);

  // Select an appropriate maneuver icon based on instruction text or maneuver key
  const getManeuverIcon = () => {
    const text = (nextStep?.instruction || "").toLowerCase();
    const maneuver = (nextStep?.maneuver || "").toLowerCase();

    if (maneuver.includes("destination") || text.includes("arrive")) {
      return <MapPin className="h-5 w-5 text-primary animate-bounce" />;
    }
    if (text.includes("caution") || text.includes("landslide") || maneuver.includes("caution")) {
      return <AlertTriangle className="h-5 w-5 text-[var(--status-risk)] animate-pulse" />;
    }
    if (maneuver.includes("left") || text.includes("turn left") || text.includes("keep left")) {
      return <CornerUpLeft className="h-5 w-5 text-primary" />;
    }
    if (maneuver.includes("right") || text.includes("turn right") || text.includes("keep right")) {
      return <CornerUpRight className="h-5 w-5 text-primary" />;
    }
    return <ArrowUp className="h-5 w-5 text-primary" />;
  };

  const instructionText = nextStep?.instruction || "Proceed along NH-29 toward Kohima";
  const roadLabel = currentRoad || "Asian Highway 1 / NH-29";

  return (
    <div className="glass rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 border-l-4 border-l-primary flex flex-col gap-2 shadow-md relative bg-white/95 shrink-0 z-30">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-0 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Banner: Next Turn Maneuver + Speed Selector + Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 min-w-0">
        {/* Left: Maneuver Icon & Instruction */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary border border-primary/25 shadow-inner">
            {getManeuverIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                {distanceToNextStep || "In 2.4 km"}
              </span>
              <span className="text-muted-foreground font-semibold">→</span>
              <span className="glass-soft rounded px-1.5 py-0.2 text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 border border-primary/20">
                {t("nav_next_action")}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium truncate hidden xl:inline">
                · {roadLabel}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-foreground truncate leading-snug">
              {instructionText}
            </p>
          </div>
        </div>

        {/* Right: Simulation Speed Dropdown Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 self-end md:self-auto shrink-0">
          {/* Compact Speed Dropdown Selector */}
          <div className="relative" ref={speedMenuRef}>
            <button
              type="button"
              onClick={() => setSpeedMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 border border-slate-200/90 bg-white/90 hover:bg-white transition-all shadow-sm active:scale-[0.98]"
              title="Change navigation simulation speed"
            >
              <Gauge className="h-3.5 w-3.5 text-primary" />
              <span>{speed}×</span>
              <ChevronDown
                className={`h-3 w-3 text-slate-500 transition-transform duration-150 ${
                  speedMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {speedMenuOpen && (
              <div className="glass absolute right-0 top-full mt-1.5 w-36 rounded-xl p-1 shadow-xl z-50 border border-border/80 bg-white/95 backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40">
                  Speed
                </div>
                <div className="py-0.5 space-y-0.5">
                  {SPEED_OPTIONS.map((s) => {
                    const isActive = speed === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          onSpeedChange(s);
                          setSpeedMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                          isActive
                            ? "bg-primary text-white font-bold shadow-sm"
                            : "text-slate-700 hover:bg-slate-100/80"
                        }`}
                      >
                        <span>
                          {s}× {s === 1 ? "(Default)" : ""}
                        </span>
                        {isActive && <Check className="h-3.5 w-3.5 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Start Drive / Pause / Resume Button */}
          <button
            type="button"
            onClick={!isNavigating || !isPlaying ? onPlay : onPause}
            className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.98] ${
              !isNavigating
                ? "bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-400/50 shadow-emerald-600/20"
                : "bg-primary hover:bg-primary/90"
            }`}
            title={!isNavigating ? "Start navigation drive" : isPlaying ? "Pause navigation" : "Resume navigation"}
          >
            {!isNavigating ? (
              <>
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Start Drive</span>
              </>
            ) : isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span>{t("nav_pause")}</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Resume</span>
              </>
            )}
          </button>

          {/* Restart Button */}
          <button
            type="button"
            onClick={onRestart}
            className="glass-soft flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 border border-slate-200/80 bg-white/80 hover:bg-white transition-all active:scale-[0.98] shadow-sm"
            title="Restart navigation from beginning (0%)"
          >
            <RotateCcw className="h-3.5 w-3.5 text-primary" />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Bottom Progress Bar & Stats */}
      <div className="flex flex-col gap-1 border-t border-border/40 pt-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <div className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
            <span className="text-muted-foreground">{t("nav_progress")}:</span>
            <span className="text-foreground font-bold">{progressPercent}%</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>
              {t("nav_remaining")}: <strong className="text-foreground">{remainingDistance || "38 km"}</strong>
            </span>
            <span>·</span>
            <span>
              {t("nav_eta")}: <strong className="text-primary font-bold">{eta || "1 h 25 m"}</strong>
            </span>
          </div>
        </div>

        {/* Progress rail */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/90">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
