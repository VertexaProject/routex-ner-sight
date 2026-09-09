import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Globe, Bell, ChevronDown, Check, LogOut } from "lucide-react";
import { useI18n, SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { useRerouteWorkflow } from "@/lib/route-store";
import { RouteXIcon } from "@/components/routex/RouteXLogo";
import { useAuth } from "@/lib/auth-store";

interface AppHeaderProps {
  role: string;
  subtitle: string;
  onOpenNotifications?: () => void;
  unreadCount?: number;
}

export function AppHeader({ role, subtitle, onOpenNotifications, unreadCount }: AppHeaderProps) {
  const { language, setLanguage, t } = useI18n();
  const { unreadCount: storeUnreadCount } = useRerouteWorkflow();
  const effectiveUnreadCount = unreadCount !== undefined ? unreadCount : storeUnreadCount;
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  // Close language dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: Event) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    }
    if (langMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [langMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  const currentRoleName = user?.roleLabel || role;
  const currentUserName = user?.name || subtitle;

  return (
    <header className="glass sticky top-0 z-40 flex flex-row items-center justify-between gap-2 border-x-0 border-t-0 px-3 py-2 sm:px-6">
      {/* Brand Logo & App Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group min-w-0">
          <RouteXIcon size="sm" className="sm:h-9 sm:w-9" />
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-0.5 font-display text-sm sm:text-base font-black tracking-tight text-foreground">
              <span>Route</span>
              <span className="text-primary font-black">X</span>
            </div>
            <span className="block text-[10px] sm:text-xs text-muted-foreground font-medium truncate">
              <span className="inline sm:hidden">NER Logistics</span>
              <span className="hidden sm:inline">{t("app_subtitle")}</span>
            </span>
          </div>
        </Link>
      </div>

      {/* Right Actions: Role Display | User Name | Language | Notifications | Logout */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Current Role Badge (High Visibility) */}
        <div className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 bg-primary/10 border border-primary/25 text-primary shadow-xs shrink-0">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider">
            {currentRoleName}
          </span>
        </div>

        {/* User Name & Assignment (Desktop) */}
        <div className="hidden lg:flex flex-col text-right min-w-0 max-w-[190px]">
          <span className="text-xs font-bold text-foreground truncate">
            {currentUserName}
          </span>
          <span className="text-[10px] text-muted-foreground truncate">
            {user?.subtitle || subtitle}
          </span>
        </div>

        <div className="h-4 w-px bg-border/80 hidden sm:block" />

        {/* Authority Notification Bell */}
        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl glass-soft text-foreground hover:bg-black/5 transition-colors flex items-center justify-center shrink-0 shadow-xs"
            title="Hazard Notifications"
          >
            <Bell className="h-4 w-4" />
            {effectiveUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[var(--status-blocked)] text-[10px] font-bold text-white shadow-md animate-pulse">
                {effectiveUnreadCount}
              </span>
            )}
          </button>
        )}

        {/* Solid Opaque Language Dropdown Selector */}
        <div className="relative shrink-0" ref={langMenuRef}>
          <button
            type="button"
            onClick={() => setLangMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:px-3 text-xs font-bold text-slate-800 bg-white border border-slate-200/90 hover:bg-slate-50 transition-all shadow-xs"
            title="Switch Language"
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span className="font-bold hidden md:inline">{currentLang.nativeLabel}</span>
            <span className="font-bold md:hidden">{currentLang.code.toUpperCase()}</span>
            <ChevronDown className="h-3 w-3 text-slate-500" />
          </button>

          {/* Solid White Floating Dropdown (z-[9999], opaque, shadow-2xl, responsive) */}
          {langMenuOpen && (
            <div className="bg-white fixed inset-x-3 top-14 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-60 rounded-2xl p-2 shadow-2xl z-[9999] border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-150 max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                <span>Select Language</span>
                <span className="text-[10px] text-muted-foreground font-normal">({SUPPORTED_LANGUAGES.length})</span>
              </div>
              <div className="py-1 space-y-0.5">
                {SUPPORTED_LANGUAGES.map((l) => {
                  const isActive = l.code === language;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLanguage(l.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                        isActive
                          ? "bg-primary text-white font-bold shadow-sm"
                          : "text-slate-800 hover:bg-slate-100 font-semibold"
                      }`}
                    >
                      <div>
                        <span className="font-bold">{l.nativeLabel}</span>
                        <span
                          className={`ml-1.5 text-[11px] font-medium ${
                            isActive ? "text-white/80" : "text-slate-500"
                          }`}
                        >
                          ({l.label})
                        </span>
                      </div>
                      {isActive && <Check className="h-4 w-4 text-white shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Visible Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:px-3 text-xs font-bold text-rose-600 hover:text-white border border-rose-200 bg-rose-50/80 hover:bg-rose-600 transition-all shadow-xs active:scale-[0.98] shrink-0"
          title="Sign out of current RouteX session"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
