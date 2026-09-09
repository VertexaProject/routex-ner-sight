import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { AppHeader } from "@/components/routex/AppHeader";
import { Panel } from "@/components/routex/Panel";
import { StatusPill, StatusDot } from "@/components/routex/StatusPill";
import { DriverMap } from "@/components/routex/DriverMap";
import { NavigationTurnCard } from "@/components/routex/NavigationTurnCard";
import { NavigationBottomBar } from "@/components/routex/NavigationBottomBar";
import { useVehicleSimulation } from "@/hooks/useVehicleSimulation";
import { useI18n } from "@/lib/i18n";
import { useRerouteWorkflow } from "@/lib/route-store";
import {
  fetchGoogleDrivingRoute,
  getPrimaryRouteData,
  getAlternateRouteData,
  type RouteData,
  DEMO_ORIGIN,
  DEMO_DESTINATION,
  PIPHEMA_HAZARD,
} from "@/services/google-maps";
import { driverRoute, roadStatusMeta } from "@/lib/mock-data";
import { ShieldCheck, ShieldAlert, ArrowRight, CheckCircle2, AlertTriangle, RefreshCw, Radio } from "lucide-react";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "Convoy Route — RouteX Google Navigation" },
      {
        name: "description",
        content:
          "RouteX in-cab navigation: interactive Google road map, live vehicle tracking, turn-by-turn guidance, on-map hazard warnings, and alternate route comparison.",
      },
      { property: "og:title", content: "Convoy Route — RouteX Google Navigation" },
      {
        property: "og:description",
        content:
          "Live interactive Google Maps driving route from Dimapur to Kohima with real-time turn guidance and hazard rerouting for convoy drivers.",
      },
    ],
  }),
  component: DriverScreen,
});

function DriverScreen() {
  const r = driverRoute;
  const { t } = useI18n();
  const { isRerouteAuthorized, comparison, resetWorkflow } = useRerouteWorkflow();

  const [isAlternateActive, setIsAlternateActive] = useState(false);
  const [primaryRoute, setPrimaryRoute] = useState<RouteData>(getPrimaryRouteData());
  const [alternateRoute, setAlternateRoute] = useState<RouteData>(getAlternateRouteData());
  const [isNavigating, setIsNavigating] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  // When Authority authorizes reroute, driver screen adopts updated safe route
  useEffect(() => {
    if (isRerouteAuthorized) {
      setIsAlternateActive(true);
    }
  }, [isRerouteAuthorized]);

  // Initialize driving routes from Google Directions API or corridor waypoints
  useEffect(() => {
    let isMounted = true;

    // Fetch primary driving route (NH-2)
    fetchGoogleDrivingRoute(DEMO_ORIGIN.coord, DEMO_DESTINATION.coord, false).then((data) => {
      if (isMounted) setPrimaryRoute(data);
    });

    // Fetch alternate driving route (NH-29 via Medziphema Bypass)
    fetchGoogleDrivingRoute(DEMO_ORIGIN.coord, DEMO_DESTINATION.coord, true).then((data) => {
      if (isMounted) setAlternateRoute(data);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeRoute = isAlternateActive ? alternateRoute : primaryRoute;

  // Simulated vehicle movement along active route polyline (starts at Dimapur origin)
  const sim = useVehicleSimulation(
    activeRoute.path,
    activeRoute.steps,
    false,
    activeRoute.durationSeconds,
  );

  const handleStartNavigation = useCallback(() => {
    setIsNavigating(true);
    setAutoFollow(true);
    sim.restart();
    setRecenterTrigger((prev) => prev + 1);
  }, [sim]);

  const handleRestart = useCallback(() => {
    setIsNavigating(true);
    setAutoFollow(true);
    sim.restart();
    setRecenterTrigger((prev) => prev + 1);
  }, [sim]);

  const handlePlay = useCallback(() => {
    setIsNavigating(true);
    sim.play();
  }, [sim]);

  const handlePause = useCallback(() => {
    sim.pause();
  }, [sim]);

  const handleRecenter = useCallback(() => {
    setAutoFollow(true);
    setRecenterTrigger((prev) => prev + 1);
  }, []);

  const handleSelectAlternate = useCallback(() => {
    setIsAlternateActive(true);
    sim.reset();
    if (isNavigating) {
      sim.play();
    }
    setRecenterTrigger((prev) => prev + 1);
  }, [sim, isNavigating]);

  const handleSelectPrimary = useCallback(() => {
    setIsAlternateActive(false);
    sim.reset();
    if (isNavigating) {
      sim.play();
    }
    setRecenterTrigger((prev) => prev + 1);
  }, [sim, isNavigating]);

  const handleToggleAutoFollow = useCallback(() => {
    setAutoFollow((prev) => !prev);
  }, []);

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden flex flex-col bg-background">
      <AppHeader role="Convoy Driver" subtitle={`${r.convoyId} · ${r.driver}`} />

      <main className="mx-auto flex flex-col gap-2 px-3 pb-2.5 pt-2 sm:px-5 w-full max-w-[1800px] min-w-0 flex-1 lg:overflow-hidden">
        {/* Authority Reroute Authorization Broadcast Banner */}
        {isRerouteAuthorized && (
          <div className="glass rounded-xl p-2.5 sm:p-3 border-2 border-emerald-500/80 bg-emerald-50/95 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white font-bold shadow-md">
                <Radio className="h-4 w-4 animate-pulse" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Authority Reroute Broadcast Received
                  </span>
                  <span className="rounded-full bg-emerald-200/80 px-2 py-0.2 text-[10px] font-extrabold text-emerald-900">
                    RX-217 Cleared
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-900 truncate">
                  Regional HQ authorized <strong>NH-29 Medziphema Safe Bypass</strong>. High-risk Piphema landslide sector avoided.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetWorkflow}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline self-end sm:self-auto shrink-0"
              title="Reset workflow for re-testing"
            >
              Reset Demo Workflow
            </button>
          </div>
        )}

        {/* Top Turn-by-Turn Navigation HUD Card */}
        <NavigationTurnCard
          distanceToNextStep={sim.distanceToNextStepText}
          nextStep={sim.nextStep}
          progressPercent={sim.progressPercent}
          remainingDistance={sim.remainingDistanceText || activeRoute.distanceText}
          eta={sim.remainingDurationText || activeRoute.durationText}
          isPlaying={sim.isPlaying}
          speed={sim.speed}
          currentRoad={isAlternateActive ? "NH-29 Medziphema Bypass" : "Asian Highway 1 / NH-2"}
          isNavigating={isNavigating}
          onPlay={handlePlay}
          onPause={handlePause}
          onRestart={handleRestart}
          onSpeedChange={sim.setSpeed}
        />

        {/* Central Map & In-Cab Stage */}
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_20.5rem] xl:grid-cols-[minmax(0,1fr)_22rem] min-w-0 items-stretch flex-1 lg:min-h-0 lg:overflow-hidden">
          {/* Main Column: Real Interactive Google Road Map & Bottom Summary */}
          <div className="flex flex-col gap-2 min-w-0 flex-1 lg:min-h-0 lg:h-full">
            {/* Real Interactive Google Road Map */}
            <div className="flex-1 min-h-[380px] lg:min-h-0 w-full min-w-0 relative rounded-2xl overflow-hidden shadow-lg border border-border/80">
              <DriverMap
                activeRoute={activeRoute}
                alternateRoute={isAlternateActive ? primaryRoute : alternateRoute}
                isAlternateActive={isAlternateActive}
                currentPosition={sim.currentPosition}
                heading={sim.heading}
                onSelectAlternate={handleSelectAlternate}
                onSelectPrimary={handleSelectPrimary}
                autoFollow={autoFollow}
                onToggleAutoFollow={handleToggleAutoFollow}
                recenterTrigger={recenterTrigger}
                isNavigating={isNavigating}
                onStartNavigation={handleStartNavigation}
              />
            </div>

            {/* In-Cab Bottom Navigation Summary Bar */}
            <NavigationBottomBar
              currentRoute={activeRoute}
              alternateRoute={alternateRoute}
              isAlternateActive={isAlternateActive}
              onReroute={handleSelectAlternate}
              onRevert={handleSelectPrimary}
              onRecenter={handleRecenter}
              isRecenterActive={autoFollow}
              isNavigating={isNavigating}
              onStartNavigation={handleStartNavigation}
              onRestart={handleRestart}
              remainingDistanceText={sim.remainingDistanceText}
              remainingDurationText={sim.remainingDurationText}
              etaArrivalTime={sim.etaArrivalTime}
            />
          </div>

          {/* Right Column: Route Risk Comparison, Hazard Details & Road Legs */}
          <div className="flex flex-col gap-2.5 min-w-0 lg:h-full lg:overflow-y-auto lg:pr-1 scrollbar-thin">
            {/* Route & Risk Comparison Card */}
            <Panel title={t("route_comparison")}>
              <div className="flex flex-col gap-2.5">
                {/* Primary Route Option (NH-2) */}
                <div
                  onClick={handleSelectPrimary}
                  className={`cursor-pointer rounded-xl p-3 transition-all border ${
                    !isAlternateActive
                      ? "border-primary/80 bg-primary/10 shadow-md ring-1 ring-primary/50"
                      : "border-slate-200/80 glass-soft hover:bg-slate-100/60 opacity-85"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">
                      NH-2 via Chumoukedima
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-red-700 bg-red-100 border border-red-200">
                      High Risk (88/100)
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>ETA 1 h 25 m · 49.7 km</span>
                    <span className="text-red-700 font-bold">
                      Landslide Debris
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between pt-1.5 border-t border-border/50 text-[11px] text-muted-foreground">
                    <span>Delay: <strong className="text-red-700">+30 min holding delay</strong></span>
                    <span>Status: Single lane</span>
                  </div>
                </div>

                {/* Alternate Route Option (NH-29 via Medziphema Bypass) */}
                <div
                  onClick={handleSelectAlternate}
                  className={`cursor-pointer rounded-xl p-3 transition-all border ${
                    isAlternateActive
                      ? "border-emerald-500/80 bg-emerald-50/90 shadow-md ring-1 ring-emerald-500/50"
                      : "border-slate-200/80 glass-soft hover:bg-slate-100/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      NH-29 via Medziphema
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200">
                      Open / Safe (12/100)
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>ETA 1 h 50 m · 63.7 km</span>
                    <span className="text-primary font-bold">+25 min detour, +14 km</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between pt-1.5 border-t border-border/50 text-[11px] text-muted-foreground">
                    <span>Delay: <strong className="text-emerald-700">+25 min transit delay</strong></span>
                    <span>Double lane open</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600 font-medium leading-relaxed">
                    Bypasses Piphema hazard along safe northern ridge corridor. Recommended for medical and heavy convoys.
                  </p>
                </div>
              </div>
            </Panel>

            {/* Hazard Warning Details Card */}
            <section className="glass rounded-2xl p-3.5 sm:p-4 border-2 border-red-300 bg-red-50/90 shadow-md">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 h-3 w-3 shrink-0 animate-pulse rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.7)]" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                      Hazard · Critical
                    </p>
                    <span className="glass-soft rounded px-1.5 py-0.2 text-[10px] font-bold text-slate-700 bg-white/80 border border-slate-200">
                      Piphema Sector
                    </span>
                  </div>
                  <h3 className="mt-0.5 font-display text-sm sm:text-base font-bold text-foreground">
                    {PIPHEMA_HAZARD.name}
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-700 font-medium">
                    {PIPHEMA_HAZARD.detail}
                  </p>

                  {/* Delay Comparison: Holding time vs Detour */}
                  <div className="mt-2.5 rounded-xl bg-white/90 p-2.5 border border-red-200 text-xs flex flex-col gap-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-slate-800">
                      <span className="text-muted-foreground font-medium">Holding Delay (NH-2):</span>
                      <strong className="text-red-700">{PIPHEMA_HAZARD.delayText} (uncertain)</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-800">
                      <span className="text-muted-foreground font-medium">Transit Detour (NH-29):</span>
                      <strong className="text-emerald-700">+25 min steady transit</strong>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-red-200/80 text-[11px]">
                    <span className="text-muted-foreground font-medium">
                      Holding time: <strong className="text-foreground">{PIPHEMA_HAZARD.delayText}</strong>
                    </span>
                    {!isAlternateActive ? (
                      <button
                        type="button"
                        onClick={handleSelectAlternate}
                        className="font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <span>Reroute Now</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    ) : (
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Safely Rerouted</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Road Status Ahead Legs */}
            <Panel title={t("road_status_ahead")} bodyClassName="p-2 sm:p-2.5">
              <ul className="divide-y divide-border/60">
                {r.legs.map((leg) => (
                  <li
                    key={leg.name}
                    className="flex items-center justify-between gap-3 px-2 py-2 hover:bg-black/[0.02] transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <StatusDot status={leg.status} size={8} />
                      <div className="min-w-0">
                        <p className="truncate text-xs sm:text-sm font-semibold text-foreground">
                          {leg.name}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">{leg.note}</p>
                      </div>
                    </div>
                    <StatusPill status={leg.status} />
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
