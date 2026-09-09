import { useEffect, useRef, useState, useCallback } from "react";
import type * as LeafletType from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Navigation,
  Maximize2,
  Layers,
  AlertTriangle,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Loader2,
  Compass,
} from "lucide-react";
import type { RouteCoordinate, RouteData } from "@/services/google-maps";
import { PIPHEMA_HAZARD } from "@/services/google-maps";

export type MapTileMode = "google_road" | "google_hybrid" | "google_terrain" | "dark_mode";
export type MapViewMode = "heading_up" | "north_up";

interface DriverMapProps {
  activeRoute: RouteData;
  alternateRoute: RouteData;
  isAlternateActive: boolean;
  currentPosition: RouteCoordinate;
  heading: number;
  onSelectAlternate: () => void;
  onSelectPrimary: () => void;
  autoFollow: boolean;
  onToggleAutoFollow: () => void;
  recenterTrigger?: number;
  isNavigating?: boolean;
  onStartNavigation?: () => void;
}

// Compute geographic coordinate offset ahead along travel heading
export function computeLookAheadCoord(
  coord: RouteCoordinate,
  bearingDeg: number,
  distanceMeters: number,
): RouteCoordinate {
  const R = 6371e3;
  const δ = distanceMeters / R;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (coord.lat * Math.PI) / 180;
  const λ1 = (coord.lng * Math.PI) / 180;

  const sinφ2 = Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(θ) * Math.sin(δ) * Math.cos(φ1);
  const x = Math.cos(δ) - Math.sin(φ1) * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);

  return {
    lat: (φ2 * 180) / Math.PI,
    lng: (λ2 * 180) / Math.PI,
  };
}

// Tile layers: Google Maps road, satellite hybrid, terrain, and dark mode
const TILE_LAYERS: Record<
  MapTileMode,
  { url: string; subdomains?: string[]; maxZoom: number; label: string }
> = {
  google_road: {
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    maxZoom: 20,
    label: "Google Roadmap",
  },
  google_hybrid: {
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    maxZoom: 20,
    label: "Google Satellite",
  },
  google_terrain: {
    url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
    maxZoom: 20,
    label: "Google Terrain",
  },
  dark_mode: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    subdomains: ["a", "b", "c", "d"],
    maxZoom: 19,
    label: "RouteX Dark Night",
  },
};

export function DriverMap({
  activeRoute,
  alternateRoute,
  isAlternateActive,
  currentPosition,
  heading,
  onSelectAlternate,
  onSelectPrimary,
  autoFollow,
  onToggleAutoFollow,
  recenterTrigger,
  isNavigating = false,
  onStartNavigation,
}: DriverMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const tileLayerRef = useRef<LeafletType.TileLayer | null>(null);
  const LRef = useRef<typeof LeafletType | null>(null);

  // Map overlays
  const activeGlowPolylineRef = useRef<LeafletType.Polyline | null>(null);
  const activePolylineRef = useRef<LeafletType.Polyline | null>(null);
  const alternatePolylineRef = useRef<LeafletType.Polyline | null>(null);
  const vehicleMarkerRef = useRef<LeafletType.Marker | null>(null);
  const hazardCircleRef = useRef<LeafletType.Circle | null>(null);

  const [isClientReady, setIsClientReady] = useState(false);
  const [tileMode, setTileMode] = useState<MapTileMode>("google_road");
  const [viewMode, setViewMode] = useState<MapViewMode>("heading_up");

  // Fit bounds to show entire active route + hazard
  const fitRouteBounds = useCallback(() => {
    if (!mapInstanceRef.current || !LRef.current) return;
    const points: [number, number][] = activeRoute.path.map((c) => [c.lat, c.lng]);
    points.push([PIPHEMA_HAZARD.coord.lat, PIPHEMA_HAZARD.coord.lng]);
    const bounds = LRef.current.latLngBounds(points);
    mapInstanceRef.current.fitBounds(bounds, {
      paddingTopLeft: [45, 30],
      paddingBottomRight: [45, 30],
      maxZoom: 14,
    });
  }, [activeRoute.path]);

  // Create Google Maps navigation vehicle puck with directional beam
  const createVehicleIcon = useCallback((L: typeof LeafletType, angle: number) => {
    return L.divIcon({
      className: "routex-nav-vehicle-puck",
      iconSize: [52, 52],
      iconAnchor: [26, 26],
      html: `
        <div style="position:relative; width:52px; height:52px; display:flex; align-items:center; justify-content:center;">
          <!-- Forward Headlight Beam Cone -->
          <div style="
            position: absolute;
            bottom: 26px;
            width: 0;
            height: 0;
            border-left: 22px solid transparent;
            border-right: 22px solid transparent;
            border-top: 55px solid rgba(56, 189, 248, 0.28);
            filter: blur(4px);
            transform: rotate(${angle}deg);
            transform-origin: center bottom;
            pointer-events: none;
          "></div>
          <!-- Pulsing Radar Ring -->
          <div style="
            position: absolute;
            inset: 6px;
            border-radius: 9999px;
            background: rgba(37, 99, 235, 0.22);
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <!-- Navigation Puck with Chevron -->
          <div style="
            position: relative;
            width: 36px;
            height: 36px;
            border-radius: 9999px;
            background: #2563eb;
            border: 3.5px solid #ffffff;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.6), 0 0 0 1px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(${angle}deg);
            transition: transform 0.15s ease-out;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff" stroke="#ffffff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 3 20 20 12 16 4 20 12 3"></polygon>
            </svg>
          </div>
        </div>
      `,
    });
  }, []);

  // SSR-safe client initialization of Leaflet
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;
    let isCancelled = false;

    import("leaflet").then((leafletModule) => {
      if (isCancelled || !mapContainerRef.current) return;
      const L = (leafletModule.default || leafletModule) as unknown as typeof LeafletType;
      LRef.current = L;

      // Clean up previous instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const initialCenter: [number, number] = [currentPosition.lat, currentPosition.lng];
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      // Base Google Road Tiles
      const currentLayerConfig = TILE_LAYERS[tileMode];
      const tileLayer = L.tileLayer(currentLayerConfig.url, {
        maxZoom: currentLayerConfig.maxZoom,
        subdomains: currentLayerConfig.subdomains || ["mt0", "mt1", "mt2", "mt3"],
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      // Origin Marker (Dimapur Logistics Hub)
      const originIcon = L.divIcon({
        className: "routex-origin-icon",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        html: `
          <div style="
            width: 34px;
            height: 34px;
            background: #0284c7;
            border: 3px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            color: white;
            font-size: 14px;
            font-weight: bold;
          ">
            📦
          </div>
        `,
      });
      const originMarker = L.marker([activeRoute.origin.coord.lat, activeRoute.origin.coord.lng], {
        icon: originIcon,
        title: activeRoute.origin.name,
      }).addTo(map);
      originMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <strong style="color: #0369a1; font-size: 13px;">${activeRoute.origin.name}</strong>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">Convoy Dispatch Point · Dimapur NER Hub</p>
        </div>
      `);

      // Destination Marker (Kohima CHC)
      const destIcon = L.divIcon({
        className: "routex-dest-icon",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        html: `
          <div style="
            width: 34px;
            height: 34px;
            background: #10b981;
            border: 3px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            color: white;
            font-size: 16px;
          ">
            🏁
          </div>
        `,
      });
      const destMarker = L.marker([activeRoute.destination.coord.lat, activeRoute.destination.coord.lng], {
        icon: destIcon,
        title: activeRoute.destination.name,
      }).addTo(map);
      destMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <strong style="color: #059669; font-size: 13px;">${activeRoute.destination.name}</strong>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">Medical & Logistics Delivery Terminus</p>
        </div>
      `);

      // Hazard Marker (Piphema Landslide Zone)
      const hazardIcon = L.divIcon({
        className: "routex-hazard-icon",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        html: `
          <div style="
            width: 34px;
            height: 34px;
            background: #dc2626;
            border: 3px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.7);
            animation: pulse 1.5s infinite;
            color: white;
            font-size: 16px;
          ">
            ⚠️
          </div>
        `,
      });
      const hazardMarker = L.marker([PIPHEMA_HAZARD.coord.lat, PIPHEMA_HAZARD.coord.lng], {
        icon: hazardIcon,
        title: PIPHEMA_HAZARD.name,
        zIndexOffset: 100,
      }).addTo(map);

      hazardMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 6px; min-width: 200px;">
          <h4 style="margin: 0 0 4px 0; color: #b91c1c; font-size: 13px; font-weight: bold;">
            ⚠️ ${PIPHEMA_HAZARD.name}
          </h4>
          <p style="margin: 0 0 4px 0; font-size: 11px; color: #334155;">
            ${PIPHEMA_HAZARD.road}
          </p>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #475569;">
            ${PIPHEMA_HAZARD.detail}
          </p>
          <div style="background: #fee2e2; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: bold; color: #991b1b; margin-bottom: 8px;">
            Delay: ${PIPHEMA_HAZARD.delayText}
          </div>
        </div>
      `);

      // Hazard danger circle
      const hazardCircle = L.circle([PIPHEMA_HAZARD.coord.lat, PIPHEMA_HAZARD.coord.lng], {
        radius: 900,
        color: "#ef4444",
        weight: 2,
        fillColor: "#ef4444",
        fillOpacity: isAlternateActive ? 0.08 : 0.28,
      }).addTo(map);
      hazardCircleRef.current = hazardCircle;

      // Active Route Polyline (Google Navigation Blue with soft glow casing)
      const activeCoords: [number, number][] = activeRoute.path.map((c) => [c.lat, c.lng]);
      const glowPolyline = L.polyline(activeCoords, {
        color: "#1d4ed8",
        weight: 11,
        opacity: 0.35,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      activeGlowPolylineRef.current = glowPolyline;

      const activePolyline = L.polyline(activeCoords, {
        color: "#2563eb", // Google Navigation Blue
        weight: 6,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      activePolylineRef.current = activePolyline;

      // Alternate Route Polyline (Muted Slate with dashed styling)
      const altCoords: [number, number][] = alternateRoute.path.map((c) => [c.lat, c.lng]);
      const altPolyline = L.polyline(altCoords, {
        color: "#64748b",
        weight: 4,
        opacity: 0.7,
        dashArray: "8, 8",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      altPolyline.bindTooltip("Click to switch route", { sticky: true });
      altPolyline.on("click", () => {
        if (isAlternateActive) {
          onSelectPrimary();
        } else {
          onSelectAlternate();
        }
      });
      alternatePolylineRef.current = altPolyline;

      // Vehicle Marker (Simulated Convoy RX-217)
      const vehicleMarker = L.marker([currentPosition.lat, currentPosition.lng], {
        icon: createVehicleIcon(L, heading),
        zIndexOffset: 1000,
      }).addTo(map);
      vehicleMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <strong style="color: #0284c7; font-size: 13px;">Convoy RX-217</strong>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #475569;">Driver: K. Longkumer · Medical Supplies</p>
        </div>
      `);
      vehicleMarkerRef.current = vehicleMarker;

      // Fit initial route bounds
      const allRoutePoints: [number, number][] = activeRoute.path.map((c) => [c.lat, c.lng]);
      allRoutePoints.push([PIPHEMA_HAZARD.coord.lat, PIPHEMA_HAZARD.coord.lng]);
      map.fitBounds(L.latLngBounds(allRoutePoints), {
        paddingTopLeft: [45, 30],
        paddingBottomRight: [45, 30],
        maxZoom: 14,
      });

      setIsClientReady(true);
    });

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update base tile layer when mode changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const config = TILE_LAYERS[tileMode];
    tileLayerRef.current.setUrl(config.url);
  }, [tileMode]);

  // Update polylines when active or alternate route changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const activeCoords: [number, number][] = activeRoute.path.map((c) => [c.lat, c.lng]);
    const altCoords: [number, number][] = alternateRoute.path.map((c) => [c.lat, c.lng]);

    if (activeGlowPolylineRef.current) {
      activeGlowPolylineRef.current.setLatLngs(activeCoords);
    }
    if (activePolylineRef.current) {
      activePolylineRef.current.setLatLngs(activeCoords);
      activePolylineRef.current.setStyle({
        color: isAlternateActive ? "#059669" : "#2563eb",
      });
    }
    if (alternatePolylineRef.current) {
      alternatePolylineRef.current.setLatLngs(altCoords);
    }

    if (hazardCircleRef.current) {
      hazardCircleRef.current.setStyle({
        fillOpacity: isAlternateActive ? 0.08 : 0.28,
        opacity: isAlternateActive ? 0.4 : 0.85,
      });
    }

    fitRouteBounds();
  }, [activeRoute, alternateRoute, isAlternateActive, fitRouteBounds]);

  // Update vehicle position and heading rotation
  useEffect(() => {
    if (!vehicleMarkerRef.current || !mapInstanceRef.current || !LRef.current) return;

    const latLng: [number, number] = [currentPosition.lat, currentPosition.lng];
    vehicleMarkerRef.current.setLatLng(latLng);
    vehicleMarkerRef.current.setIcon(createVehicleIcon(LRef.current, heading));

    if (autoFollow) {
      if (isNavigating && viewMode === "heading_up") {
        const cameraTarget = computeLookAheadCoord(currentPosition, heading, 360);
        mapInstanceRef.current.setView([cameraTarget.lat, cameraTarget.lng], 15, { animate: false });
      } else if (isNavigating) {
        mapInstanceRef.current.setView(latLng, 15, { animate: false });
      } else {
        mapInstanceRef.current.panTo(latLng, { animate: true, duration: 0.2 });
      }
    }
  }, [currentPosition, heading, autoFollow, isNavigating, viewMode, createVehicleIcon]);

  // Recenter trigger effect to fit bounds or snap to vehicle
  useEffect(() => {
    if (recenterTrigger && recenterTrigger > 0 && mapInstanceRef.current && LRef.current) {
      if (isNavigating) {
        if (viewMode === "heading_up") {
          const cameraTarget = computeLookAheadCoord(currentPosition, heading, 360);
          mapInstanceRef.current.setView([cameraTarget.lat, cameraTarget.lng], 15, { animate: true });
        } else {
          mapInstanceRef.current.setView([currentPosition.lat, currentPosition.lng], 15, { animate: true });
        }
      } else {
        const origin = activeRoute.origin.coord;
        mapInstanceRef.current.panTo([origin.lat, origin.lng], { animate: true, duration: 0.3 });
        fitRouteBounds();
      }
    }
  }, [recenterTrigger, isNavigating, viewMode, currentPosition, heading, activeRoute.origin.coord, fitRouteBounds]);

  // Handle transition when isNavigating status changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.invalidateSize();
    if (isNavigating) {
      if (viewMode === "heading_up") {
        const cameraTarget = computeLookAheadCoord(currentPosition, heading, 360);
        mapInstanceRef.current.setView([cameraTarget.lat, cameraTarget.lng], 15, { animate: true });
      } else {
        mapInstanceRef.current.setView([currentPosition.lat, currentPosition.lng], 15, { animate: true });
      }
    } else {
      fitRouteBounds();
    }
  }, [isNavigating, fitRouteBounds]);

  // Keep Leaflet map size updated on container resize
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const ro = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });
    ro.observe(mapContainerRef.current);
    return () => {
      ro.disconnect();
    };
  }, []);

  // Handle manual map drag to pause auto follow
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleDragStart = () => {
      if (autoFollow) {
        onToggleAutoFollow();
      }
    };

    map.on("dragstart", handleDragStart);
    return () => {
      map.off("dragstart", handleDragStart);
    };
  }, [autoFollow, onToggleAutoFollow]);

  // Cycle through tile modes
  const cycleTileMode = () => {
    const modes: MapTileMode[] = ["google_road", "google_hybrid", "google_terrain", "dark_mode"];
    const nextIdx = (modes.indexOf(tileMode) + 1) % modes.length;
    setTileMode(modes[nextIdx]);
  };

  const zoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const zoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col h-full w-full relative border border-border/80 shadow-xl bg-slate-100">
      {/* Real Interactive Google Road Map Canvas with Rotatable Heading-Up Stage */}
      <div
        style={{
          position: "absolute",
          top: isNavigating && viewMode === "heading_up" ? "-30%" : "0%",
          left: isNavigating && viewMode === "heading_up" ? "-30%" : "0%",
          width: isNavigating && viewMode === "heading_up" ? "160%" : "100%",
          height: isNavigating && viewMode === "heading_up" ? "160%" : "100%",
          transform: isNavigating && viewMode === "heading_up" ? `rotate(${-heading}deg)` : "none",
          transformOrigin: "50% 50%",
          transition: "transform 0.15s cubic-bezier(0.2, 0, 0, 1)",
        }}
        className="z-0"
      >
        <div ref={mapContainerRef} className="h-full w-full bg-slate-100" />
      </div>

      {/* Loading Skeleton before Client Mount */}
      {!isClientReady && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm gap-2">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground font-semibold">Loading Google Road Map...</span>
        </div>
      )}

      {/* Floating Map Status Overlay */}
      <div className="absolute top-3 left-3 z-[400] flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="glass-soft flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold backdrop-blur-md shadow-md bg-white/90 border border-slate-200/90 text-slate-800">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold">
            {TILE_LAYERS[tileMode].label} ·{" "}
            {isAlternateActive ? "Medziphema Safe Bypass" : "NH-2 Corridor"}
          </span>
        </div>

        {/* Hazard Badge on Map */}
        {!isAlternateActive && (
          <div className="glass-soft flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold text-red-700 border border-red-200 bg-red-50/95 shadow-md">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            <span>Piphema Slide Ahead</span>
          </div>
        )}

        {isNavigating && (
          <div className="glass-soft rounded-xl px-2.5 py-1 text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 shadow-sm flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
            <span>{viewMode === "heading_up" ? "Heading-Up Nav" : "North-Up View"}</span>
          </div>
        )}
      </div>

      {/* Floating Navigation & Camera Controls */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5 pointer-events-auto">
        {/* Recenter & Follow Vehicle */}
        <button
          type="button"
          onClick={onToggleAutoFollow}
          className={`glass rounded-xl p-2.5 text-xs font-bold transition-all shadow-md ${
            autoFollow
              ? "bg-primary text-white ring-2 ring-primary/40 scale-105"
              : "text-slate-800 bg-white/90 hover:bg-white border border-slate-200/90"
          }`}
          title={autoFollow ? "Following vehicle (tap to free pan)" : "Follow vehicle"}
        >
          <Navigation className="h-4 w-4" />
        </button>

        {/* Compass / Orientation Mode Toggle */}
        <button
          type="button"
          onClick={() => setViewMode((prev) => (prev === "heading_up" ? "north_up" : "heading_up"))}
          className={`glass rounded-xl p-2.5 text-xs font-bold transition-all shadow-md ${
            viewMode === "heading_up"
              ? "bg-primary/15 text-primary border border-primary/30"
              : "text-slate-800 bg-white/90 hover:bg-white border border-slate-200/90"
          }`}
          title={
            viewMode === "heading_up"
              ? "Heading-Up Mode: Map rotates with forward travel (Click for North-Up)"
              : "North-Up Mode: Map fixed North (Click for Heading-Up)"
          }
        >
          <Compass className="h-4 w-4" />
        </button>

        {/* Fit Full Route Bounds */}
        <button
          type="button"
          onClick={fitRouteBounds}
          className="glass rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-white/90 hover:bg-white border border-slate-200/90 transition-all shadow-md"
          title="Fit full driving corridor"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        {/* Map Tile Layer Switcher */}
        <button
          type="button"
          onClick={cycleTileMode}
          className="glass rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-white/90 hover:bg-white border border-slate-200/90 transition-all shadow-md"
          title={`Layer: ${TILE_LAYERS[tileMode].label} (tap to cycle)`}
        >
          <Layers className="h-4 w-4" />
        </button>

        {/* Zoom Controls */}
        <button
          type="button"
          onClick={zoomIn}
          className="glass rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-white/90 hover:bg-white border border-slate-200/90 transition-all shadow-md"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={zoomOut}
          className="glass rounded-xl p-2.5 text-xs font-bold text-slate-800 bg-white/90 hover:bg-white border border-slate-200/90 transition-all shadow-md"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
      </div>

      {/* Start Drive Overlay Banner when Navigation is Inactive */}
      {!isNavigating && onStartNavigation && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[400] pointer-events-auto flex items-center">
          <button
            type="button"
            onClick={onStartNavigation}
            className="flex items-center gap-2 rounded-2xl px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/35 border border-emerald-400/40 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            <Navigation className="h-4 w-4" />
            <span>Start Navigation · Follow Convoy</span>
          </button>
        </div>
      )}

      {/* Map Interactive Route Legend Bar */}
      <div className="glass-soft flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-border/70 text-xs shrink-0 z-[400] bg-white/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-5 rounded-full ${
                isAlternateActive ? "bg-emerald-500" : "bg-[#2563eb]"
              }`}
            />
            <span className="text-slate-800 font-semibold">
              {isAlternateActive ? "Medziphema Bypass (Active)" : "NH-2 Active Route"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-[#64748b]" />
            <span className="text-muted-foreground font-medium">
              {isAlternateActive ? "NH-2 via Chumoukedima" : "Safe Alternate (+25m)"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444] animate-pulse" />
            <span className="text-muted-foreground font-medium">Piphema Hazard</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isAlternateActive ? (
            <button
              type="button"
              onClick={onSelectAlternate}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Switch to Safe Route (+25m)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSelectPrimary}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground bg-slate-100 hover:bg-slate-200/80 px-2 py-1 rounded-lg border border-slate-200"
            >
              Revert to NH-2
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
