import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseIncident {
  id: string;
  created_at: string;
  incident_type: string;
  severity: "Critical" | "High" | "Moderate" | "Low" | string;
  road_id: string;
  latitude: number;
  longitude: number;
  description: string;
  photo_url?: string;
  reported_by?: string;
}

export interface SupabaseAlert {
  id: string;
  created_at: string;
  title: string;
  message?: string;
  severity: string;
  status: string;
  road_id?: string;
  alert_type?: string;
  incident_type?: string;
}

export interface EnrichedSupabaseAlert extends SupabaseAlert {
  incident?: SupabaseIncident;
  gpsLocation?: string;
  reportedBy?: string;
  photoUrl?: string;
  resolvedIncidentType?: string;
}

export function getSupabaseConfig() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  const url = (envUrl || "https://csuniakcugywblwppbus.supabase.co").trim().replace(/\/$/, "");
  const rawKey = (envKey || "sb_publishable_nzqOVT_xQUCwgVJKrlq4aQ_rQPxUzrE").trim().replace(/^["']|["']$/g, "");

  // Supabase publishable keys start with sb_publishable_ (normalize hyphen if present)
  const apiKey = rawKey.replace(/^sb_publishable-/, "sb_publishable_");

  return { url, rawKey, apiKey };
}

const { url: supabaseUrl, apiKey: supabaseApiKey } = getSupabaseConfig();

/**
 * Standard Supabase client instance initialized with project URL and publishable key
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseApiKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Checks if an alert is currently active
 */
export function isAlertActive(alert: SupabaseAlert): boolean {
  if (!alert.status) return true;
  const s = alert.status.toLowerCase().trim();
  return s !== "resolved" && s !== "closed" && s !== "dismissed" && s !== "archived";
}

/**
 * Sorts alerts so active alerts appear first, and within each group newest alerts appear first
 */
export function sortAlertsNewestActiveFirst(alerts: SupabaseAlert[]): SupabaseAlert[] {
  return [...alerts].sort((a, b) => {
    const aActive = isAlertActive(a);
    const bActive = isAlertActive(b);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;

    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * Fetch latest alerts from Supabase 'alerts' table
 */
export async function fetchLatestAlerts(): Promise<SupabaseAlert[]> {
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[Supabase alerts query error]", error);
    throw error;
  }

  const alerts = (data || []) as unknown as SupabaseAlert[];
  return sortAlertsNewestActiveFirst(alerts);
}

/**
 * Fetch latest incidents from Supabase 'incidents' table
 */
export async function fetchLatestIncidents(): Promise<SupabaseIncident[]> {
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[Supabase incidents query error]", error);
    throw error;
  }

  return (data || []) as unknown as SupabaseIncident[];
}

/**
 * Enriches alerts with details from the incidents table (GPS, reporter, photo, incident type)
 */
export function enrichAlertsWithIncidents(
  alerts: SupabaseAlert[],
  incidents: SupabaseIncident[]
): EnrichedSupabaseAlert[] {
  return alerts.map((alert) => {
    // Match by road_id
    const matchingIncident = incidents.find((inc) => {
      if (!alert.road_id || !inc.road_id) return false;
      return (
        normalizeRoadToCorridorId(inc.road_id) ===
        normalizeRoadToCorridorId(alert.road_id)
      );
    });

    const gpsLocation =
      matchingIncident &&
      typeof matchingIncident.latitude === "number" &&
      typeof matchingIncident.longitude === "number"
        ? `${matchingIncident.latitude.toFixed(4)}° N, ${matchingIncident.longitude.toFixed(4)}° E`
        : undefined;

    return {
      ...alert,
      incident: matchingIncident,
      gpsLocation,
      reportedBy: matchingIncident?.reported_by,
      photoUrl: matchingIncident?.photo_url,
      resolvedIncidentType:
        alert.alert_type ||
        matchingIncident?.incident_type ||
        alert.incident_type ||
        (alert.title ? alert.title.replace(/\s*Alert(\s*on.*)?$/i, "").trim() : "") ||
        "Hazard Alert",
    };
  });
}

/**
 * Helper to normalize a road ID (e.g. "NH-2", "nh-2", "NH 2") to internal corridor ID ("nh2")
 */
export function normalizeRoadToCorridorId(roadId: string | undefined | null): string {
  if (!roadId) return "";
  const cleaned = roadId.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cleaned === "nh29") return "nh2";
  return cleaned;
}

/**
 * Helper to format timestamp into human-readable IST string
 */
export function formatAlertTime(createdAtStr?: string): string {
  if (!createdAtStr) return "Just now";
  try {
    const d = new Date(createdAtStr);
    if (isNaN(d.getTime())) return createdAtStr;
    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
    if (diffMin <= 1) return `${timeStr} IST (Just now)`;
    if (diffMin < 60) return `${timeStr} IST (${diffMin} min ago)`;
    const diffHours = Math.round(diffMin / 60);
    return `${timeStr} IST (${diffHours}h ago)`;
  } catch {
    return createdAtStr;
  }
}
