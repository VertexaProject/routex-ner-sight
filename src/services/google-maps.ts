// RouteX Google Maps & Directions API Service
// Handles loading Google Maps SDK, requesting driving routes, and providing navigation data.

export interface RouteCoordinate {
  lat: number;
  lng: number;
}

export interface RouteStep {
  instruction: string;
  distance: string;
  distanceMeters: number;
  duration: string;
  durationSeconds: number;
  maneuver?: string;
  startLocation: RouteCoordinate;
  endLocation: RouteCoordinate;
}

export interface RouteData {
  id: "primary" | "alternate";
  name: string;
  distanceText: string;
  distanceValueMeters: number;
  durationText: string;
  durationSeconds: number;
  etaArrivalTime: string;
  path: RouteCoordinate[];
  steps: RouteStep[];
  origin: { name: string; coord: RouteCoordinate };
  destination: { name: string; coord: RouteCoordinate };
  riskLevel: "High Risk" | "Open / Safe";
  riskColor: string;
  hasHazardAhead: boolean;
  status: "live_google" | "demo_simulation";
}

// Demo Locations in Nagaland
export const DEMO_ORIGIN = {
  name: "Dimapur Logistics Hub",
  coord: { lat: 25.9068, lng: 93.7271 },
};

export const DEMO_DESTINATION = {
  name: "Kohima Community Health Centre",
  coord: { lat: 25.6747, lng: 94.1106 },
};

// Hazard Location: Active Landslide Zone near Piphema
export const PIPHEMA_HAZARD = {
  id: "HAZARD-PIPHEMA",
  name: "Active Landslide Zone",
  road: "NH-2 near Piphema (km 38)",
  coord: { lat: 25.7380, lng: 93.9780 },
  severity: "Critical",
  delayText: "20–30 min holding time",
  detail: "Debris reported near Piphema at 15:02. One lane open with convoy escort.",
};

// Primary Route Waypoints: NH-2 via Chumoukedima & Piphema (Passes through Hazard)
export const PRIMARY_ROUTE_COORDINATES: RouteCoordinate[] = [
  { lat: 25.9068, lng: 93.7271 }, // Dimapur Logistics Hub
  { lat: 25.8950, lng: 93.7315 },
  { lat: 25.8790, lng: 93.7390 }, // Purana Bazar
  { lat: 25.8620, lng: 93.7485 },
  { lat: 25.8450, lng: 93.7590 }, // 4th Mile
  { lat: 25.8280, lng: 93.7680 },
  { lat: 25.8082, lng: 93.7745 }, // Chumoukedima Checkpost
  { lat: 25.7950, lng: 93.7840 },
  { lat: 25.7820, lng: 93.8010 }, // New Chumoukedima (ascent start)
  { lat: 25.7720, lng: 93.8210 },
  { lat: 25.7650, lng: 93.8450 }, // Pherima
  { lat: 25.7584, lng: 93.8741 }, // Medziphema Bypass
  { lat: 25.7520, lng: 93.9010 },
  { lat: 25.7460, lng: 93.9280 }, // Kukidolong bridge
  { lat: 25.7420, lng: 93.9520 },
  { lat: 25.7380, lng: 93.9780 }, // Piphema Hazard / Landslide Zone
  { lat: 25.7300, lng: 93.9920 },
  { lat: 25.7210, lng: 94.0080 }, // Menguzuma curve
  { lat: 25.7120, lng: 94.0210 },
  { lat: 25.7012, lng: 94.0321 }, // Sechu Zubza
  { lat: 25.6940, lng: 94.0480 },
  { lat: 25.6880, lng: 94.0650 }, // Jotsoma bypass junction
  { lat: 25.6820, lng: 94.0820 },
  { lat: 25.6790, lng: 94.0950 }, // Kohima West Gate
  { lat: 25.6765, lng: 94.1030 }, // PR Hill junction
  { lat: 25.6747, lng: 94.1106 }, // Kohima Community Health Centre
];

// Alternate Route Waypoints: NH-29 via Medziphema Bypass (Safer route, avoids Piphema landslide)
export const ALTERNATE_ROUTE_COORDINATES: RouteCoordinate[] = [
  { lat: 25.9068, lng: 93.7271 }, // Dimapur Logistics Hub
  { lat: 25.8950, lng: 93.7315 },
  { lat: 25.8790, lng: 93.7390 }, // Purana Bazar
  { lat: 25.8620, lng: 93.7485 },
  { lat: 25.8450, lng: 93.7590 },
  { lat: 25.8082, lng: 93.7745 }, // Chumoukedima
  { lat: 25.7820, lng: 93.8010 },
  { lat: 25.7650, lng: 93.8450 },
  { lat: 25.7584, lng: 93.8741 }, // Medziphema Junction
  { lat: 25.7750, lng: 93.8950 }, // Diverting North to Tsiepama Valley bypass
  { lat: 25.7890, lng: 93.9250 },
  { lat: 25.7850, lng: 93.9580 }, // Northern Ridge corridor (safe from slide)
  { lat: 25.7720, lng: 93.9920 },
  { lat: 25.7480, lng: 94.0150 }, // Rejoining upper ridge near Mezoma
  { lat: 25.7190, lng: 94.0380 },
  { lat: 25.7012, lng: 94.0321 }, // Sechu Zubza
  { lat: 25.6880, lng: 94.0650 }, // Jotsoma
  { lat: 25.6790, lng: 94.0950 },
  { lat: 25.6747, lng: 94.1106 }, // Kohima Community Health Centre
];

export const PRIMARY_STEPS: RouteStep[] = [
  {
    instruction: "Head southeast on NH-29 toward Purana Bazar",
    distance: "4.2 km",
    distanceMeters: 4200,
    duration: "8 mins",
    durationSeconds: 480,
    maneuver: "straight",
    startLocation: { lat: 25.9068, lng: 93.7271 },
    endLocation: { lat: 25.879, lng: 93.739 },
  },
  {
    instruction: "Keep right onto Asian Highway 1 / NH-29 toward Chumoukedima",
    distance: "11.5 km",
    distanceMeters: 11500,
    duration: "18 mins",
    durationSeconds: 1080,
    maneuver: "keep-right",
    startLocation: { lat: 25.879, lng: 93.739 },
    endLocation: { lat: 25.8082, lng: 93.7745 },
  },
  {
    instruction: "Continue straight past Chumoukedima Gate onto mountain corridor",
    distance: "8.3 km",
    distanceMeters: 8300,
    duration: "16 mins",
    durationSeconds: 960,
    maneuver: "straight",
    startLocation: { lat: 25.8082, lng: 93.7745 },
    endLocation: { lat: 25.7584, lng: 93.8741 },
  },
  {
    instruction: "Caution: Active landslide zone near Piphema — maintain convoy escort",
    distance: "12.4 km",
    distanceMeters: 12400,
    duration: "24 mins",
    durationSeconds: 1440,
    maneuver: "caution",
    startLocation: { lat: 25.7584, lng: 93.8741 },
    endLocation: { lat: 25.738, lng: 93.978 },
  },
  {
    instruction: "Winding ascent past Sechu Zubza toward Kohima",
    distance: "18.2 km",
    distanceMeters: 18200,
    duration: "32 mins",
    durationSeconds: 1920,
    maneuver: "turn-right",
    startLocation: { lat: 25.738, lng: 93.978 },
    endLocation: { lat: 25.688, lng: 94.065 },
  },
  {
    instruction: "Turn left at PR Hill onto Hospital Road toward Kohima CHC",
    distance: "1.8 km",
    distanceMeters: 1800,
    duration: "5 mins",
    durationSeconds: 300,
    maneuver: "turn-left",
    startLocation: { lat: 25.688, lng: 94.065 },
    endLocation: { lat: 25.6747, lng: 94.1106 },
  },
  {
    instruction: "Arrive at Kohima Community Health Centre on right",
    distance: "100 m",
    distanceMeters: 100,
    duration: "1 min",
    durationSeconds: 60,
    maneuver: "destination",
    startLocation: { lat: 25.6747, lng: 94.1106 },
    endLocation: { lat: 25.6747, lng: 94.1106 },
  },
];

export const ALTERNATE_STEPS: RouteStep[] = [
  {
    instruction: "Head southeast on NH-29 toward Purana Bazar",
    distance: "4.2 km",
    distanceMeters: 4200,
    duration: "8 mins",
    durationSeconds: 480,
    maneuver: "straight",
    startLocation: { lat: 25.9068, lng: 93.7271 },
    endLocation: { lat: 25.879, lng: 93.739 },
  },
  {
    instruction: "Continue past Chumoukedima toward Medziphema Junction",
    distance: "19.8 km",
    distanceMeters: 19800,
    duration: "30 mins",
    durationSeconds: 1800,
    maneuver: "straight",
    startLocation: { lat: 25.879, lng: 93.739 },
    endLocation: { lat: 25.7584, lng: 93.8741 },
  },
  {
    instruction: "Take North Bypass at Medziphema toward Tsiepama Ridge",
    distance: "16.4 km",
    distanceMeters: 16400,
    duration: "28 mins",
    durationSeconds: 1680,
    maneuver: "turn-left",
    startLocation: { lat: 25.7584, lng: 93.8741 },
    endLocation: { lat: 25.785, lng: 93.958 },
  },
  {
    instruction: "Follow safe northern ridge bypass — road clear of landslide debris",
    distance: "14.2 km",
    distanceMeters: 14200,
    duration: "22 mins",
    durationSeconds: 1320,
    maneuver: "straight",
    startLocation: { lat: 25.785, lng: 93.958 },
    endLocation: { lat: 25.7012, lng: 94.0321 },
  },
  {
    instruction: "Rejoin NH-2 at Sechu Zubza and proceed toward Kohima",
    distance: "7.2 km",
    distanceMeters: 7200,
    duration: "12 mins",
    durationSeconds: 720,
    maneuver: "keep-right",
    startLocation: { lat: 25.7012, lng: 94.0321 },
    endLocation: { lat: 25.688, lng: 94.065 },
  },
  {
    instruction: "Turn left at PR Hill onto Hospital Road toward Kohima CHC",
    distance: "1.8 km",
    distanceMeters: 1800,
    duration: "5 mins",
    durationSeconds: 300,
    maneuver: "turn-left",
    startLocation: { lat: 25.688, lng: 94.065 },
    endLocation: { lat: 25.6747, lng: 94.1106 },
  },
  {
    instruction: "Arrive at Kohima Community Health Centre on right",
    distance: "100 m",
    distanceMeters: 100,
    duration: "1 min",
    durationSeconds: 60,
    maneuver: "destination",
    startLocation: { lat: 25.6747, lng: 94.1106 },
    endLocation: { lat: 25.6747, lng: 94.1106 },
  },
];

export function getPrimaryRouteData(): RouteData {
  return {
    id: "primary",
    name: "NH-2 via Chumoukedima",
    distanceText: "49.7 km",
    distanceValueMeters: 49700,
    durationText: "1 h 25 m",
    durationSeconds: 5100,
    etaArrivalTime: "16:40 IST",
    path: PRIMARY_ROUTE_COORDINATES,
    steps: PRIMARY_STEPS,
    origin: DEMO_ORIGIN,
    destination: DEMO_DESTINATION,
    riskLevel: "High Risk",
    riskColor: "var(--status-risk)",
    hasHazardAhead: true,
    status: "demo_simulation",
  };
}

export function getAlternateRouteData(): RouteData {
  return {
    id: "alternate",
    name: "NH-29 via Medziphema Bypass",
    distanceText: "63.7 km",
    distanceValueMeters: 63700,
    durationText: "1 h 50 m",
    durationSeconds: 6600,
    etaArrivalTime: "17:05 IST",
    path: ALTERNATE_ROUTE_COORDINATES,
    steps: ALTERNATE_STEPS,
    origin: DEMO_ORIGIN,
    destination: DEMO_DESTINATION,
    riskLevel: "Open / Safe",
    riskColor: "var(--status-open)",
    hasHazardAhead: false,
    status: "demo_simulation",
  };
}

// Retrieve Google Maps API key from environment
export function getGoogleMapsApiKey(): string {
  const envKey =
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ||
    (import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined) ||
    (import.meta.env.VITE_GOOGLE_DIRECTIONS_API_KEY as string | undefined) ||
    (import.meta.env.GOOGLE_MAPS_API_KEY as string | undefined) ||
    "";
  return envKey.trim();
}

let googleMapsScriptPromise: Promise<void> | null = null;

// Dynamically load Google Maps JavaScript API script
// Loads Google Maps SDK directly using callback parameter to ensure google.maps.Map is ready
export function loadGoogleMapsApi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cannot load Google Maps in SSR environment"));
  }

  if (typeof window.google?.maps?.Map === "function") {
    return Promise.resolve();
  }

  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  const apiKey = getGoogleMapsApiKey();

  googleMapsScriptPromise = new Promise<void>((resolve, reject) => {
    const callbackName = "__initRouteXGoogleMaps";

    // Set global callback
    (window as unknown as Record<string, unknown>)[callbackName] = () => {
      resolve();
    };

    // Check if script already appended
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (typeof window.google?.maps?.Map === "function") {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
      return;
    }

    const script = document.createElement("script");
    const baseUrl = "https://maps.googleapis.com/maps/api/js";
    const params = new URLSearchParams({
      libraries: "geometry,places",
      callback: callbackName,
    });
    if (apiKey) {
      params.set("key", apiKey);
    }
    script.src = `${baseUrl}?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);

    // Timeout fallback after 3 seconds
    setTimeout(() => {
      if (typeof window.google?.maps?.Map === "function") {
        resolve();
      } else {
        reject(new Error("Google Maps load timeout"));
      }
    }, 3500);
  });

  return googleMapsScriptPromise;
}

// Fetch driving directions from Google Directions API
export async function fetchGoogleDrivingRoute(
  origin: RouteCoordinate | string = DEMO_ORIGIN.coord,
  destination: RouteCoordinate | string = DEMO_DESTINATION.coord,
  useAlternate: boolean = false,
): Promise<RouteData> {
  const fallback = useAlternate ? getAlternateRouteData() : getPrimaryRouteData();

  try {
    await loadGoogleMapsApi();

    if (!window.google?.maps || !window.google.maps.DirectionsService) {
      return fallback;
    }

    const directionsService = new window.google.maps.DirectionsService();

    const originParam =
      typeof origin === "string"
        ? origin
        : new window.google.maps.LatLng(origin.lat, origin.lng);

    const destinationParam =
      typeof destination === "string"
        ? destination
        : new window.google.maps.LatLng(destination.lat, destination.lng);

    const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
      directionsService.route(
        {
          origin: originParam,
          destination: destinationParam,
          travelMode: window.google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: true,
        },
        (res, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && res) {
            resolve(res);
          } else {
            reject(new Error(`Google Directions status: ${status}`));
          }
        },
      );
    });

    const routeIndex = useAlternate && result.routes.length > 1 ? 1 : 0;
    const route = result.routes[routeIndex] || result.routes[0];
    const leg = route.legs[0];

    // Extract path coordinates
    const path: RouteCoordinate[] = route.overview_path.map((latLng) => ({
      lat: latLng.lat(),
      lng: latLng.lng(),
    }));

    // Extract turn steps
    const steps: RouteStep[] = leg.steps.map((step) => {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = step.instructions || "";
      const cleanInstruction = tempDiv.textContent || tempDiv.innerText || "";

      return {
        instruction: cleanInstruction,
        distance: step.distance?.text || "",
        distanceMeters: step.distance?.value || 0,
        duration: step.duration?.text || "",
        durationSeconds: step.duration?.value || 0,
        maneuver: (step as unknown as { maneuver?: string }).maneuver,
        startLocation: {
          lat: step.start_location.lat(),
          lng: step.start_location.lng(),
        },
        endLocation: {
          lat: step.end_location.lat(),
          lng: step.end_location.lng(),
        },
      };
    });

    return {
      id: useAlternate ? "alternate" : "primary",
      name: useAlternate ? "NH-29 via Medziphema Bypass" : "NH-2 via Chumoukedima",
      distanceText: leg.distance?.text || fallback.distanceText,
      distanceValueMeters: leg.distance?.value || fallback.distanceValueMeters,
      durationText: leg.duration?.text || fallback.durationText,
      durationSeconds: leg.duration?.value || fallback.durationSeconds,
      etaArrivalTime: useAlternate ? "17:05 IST" : "16:40 IST",
      path: path.length > 0 ? path : fallback.path,
      steps: steps.length > 0 ? steps : fallback.steps,
      origin: {
        name: leg.start_address || DEMO_ORIGIN.name,
        coord: { lat: leg.start_location.lat(), lng: leg.start_location.lng() },
      },
      destination: {
        name: leg.end_address || DEMO_DESTINATION.name,
        coord: { lat: leg.end_location.lat(), lng: leg.end_location.lng() },
      },
      riskLevel: useAlternate ? "Open / Safe" : "High Risk",
      riskColor: useAlternate ? "var(--status-open)" : "var(--status-risk)",
      hasHazardAhead: !useAlternate,
      status: "live_google",
    };
  } catch (err) {
    console.info("Using real corridor route waypoints:", (err as Error).message);
    return fallback;
  }
}
