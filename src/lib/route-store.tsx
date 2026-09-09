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

const INITIAL_NOTIFICATIONS: HazardNotification[] = [
  {
    id: "HAZ-PIPHEMA-01",
    incidentType: "Active Landslide",
    location: "Piphema, Nagaland",
    road: "NH-2 (km 38)",
    severity: "Critical",
    affectedVehicles: ["Convoy RX-217 · K. Longkumer (Medical supplies)"],
    affectedDeliveries: ["DL-3391 · Kohima Community Health Centre (+4h 20m)"],
    recommendedAction: "Authorize reroute via NH-29 Medziphema Safe Bypass",
    isRead: false,
    timestamp: "15:02 IST (12 min ago)",
    status: "pending_review",
    details: "Slope instability sensors detected major debris runoff across both lanes at Piphema ridge.",
    delayEstimate: "20–30 min holding time",
  },
  {
    id: "HAZ-PASIGHAT-02",
    incidentType: "Bridge Structural Damage",
    location: "Pasighat, Arunachal Pradesh",
    road: "NH-108 (km 14)",
    severity: "Critical",
    affectedVehicles: ["Convoy RX-104 (Relief rations)"],
    affectedDeliveries: ["DL-3387 · Pasighat Depot (Halted)"],
    recommendedAction: "Traffic diverted through NH-515 feeder road",
    isRead: false,
    timestamp: "14:15 IST (1 hr ago)",
    status: "acknowledged",
    details: "Abutment scouring reported by PWD engineers following flash rain.",
    delayEstimate: "Indefinite closure",
  },
];

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
  notifications: INITIAL_NOTIFICATIONS,
  unreadCount: 2,
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
  const [notifications, setNotifications] = useState<HazardNotification[]>(INITIAL_NOTIFICATIONS);
  const [isRerouteAuthorized, setIsRerouteAuthorized] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>("HAZ-PIPHEMA-01");
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
          setNotifications(JSON.parse(savedNotifs));
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
