import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface HazardNotification {
  id: string;
  incidentType: string;
  location: string;
  road: string;
  severity: "Critical" | "High" | "Moderate" | "Low";
  affectedVehicles: string[];
  affectedDeliveries: string[];
  recommendedAction: string;
  isRead: boolean;
  timestamp: string;
  status: "pending_review" | "rerouted" | "acknowledged";
  details: string;
  delayEstimate: string;
}

export interface RouteComparisonData {
  currentRoute: {
    name: string;
    distance: string;
    eta: string;
    riskLevel: string;
    riskScore: number;
    delay: string;
    condition: string;
  };
  saferAlternate: {
    name: string;
    distance: string;
    eta: string;
    riskLevel: string;
    riskScore: number;
    delay: string;
    condition: string;
    deltaDistance: string;
    deltaEta: string;
  };
}

export const DEMO_ROUTE_COMPARISON: RouteComparisonData = {
  currentRoute: {
    name: "NH-2 via Chumoukedima",
    distance: "49.7 km",
    eta: "1 h 25 m",
    riskLevel: "High Risk (Critical)",
    riskScore: 88,
    delay: "+30 min holding delay",
    condition: "Active landslide debris at km 38 near Piphema. Single lane escorted traffic only.",
  },
  saferAlternate: {
    name: "NH-29 via Medziphema Safe Bypass",
    distance: "63.7 km",
    eta: "1 h 50 m",
    riskLevel: "Open / Safe",
    riskScore: 12,
    delay: "+25 min transit delay",
    condition: "Clear northern ridge corridor. Double lane fully open. Recommended for convoys.",
    deltaDistance: "+14.0 km",
    deltaEta: "+25 min",
  },
};

const INITIAL_NOTIFICATIONS: HazardNotification[] = [];

interface RerouteWorkflowContextType {
  notifications: HazardNotification[];
  unreadCount: number;
  isRerouteAuthorized: boolean;
  selectedNotificationId: string | null;
  comparison: RouteComparisonData;
  authorizeReroute: (notificationId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  resetWorkflow: () => void;
  setSelectedNotificationId: (id: string | null) => void;
  highlightedRoad: string | null;
  setHighlightedRoad: (road: string | null) => void;
}

const RerouteWorkflowContext = createContext<RerouteWorkflowContextType>({
  notifications: [],
  unreadCount: 0,
  isRerouteAuthorized: false,
  selectedNotificationId: null,
  comparison: DEMO_ROUTE_COMPARISON,
  authorizeReroute: () => {},
  markNotificationRead: () => {},
  markAllRead: () => {},
  resetWorkflow: () => {},
  setSelectedNotificationId: () => {},
  highlightedRoad: null,
  setHighlightedRoad: () => {},
});

const STORAGE_KEY_REROUTE = "routex_reroute_authorized";
const STORAGE_KEY_NOTIFS = "routex_hazard_notifications";

export function RerouteWorkflowProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<HazardNotification[]>([]);
  const [isRerouteAuthorized, setIsRerouteAuthorized] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [highlightedRoad, setHighlightedRoad] = useState<string | null>("nh2");

  // Load state from localStorage on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAuth = localStorage.getItem(STORAGE_KEY_REROUTE);
      if (savedAuth === "true") {
        setIsRerouteAuthorized(true);
      }
      const savedNotifs = localStorage.getItem(STORAGE_KEY_NOTIFS);
      if (savedNotifs) {
        try {
          const parsed = JSON.parse(savedNotifs);
          // Filter out any legacy hardcoded demo IDs
          const cleaned = Array.isArray(parsed)
            ? parsed.filter((n: any) => n.id !== "HAZ-PIPHEMA-01" && n.id !== "HAZ-PASIGHAT-02")
            : [];
          setNotifications(cleaned);
        } catch {
          // ignore parsing error
        }
      }
    }
  }, []);

  const saveNotifications = (newNotifs: HazardNotification[]) => {
    setNotifications(newNotifs);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(newNotifs));
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markNotificationRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    saveNotifications(updated);
  };

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    saveNotifications(updated);
  };

  const authorizeReroute = (notificationId: string) => {
    const updated = notifications.map((n) =>
      n.id === notificationId ? { ...n, status: "rerouted" as const, isRead: true } : n
    );
    saveNotifications(updated);
    setIsRerouteAuthorized(true);
    setHighlightedRoad("nh2");
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_REROUTE, "true");
    }
  };

  const resetWorkflow = () => {
    setIsRerouteAuthorized(false);
    saveNotifications(INITIAL_NOTIFICATIONS);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_REROUTE);
      localStorage.removeItem(STORAGE_KEY_NOTIFS);
    }
  };

  return (
    <RerouteWorkflowContext.Provider
      value={{
        notifications,
        unreadCount,
        isRerouteAuthorized,
        selectedNotificationId,
        comparison: DEMO_ROUTE_COMPARISON,
        authorizeReroute,
        markNotificationRead,
        markAllRead,
        resetWorkflow,
        setSelectedNotificationId,
        highlightedRoad,
        setHighlightedRoad,
      }}
    >
      {children}
    </RerouteWorkflowContext.Provider>
  );
}

export function useRerouteWorkflow() {
  return useContext(RerouteWorkflowContext);
}
