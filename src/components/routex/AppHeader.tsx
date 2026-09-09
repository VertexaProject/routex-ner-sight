import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Globe, Bell, ChevronDown, Check } from "lucide-react";
import { useI18n, SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/i18n";
import { useRerouteWorkflow } from "@/lib/route-store";
import { RouteXIcon } from "@/components/routex/RouteXLogo";

interface AppHeaderProps {
  role: string;
  subtitle: string;
  onOpenNotifications?: () => void;
}

export function AppHeader({ role, subtitle, onOpenNotifications }: AppHeaderProps) {
  const { language, setLanguage, t } = useI18n();
  const { unreadCount } = useRerouteWorkflow();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const roleLinks = [
    { to: "/authority", label: t("role_authority"), shortLabel: t("role_authority") },
    { to: "/field-officer", label: t("role_field"), shortLabel: "Field" },
    { to: "/driver", label: t("role_driver"), shortLabel: "Driver" },
  ] as const;

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    }
    if (langMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [langMenuOpen]);

  return (
    <header className="glass sticky top-0 z-30 flex flex-col gap-1.5 rounded-none border-x-0 border-t-0 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group min-w-0">
          <RouteXIcon size="sm" className="sm:h-9 sm:w-9" />
          <span className="leading-tight min-w-0">
            <span className="block font-display text-sm sm:text-base font-black tracking-tight text-foreground">
              Route<span className="text-primary font-black">X</span>
            </span>
            <span className="block text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
              <span className="inline sm:hidden">NER Logistics</span>
              <span className="hidden sm:inline">{t("app_subtitle")}</span>
            </span>
          </span>
        </Link>

        {/* Mobile quick actions: Language + Bell + Role */}
        <div className="flex items-center gap-1.5 sm:hidden shrink-0">
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative p-1.5 rounded-full glass-soft text-foreground hover:bg-black/5 transition-colors"
              title="Hazard Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--status-blocked)] text-[10px] font-bold text-white shadow">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          <div className="glass-soft rounded-full px-2.5 py-0.5 text-right">
            <span className="block text-[11px] font-semibold text-primary">{role}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto min-w-0">
        {/* Navigation Tabs */}
        <nav className="glass-soft grid grid-cols-3 sm:flex sm:items-center gap-1 rounded-full p-1 w-full sm:w-auto min-w-0">
          {roleLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-2 py-1 sm:px-3.5 sm:py-1.5 text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:text-foreground text-center truncate min-w-0"
              activeProps={{ className: "bg-primary text-primary-foreground font-semibold shadow-sm" }}
            >
              <span className="hidden sm:inline">{l.label}</span>
              <span className="sm:hidden">{l.shortLabel}</span>
            </Link>
          ))}
        </nav>

        {/* Multilingual Selector Dropdown */}
        <div className="relative shrink-0" ref={langMenuRef}>
          <button
            type="button"
            onClick={() => setLangMenuOpen((prev) => !prev)}
            className="glass-soft flex items-center gap-1.5 rounded-full px-2.5 py-1.5 sm:px-3 text-xs font-semibold text-foreground hover:bg-black/5 transition-all shadow-sm"
            title="Switch Language"
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium hidden md:inline">{currentLang.nativeLabel}</span>
            <span className="font-medium md:hidden">{currentLang.code.toUpperCase()}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>

          {langMenuOpen && (
            <div className="glass absolute right-0 mt-2 w-52 rounded-2xl p-1.5 shadow-2xl z-50 border border-border/80 animate-in fade-in slide-in-from-top-2 duration-150 max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40">
                Select Language ({SUPPORTED_LANGUAGES.length})
              </div>
              <div className="py-1">
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
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-left transition-colors ${
                        isActive
                          ? "bg-primary/15 text-primary font-bold"
                          : "text-foreground hover:bg-black/5"
                      }`}
                    >
                      <div>
                        <span className="font-semibold">{l.nativeLabel}</span>
                        <span className="ml-1.5 text-[11px] text-muted-foreground font-normal">
                          ({l.label})
                        </span>
                      </div>
                      {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Authority Notification Bell */}
        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-2 rounded-full glass-soft text-foreground hover:bg-black/5 transition-colors hidden sm:flex items-center justify-center shrink-0 shadow-sm"
            title="Hazard Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[var(--status-blocked)] text-[10px] font-bold text-white shadow-md animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
        )}

        {/* Desktop current role badge */}
        <div className="glass-soft rounded-full px-3.5 py-1.5 text-right hidden sm:block shrink-0 shadow-sm">
          <span className="block text-xs sm:text-sm font-semibold text-foreground">{role}</span>
          <span className="block text-[11px] text-muted-foreground">{subtitle}</span>
        </div>
      </div>
    </header>
  );
}
