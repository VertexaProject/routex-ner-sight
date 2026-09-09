import { useState, useEffect, createContext, useContext, type ReactNode } from "react";

export type UserRole = "authority" | "field_officer" | "driver";

export interface AuthUser {
  role: UserRole;
  username: string;
  name: string;
  subtitle: string;
  roleLabel: string;
  dashboardPath: string;
}

export const DEMO_CREDENTIALS: Record<
  UserRole,
  {
    username: string;
    password: string;
    name: string;
    subtitle: string;
    roleLabel: string;
    dashboardPath: string;
    description: string;
  }
> = {
  authority: {
    username: "authority",
    password: "pass",
    name: "Dr. P. Roy (HQ Director)",
    subtitle: "NER Control Room · Guwahati",
    roleLabel: "Authority",
    dashboardPath: "/authority",
    description: "Region-wide command: monitor corridors, track convoys, and authorize emergency reroutes.",
  },
  field_officer: {
    username: "field",
    password: "pass",
    name: "Officer 12 (Field Ops)",
    subtitle: "Kohima Sector · On-Ground",
    roleLabel: "Field Officer",
    dashboardPath: "/field-officer",
    description: "On-ground reporting: submit real-time landslides, road washouts, and field hazards.",
  },
  driver: {
    username: "driver",
    password: "pass",
    name: "K. Longkumer (Driver)",
    subtitle: "Convoy RX-217 · Medical Cargo",
    roleLabel: "Convoy Driver",
    dashboardPath: "/driver",
    description: "In-cab navigation: follow live GPS driving route, receive hazard alerts, and execute safe reroutes.",
  },
};

const STORAGE_KEY = "routex_auth_session";

export function getAuthSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveAuthSession(user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    // Dispatch custom event for cross-component reactivity
    window.dispatchEvent(new Event("routex_auth_changed"));
  } catch (err) {
    console.error("Failed to save auth session:", err);
  }
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (role: UserRole, username?: string, password?: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getAuthSession);

  useEffect(() => {
    function handleAuthChange() {
      setUser(getAuthSession());
    }
    window.addEventListener("routex_auth_changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("routex_auth_changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const login = (role: UserRole, username?: string, password?: string): boolean => {
    const cred = DEMO_CREDENTIALS[role];
    if (!cred) return false;

    // In this prototype, if credentials are provided, match them (or accept demo default)
    if (username && password) {
      if (
        (username.toLowerCase() !== cred.username.toLowerCase() && username.toLowerCase() !== role) ||
        (password !== cred.password && password !== "pass" && password !== "admin2026")
      ) {
        return false;
      }
    }

    const authUser: AuthUser = {
      role,
      username: cred.username,
      name: cred.name,
      subtitle: cred.subtitle,
      roleLabel: cred.roleLabel,
      dashboardPath: cred.dashboardPath,
    };

    saveAuthSession(authUser);
    setUser(authUser);
    return true;
  };

  const logout = () => {
    saveAuthSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
