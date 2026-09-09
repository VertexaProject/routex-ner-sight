import { useState, useEffect, useRef, useCallback } from "react";
import type { RouteCoordinate, RouteStep } from "@/services/google-maps";

// Calculate spherical bearing between two coordinates
export function calculateBearing(start: RouteCoordinate, end: RouteCoordinate): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(start.lat);
  const lat2 = toRad(end.lat);
  const dLng = toRad(end.lng - start.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

// Calculate great-circle distance between two coordinates in meters
export function calculateDistanceMeters(p1: RouteCoordinate, p2: RouteCoordinate): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const φ1 = toRad(p1.lat);
  const φ2 = toRad(p2.lat);
  const Δφ = toRad(p2.lat - p1.lat);
  const Δλ = toRad(p2.lng - p1.lng);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// Calculate shortest-arc angular interpolation between two bearings
export function interpolateAngle(a: number, b: number, t: number): number {
  let diff = (b - a) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return (a + diff * Math.max(0, Math.min(1, t)) + 360) % 360;
}

export const SPEED_OPTIONS = [0.1, 0.25, 0.5, 1, 1.5, 2] as const;
export type SimulationSpeed = (typeof SPEED_OPTIONS)[number];

export interface VehicleSimulationState {
  currentPosition: RouteCoordinate;
  heading: number;
  progressPercent: number;
  currentStepIndex: number;
  nextStep: RouteStep | null;
  distanceToNextStepText: string;
  remainingDistanceText: string;
  remainingDurationText: string;
  etaArrivalTime: string;
  remainingMeters: number;
  totalDistanceMeters: number;
  currentDistanceMeters: number;
  isPlaying: boolean;
  isArrived: boolean;
  speed: number;
  play: () => void;
  pause: () => void;
  reset: () => void;
  restart: () => void;
  setSpeed: (speed: number) => void;
  updateLiveLocation: (coord: RouteCoordinate, heading?: number) => void;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 45) return "1 min";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} h ${mins} m`;
  }
  return `${mins} min`;
}

export function useVehicleSimulation(
  path: RouteCoordinate[],
  steps: RouteStep[],
  initialPlaying: boolean = false,
  totalDurationSeconds: number = 5100,
): VehicleSimulationState {
  const [isPlaying, setIsPlaying] = useState(initialPlaying);
  const [speed, setSpeed] = useState<number>(1);
  const [currentDistanceMeters, setCurrentDistanceMeters] = useState(0);
  const [liveOverride, setLiveOverride] = useState<{ coord: RouteCoordinate; heading?: number } | null>(null);

  const safePath = path.length > 1 ? path : [{ lat: 25.9068, lng: 93.7271 }, { lat: 25.6747, lng: 94.1106 }];

  // Precompute cumulative segment distances and bearings
  const { cumulativeDistances, totalDistanceMeters, segmentBearings } = useRef<{
    cumulativeDistances: number[];
    totalDistanceMeters: number;
    segmentBearings: number[];
  }>({ cumulativeDistances: [0], totalDistanceMeters: 0, segmentBearings: [0] }).current = (() => {
    const cum: number[] = [0];
    const bearings: number[] = [];
    let sum = 0;
    for (let i = 0; i < safePath.length - 1; i++) {
      const d = calculateDistanceMeters(safePath[i], safePath[i + 1]);
      sum += d;
      cum.push(sum);
      bearings.push(calculateBearing(safePath[i], safePath[i + 1]));
    }
    if (bearings.length === 0) bearings.push(0);
    return {
      cumulativeDistances: cum,
      totalDistanceMeters: Math.max(1, sum),
      segmentBearings: bearings,
    };
  })();

  // Reset distance if route path completely changes
  const prevPathLen = useRef(safePath.length);
  useEffect(() => {
    if (prevPathLen.current !== safePath.length) {
      prevPathLen.current = safePath.length;
      setCurrentDistanceMeters(0);
    }
  }, [safePath.length]);

  // Find exact position along route polyline for currentDistanceMeters
  let segIndex = 0;
  while (
    segIndex < cumulativeDistances.length - 2 &&
    cumulativeDistances[segIndex + 1] <= currentDistanceMeters
  ) {
    segIndex++;
  }

  const segStartDist = cumulativeDistances[segIndex] || 0;
  const segEndDist = cumulativeDistances[segIndex + 1] || totalDistanceMeters;
  const segLen = Math.max(0.1, segEndDist - segStartDist);
  const segProgress = Math.max(0, Math.min(1, (currentDistanceMeters - segStartDist) / segLen));

  const p1 = safePath[segIndex] || safePath[0];
  const p2 = safePath[Math.min(segIndex + 1, safePath.length - 1)] || p1;

  const currentPosition: RouteCoordinate = liveOverride
    ? liveOverride.coord
    : {
        lat: p1.lat + (p2.lat - p1.lat) * segProgress,
        lng: p1.lng + (p2.lng - p1.lng) * segProgress,
      };

  const b1 = segmentBearings[segIndex] ?? 0;
  const b2 = segmentBearings[Math.min(segIndex + 1, segmentBearings.length - 1)] ?? b1;
  const calculatedHeading = interpolateAngle(b1, b2, segProgress);
  const heading = liveOverride?.heading ?? calculatedHeading;

  // Check arrival status
  const isArrived = currentDistanceMeters >= totalDistanceMeters - 20;

  // Progress percent
  const progressPercent = isArrived
    ? 100
    : Math.min(99, Math.max(0, Math.round((currentDistanceMeters / totalDistanceMeters) * 100)));

  // Remaining distance estimate
  const remainingMeters = isArrived ? 0 : Math.max(0, totalDistanceMeters - currentDistanceMeters);
  const remainingDistanceText = isArrived ? "0 m" : formatDistance(remainingMeters);

  // Dynamic remaining duration and arrival clock time
  const remainingSeconds = Math.max(0, Math.round(totalDurationSeconds * (remainingMeters / totalDistanceMeters)));
  const remainingDurationText = isArrived ? "Arrived" : formatDuration(remainingSeconds);
  const etaArrivalTime = isArrived
    ? "Arrived"
    : new Date(Date.now() + remainingSeconds * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

  // Active step calculation
  let currentStepIndex = 0;
  let cumStepMeters = 0;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    cumStepMeters += s.distanceMeters || 4000;
    if (currentDistanceMeters < cumStepMeters) {
      currentStepIndex = i;
      break;
    }
    currentStepIndex = i;
  }
  const nextStep = isArrived
    ? {
        instruction: "Arrived at Destination — Kohima CHC",
        distanceText: "0 m",
        durationText: "0 min",
        maneuver: "destination",
        startLocation: safePath[safePath.length - 1],
        endLocation: safePath[safePath.length - 1],
        distanceMeters: 0,
      }
    : steps[currentStepIndex] || null;

  // Maneuver distance: meters from currentPosition to active step endLocation
  const distToManeuver = nextStep
    ? calculateDistanceMeters(currentPosition, nextStep.endLocation)
    : 0;
  const distanceToNextStepText = isArrived
    ? "Arrived"
    : nextStep
    ? `In ${formatDistance(Math.max(50, distToManeuver))}`
    : "";

  // Simulation advance loop
  useEffect(() => {
    if (!isPlaying || safePath.length <= 1) return;

    const intervalMs = 40; // 25 fps updates
    // Base speed: 320 meters/second at 1x speed (~150 sec for 49.7 km route)
    // At 0.1x: 32 m/s
    // At 2x: 640 m/s
    const baseMetersPerSec = 320;

    const interval = setInterval(() => {
      const incrementMeters = (intervalMs / 1000) * baseMetersPerSec * speed;

      setCurrentDistanceMeters((prev) => {
        const next = prev + incrementMeters;
        if (next >= totalDistanceMeters) {
          setIsPlaying(false);
          return totalDistanceMeters;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, speed, totalDistanceMeters, safePath.length]);

  const play = useCallback(() => {
    if (currentDistanceMeters >= totalDistanceMeters - 20) {
      setCurrentDistanceMeters(0);
    }
    setIsPlaying(true);
  }, [currentDistanceMeters, totalDistanceMeters]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentDistanceMeters(0);
    setLiveOverride(null);
  }, []);

  const restart = useCallback(() => {
    setCurrentDistanceMeters(0);
    setLiveOverride(null);
    setIsPlaying(true);
  }, []);

  const updateLiveLocation = useCallback((coord: RouteCoordinate, newHeading?: number) => {
    setLiveOverride({ coord, heading: newHeading });
  }, []);

  return {
    currentPosition,
    heading,
    progressPercent,
    currentStepIndex,
    nextStep,
    distanceToNextStepText,
    remainingDistanceText,
    remainingDurationText,
    etaArrivalTime,
    remainingMeters,
    totalDistanceMeters,
    currentDistanceMeters,
    isPlaying,
    isArrived,
    speed,
    play,
    pause,
    reset,
    restart,
    setSpeed,
    updateLiveLocation,
  };
}
