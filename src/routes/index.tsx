import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { RouteXIcon } from "@/components/routex/RouteXLogo";
import { useAuth, DEMO_CREDENTIALS, type UserRole } from "@/lib/auth-store";
import { ShieldCheck, Truck, Radio, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign In — RouteX NER Logistics & Accessibility Intelligence" },
      {
        name: "description",
        content:
          "RouteX prototype login: access the Authority Control Room, Field Officer Reporting, or Convoy Driver in-cab navigation.",
      },
      { property: "og:title", content: "Sign In — RouteX NER Logistics & Accessibility Intelligence" },
    ],
  }),
  component: LoginScreen,
});

const ROLE_CONFIGS: Record<
  UserRole,
  {
    icon: typeof ShieldCheck;
    color: string;
    bgColor: string;
    borderColor: string;
    title: string;
    subtitle: string;
    who: string;
  }
> = {
  authority: {
    icon: ShieldCheck,
    color: "text-blue-600",
    bgColor: "bg-blue-50/80",
    borderColor: "border-blue-300",
    title: "Authority",
    subtitle: "State Control Room · Guwahati",
    who: "Regional Command & Reroute Authorization",
  },
  field_officer: {
    icon: Radio,
    color: "text-amber-600",
    bgColor: "bg-amber-50/80",
    borderColor: "border-amber-300",
    title: "Field Officer",
    subtitle: "On-Ground Reporting · Kohima Sector",
    who: "Incident Logging & Road Hazard Verification",
  },
  driver: {
    icon: Truck,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50/80",
    borderColor: "border-emerald-300",
    title: "Convoy Driver",
    subtitle: "In-Cab Guidance · Convoy RX-217",
    who: "Live GPS Navigation & Safe Corridor Routing",
  },
};

function LoginScreen() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<UserRole>("authority");
  const [username, setUsername] = useState(DEMO_CREDENTIALS.authority.username);
  const [password, setPassword] = useState("pass");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already logged in, redirect directly to user's assigned dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate({ to: user.dashboardPath });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setUsername(DEMO_CREDENTIALS[role].username);
    setPassword("pass");
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const success = login(selectedRole, username, password);
    if (success) {
      navigate({ to: DEMO_CREDENTIALS[selectedRole].dashboardPath });
    } else {
      setErrorMsg(`Invalid credentials for ${DEMO_CREDENTIALS[selectedRole].roleLabel}. Use username "${DEMO_CREDENTIALS[selectedRole].username}" and password "pass".`);
    }
  };

  const handleOneClickLogin = (role: UserRole) => {
    setSelectedRole(role);
    const success = login(role);
    if (success) {
      navigate({ to: DEMO_CREDENTIALS[role].dashboardPath });
    }
  };

  const activeConfig = ROLE_CONFIGS[selectedRole];
  const ActiveIcon = activeConfig.icon;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:px-6 bg-slate-50/70">
      <div className="w-full max-w-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <RouteXIcon size="xl" className="mb-3.5 shadow-xl" />
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Route<span className="text-primary font-black">X</span>
          </h1>
          <p className="mt-1 text-sm sm:text-base font-semibold text-slate-600">
            NER Logistics & Accessibility Intelligence
          </p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
            SIH26002 · Smart India Hackathon Prototype Portal
          </span>
        </div>

        {/* Login Card */}
        <div className="glass rounded-3xl p-6 sm:p-8 shadow-xl border border-border/80 bg-white/95">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">Role-Based Access Portal</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select your clearance level to access your designated command view.
            </p>
          </div>

          {/* Role Option Selector */}
          <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200 mb-6">
            {(["authority", "field_officer", "driver"] as const).map((r) => {
              const cfg = ROLE_CONFIGS[r];
              const Icon = cfg.icon;
              const isActive = selectedRole === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSelectRole(r)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-white text-slate-900 shadow-md ring-1 ring-black/5"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? cfg.color : "text-slate-500"}`} />
                  <span className="truncate w-full text-center">{cfg.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active Role Description Banner */}
          <div className={`rounded-2xl p-3.5 mb-6 border flex items-start gap-3 ${activeConfig.bgColor} ${activeConfig.borderColor}`}>
            <ActiveIcon className={`h-5 w-5 shrink-0 mt-0.5 ${activeConfig.color}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {activeConfig.title} Login
                </p>
                <span className="text-[11px] font-medium text-slate-600 truncate">
                  {DEMO_CREDENTIALS[selectedRole].name}
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                {DEMO_CREDENTIALS[selectedRole].description}
              </p>
            </div>
          </div>

          {/* Error Message Display */}
          {errorMsg && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
                  placeholder="Enter password"
                  required
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 font-medium">
                Demo clearance password: <code className="font-bold text-slate-800">pass</code>
              </p>
            </div>

            {/* Login Action Button */}
            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-3 px-4 text-sm font-bold text-white shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>Sign In as {activeConfig.title}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Fast 1-Click Evaluation Login */}
          <div className="mt-6 pt-4 border-t border-slate-200/80">
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 text-center">
              Quick 1-Click Demo Evaluation
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(["authority", "field_officer", "driver"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleOneClickLogin(r)}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary transition-all shadow-xs text-center"
                >
                  ⚡ {ROLE_CONFIGS[r].title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-slate-500 font-medium">
          RouteX prototype environment. Role authorization enforces strict single-role dashboard access.
        </p>
      </div>
    </main>
  );
}
