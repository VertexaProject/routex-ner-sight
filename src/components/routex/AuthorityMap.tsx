import { useEffect, useRef, useState, useCallback } from "react";
import type * as LeafletType from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Maximize2,
  Layers,
  ZoomIn,
  ZoomOut,
  Truck,
  AlertTriangle,
  Radio,
  Loader2,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useRerouteWorkflow } from "@/lib/route-store";
import {
  corridors,
  vehicles,
  incidents,
  roadStatusMeta,
  type RoadStatus,
} from "@/lib/mock-data";

export type AuthorityMapTile = "google_road" | "google_hybrid" | "google_terrain";

const TILE_CONFIGS: Record<AuthorityMapTile, { url: string; labelKey: string }> = {
  google_road: {
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    labelKey: "google_maps_road",
  },
  google_hybrid: {
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    labelKey: "google_maps_satellite",
  },
  google_terrain: {
    url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
    labelKey: "google_maps_terrain",
  },
};

// Real geographic coordinate paths for the 6 NER highway corridors
const CORRIDOR_GEO_COORDINATES: Record<string, [number, number][]> = {
  nh27: [
    [26.1445, 91.7362], // Guwahati
    [26.2400, 92.1200], // Jagiroad
    [26.3452, 92.6841], // Nagaon
    [26.5775, 93.1711], // Kaziranga
    [26.5880, 93.6000], // Bokakhat
    [26.7509, 94.2037], // Jorhat
  ],
  nh715: [
    [26.6528, 92.7926], // Tezpur
    [26.8200, 92.8300], // Balipara
    [26.9600, 93.2500], // Jamiri
    [27.0800, 93.5100], // Banderdewa
    [27.0844, 93.6053], // Itanagar
  ],
  nh2: [
    [25.9068, 93.7271], // Dimapur
    [25.8082, 93.7745], // Chumoukedima
    [25.7584, 93.8741], // Medziphema
    [25.7380, 93.9780], // Piphema (Hazard Zone)
    [25.7012, 94.0321], // Sechu Zubza
    [25.6747, 94.1106], // Kohima
    [25.5100, 94.1200], // Kigwema
    [25.3200, 94.0800], // Maram
    [24.8170, 93.9368], // Imphal
  ],
  nh6: [
    [25.5788, 91.8933], // Shillong
    [25.4500, 92.2000], // Jowai
    [25.1800, 92.4200], // Lad Rymbai
    [24.8333, 92.7789], // Silchar
    [24.2246, 92.6784], // Kolasib
    [23.7271, 92.7176], // Aizawl
  ],
  nh108: [
    [28.1694, 94.8028], // Aalo / Along
    [28.2100, 95.0300], // Pangin
    [28.0664, 95.3268], // Pasighat (Bridge washout)
  ],
  nh10: [
    [26.7271, 88.3953], // Siliguri
    [26.8800, 88.4700], // Sevoke
    [27.0600, 88.4300], // Teesta Bazar
    [27.1764, 88.5300], // Rangpo
    [27.3389, 88.6065], // Gangtok
  ],
};

// Real geographic coordinates for the 5 tracked vehicle convoys
const VEHICLE_GEO_LOCATIONS: Record<string, [number, number]> = {
  "RX-104": [26.3452, 92.6841], // Nagaon (NH-27)
  "RX-217": [25.7584, 93.8741], // Approaching Piphema (NH-2)
  "RX-330": [23.8315, 91.2868], // Agartala (Tripura corridor)
  "RX-408": [24.0500, 92.6850], // Kolasib sector (NH-6)
  "RX-512": [27.1764, 88.5300], // Rangpo checkpoint (NH-10)
};

// Real geographic coordinates for reported field incidents
const INCIDENT_GEO_LOCATIONS: Record<string, [number, number]> = {
  "INC-9021": [25.7380, 93.9780], // Landslide: Piphema / Kohima
  "INC-9018": [28.0664, 95.3268], // Bridge damage: Pasighat
  "INC-9014": [27.4800, 94.5800], // Flooding: Dhemaji
  "INC-9009": [23.7500, 92.7300], // Road subsidence: Aizawl bypass
  "INC-9003": [25.5788, 91.8933], // Fallen trees: Shillong
};

const STATUS_LINE_COLORS: Record<RoadStatus, string> = {
  open: "#16a34a",
  caution: "#ca8a04",
  "high-risk": "#ea580c",
  blocked: "#dc2626",
};

export function AuthorityMap() {
  const { t } = useI18n();
  const { isRerouteAuthorized, authorizeReroute, highlightedRoad, setHighlightedRoad } =
    useRerouteWorkflow();

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const tileLayerRef = useRef<LeafletType.TileLayer | null>(null);
  const LRef = useRef<typeof LeafletType | null>(null);

  const [isClientReady, setIsClientReady] = useState(false);
  const [tileMode, setTileMode] = useState<AuthorityMapTile>("google_road");

  // Layer filter toggles
  const [showVehicles, setShowVehicles] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [showCorridors, setShowCorridors] = useState(true);

  // Overlays layer groups
  const vehiclesLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const hazardsLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const corridorsLayerRef = useRef<LeafletType.LayerGroup | null>(null);

  // Fit bounds covering the entire North Eastern Region
  const fitNERBounds = useCallback(() => {
    if (!mapInstanceRef.current || !LRef.current) return;
    const nerBounds = LRef.current.latLngBounds([
      [23.5, 88.0], // Southwest: Tripura / West Bengal border
      [28.5, 96.0], // Northeast: Arunachal Pradesh / Tibet border
    ]);
    mapInstanceRef.current.fitBounds(nerBounds, {
      padding: [30, 30],
      maxZoom: 9,
    });
  }, []);

  // Zoom into affected highway corridor (e.g. NH-2)
  const focusCorridor = useCallback((corridorId: string) => {
    if (!mapInstanceRef.current || !LRef.current) return;
    const coords = CORRIDOR_GEO_COORDINATES[corridorId];
    if (coords && coords.length > 0) {
      const bounds = LRef.current.latLngBounds(coords);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      setHighlightedRoad(corridorId);
    }
  }, [setHighlightedRoad]);

  // SSR-safe client initialization of Google Road Maps
  useEffect(() => {
    if (typeof window === "undefined" || !mapDivRef.current) return;
    let isCancelled = false;

    import("leaflet").then((leafletModule) => {
      if (isCancelled || !mapDivRef.current) return;
      const L = (leafletModule.default || leafletModule) as unknown as typeof LeafletType;
      LRef.current = L;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Center on Northeast India
      const map = L.map(mapDivRef.current, {
        center: [26.2, 92.9],
        zoom: 7,
        zoomControl: false,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      // Base Google Maps road tiles
      const tileConfig = TILE_CONFIGS[tileMode];
      const tileLayer = L.tileLayer(tileConfig.url, {
        maxZoom: 20,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      // Initialize overlay layer groups
      const corridorsGroup = L.layerGroup().addTo(map);
      const hazardsGroup = L.layerGroup().addTo(map);
      const vehiclesGroup = L.layerGroup().addTo(map);

      corridorsLayerRef.current = corridorsGroup;
      hazardsLayerRef.current = hazardsGroup;
      vehiclesLayerRef.current = vehiclesGroup;

      // 1. Draw highway corridors
      corridors.forEach((c) => {
        const coords = CORRIDOR_GEO_COORDINATES[c.id];
        if (!coords) return;

        const isHighlighted = highlightedRoad === c.id;
        const color = STATUS_LINE_COLORS[c.status];

        // Soft outer casing line for high contrast over Google Maps
        L.polyline(coords, {
          color: isHighlighted ? "#0284c7" : "#ffffff",
          weight: isHighlighted ? 10 : 8,
          opacity: 0.8,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(corridorsGroup);

        const poly = L.polyline(coords, {
          color: color,
          weight: isHighlighted ? 6 : 4.5,
          opacity: 0.95,
          dashArray: c.status === "blocked" ? "8, 6" : undefined,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(corridorsGroup);

        poly.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px; min-width: 220px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <strong style="color: #0f172a; font-size: 13px;">${c.name}</strong>
              <span style="background: ${color}20; color: ${color}; font-weight: bold; font-size: 11px; padding: 2px 6px; border-radius: 6px;">
                ${roadStatusMeta[c.status].label}
              </span>
            </div>
            <p style="margin: 0; font-size: 11px; color: #475569;">${c.note}</p>
          </div>
        `);
      });

      // 2. Draw incidents & critical hazards
      incidents.forEach((inc) => {
        const coord = INCIDENT_GEO_LOCATIONS[inc.id];
        if (!coord) return;

        const isCritical = inc.severity === "Critical";
        const isPiphemaLandslide = inc.id === "INC-9021";

        const hazardIcon = L.divIcon({
          className: "routex-auth-hazard-icon",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          html: `
            <div style="
              width: 32px;
              height: 32px;
              background: ${isCritical ? "#dc2626" : "#ea580c"};
              border: 3px solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(220, 38, 38, 0.6);
              color: white;
              font-size: 14px;
              animation: ${isCritical ? "pulse 1.8s infinite" : "none"};
            ">
              ${inc.type.includes("Landslide") ? "⚠️" : inc.type.includes("Bridge") ? "🚧" : "🌧️"}
            </div>
          `,
        });

        const marker = L.marker(coord, { icon: hazardIcon, zIndexOffset: 500 }).addTo(hazardsGroup);

        // Danger zone radius circle for critical hazards
        if (isCritical) {
          L.circle(coord, {
            radius: 1200,
            color: "#dc2626",
            weight: 2,
            fillColor: "#dc2626",
            fillOpacity: 0.18,
          }).addTo(hazardsGroup);
        }

        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 6px; min-width: 220px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <strong style="color: #b91c1c; font-size: 13px;">⚠️ ${inc.type}</strong>
              <span style="background: #fee2e2; color: #991b1b; font-weight: bold; font-size: 10px; padding: 2px 6px; border-radius: 4px;">
                ${inc.severity}
              </span>
            </div>
            <p style="margin: 0 0 4px 0; font-size: 11px; color: #334155; font-weight: 600;">${inc.place}</p>
            <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">Reported by ${inc.reportedBy} · ${inc.ago}</p>
            ${
              isPiphemaLandslide
                ? `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; margin-top: 6px;">
                  <span style="font-size: 10px; color: #475569; display: block; margin-bottom: 2px;">Affected: Convoy RX-217 (Medical supplies)</span>
                  <span style="font-size: 11px; font-weight: bold; color: ${isRerouteAuthorized ? "#16a34a" : "#ea580c"};">
                    ${isRerouteAuthorized ? "✓ Reroute to NH-29 Authorized" : "Action: Reroute Recommended"}
                  </span>
                </div>
              `
                : ""
            }
          </div>
        `);
      });

      // 3. Draw tracked vehicle convoys
      vehicles.forEach((v) => {
        const coord = VEHICLE_GEO_LOCATIONS[v.id];
        if (!coord) return;

        const vehicleIcon = L.divIcon({
          className: "routex-auth-vehicle-icon",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          html: `
            <div style="
              width: 32px;
              height: 32px;
              background: #0284c7;
              border: 2.5px solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 3px 10px rgba(2, 132, 199, 0.5);
              color: white;
              font-size: 13px;
            ">
              🚚
            </div>
          `,
        });

        const vMarker = L.marker(coord, { icon: vehicleIcon, zIndexOffset: 400 }).addTo(vehiclesGroup);
        vMarker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px; min-width: 180px;">
            <strong style="color: #0369a1; font-size: 13px;">${v.label} (${v.id})</strong>
            <p style="margin: 3px 0 0 0; font-size: 11px; color: #334155;">Driver: ${v.driver}</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Cargo: ${v.cargo}</p>
            <div style="margin-top: 4px;">
              <span style="background: ${STATUS_LINE_COLORS[v.status]}15; color: ${STATUS_LINE_COLORS[v.status]}; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px;">
                Status: ${roadStatusMeta[v.status].label}
              </span>
            </div>
          </div>
        `);
      });

      // Fit full region bounds
      fitNERBounds();
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

  // Update base tile url when tileMode changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const config = TILE_CONFIGS[tileMode];
    tileLayerRef.current.setUrl(config.url);
  }, [tileMode]);

  // Handle layer visibility toggles
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (vehiclesLayerRef.current) {
      if (showVehicles) mapInstanceRef.current.addLayer(vehiclesLayerRef.current);
      else mapInstanceRef.current.removeLayer(vehiclesLayerRef.current);
    }
    if (hazardsLayerRef.current) {
      if (showHazards) mapInstanceRef.current.addLayer(hazardsLayerRef.current);
      else mapInstanceRef.current.removeLayer(hazardsLayerRef.current);
    }
    if (corridorsLayerRef.current) {
      if (showCorridors) mapInstanceRef.current.addLayer(corridorsLayerRef.current);
      else mapInstanceRef.current.removeLayer(corridorsLayerRef.current);
    }
  }, [showVehicles, showHazards, showCorridors]);

  // Cycle tile mode
  const cycleTile = () => {
    const modes: AuthorityMapTile[] = ["google_road", "google_hybrid", "google_terrain"];
    const nextIdx = (modes.indexOf(tileMode) + 1) % modes.length;
    setTileMode(modes[nextIdx]);
  };

  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col h-full min-h-[380px] sm:min-h-[480px] relative border border-border/80 shadow-lg">
      {/* Real Google Maps Container */}
      <div ref={mapDivRef} className="h-full w-full flex-1 min-h-0 bg-[#e5e7eb] z-0" />

      {/* Loading overlay */}
      {!isClientReady && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm gap-2">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
          <span className="text-xs font-semibold text-foreground">Loading Regional Google Map...</span>
        </div>
      )}

      {/* Top Left: Map Mode Status & Quick Filter Overlay */}
      <div className="absolute top-3 left-3 z-[400] flex flex-wrap items-center gap-2 pointer-events-auto max-w-[85%]">
        <div className="glass-soft flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm text-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold">
            {t(TILE_CONFIGS[tileMode].labelKey)} · North Eastern Region
          </span>
        </div>

        {/* Hazard Alert notification chip */}
        <button
          type="button"
          onClick={() => focusCorridor("nh2")}
          className="glass-soft flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold text-rose-600 border border-rose-500/30 hover:bg-rose-50/80 transition-all shadow-sm"
          title="Zoom to active landslide on NH-2"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
          <span>NH-2 Piphema Slide</span>
        </button>

        {/* Layer Toggles */}
        <div className="hidden sm:flex items-center gap-1 glass-soft rounded-xl p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setShowVehicles((prev) => !prev)}
            className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${
              showVehicles ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Convoys ({vehicles.length})
          </button>
          <button
            type="button"
            onClick={() => setShowHazards((prev) => !prev)}
            className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${
              showHazards ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Hazards ({incidents.length})
          </button>
          <button
            type="button"
            onClick={() => setShowCorridors((prev) => !prev)}
            className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${
              showCorridors ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Corridors ({corridors.length})
          </button>
        </div>
      </div>

      {/* Top Right: Map Camera Controls */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={fitNERBounds}
          className="glass rounded-xl p-2.5 text-xs font-bold text-foreground hover:bg-black/5 transition-all shadow-md"
          title="Fit entire North Eastern Region"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={cycleTile}
          className="glass rounded-xl p-2.5 text-xs font-bold text-foreground hover:bg-black/5 transition-all shadow-md"
          title={`Switch Map: ${t(TILE_CONFIGS[tileMode].labelKey)}`}
        >
          <Layers className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="glass rounded-xl p-2.5 text-xs font-bold text-foreground hover:bg-black/5 transition-all shadow-md"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="glass rounded-xl p-2.5 text-xs font-bold text-foreground hover:bg-black/5 transition-all shadow-md"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom GIS Legend Bar */}
      <div className="glass-soft flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-border/60 text-xs shrink-0 z-[400] bg-white/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-full bg-[#16a34a]" />
            <span className="text-foreground font-semibold">Open</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-full bg-[#ca8a04]" />
            <span className="text-foreground font-semibold">Caution</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-full bg-[#ea580c]" />
            <span className="text-foreground font-semibold">High Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-full bg-[#dc2626]" />
            <span className="text-foreground font-semibold">Blocked</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-base">🚚</span>
            <span className="text-muted-foreground font-medium">Convoy</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-base">⚠️</span>
            <span className="text-muted-foreground font-medium">Hazard</span>
          </div>
        </div>
      </div>
    </div>
  );
}
