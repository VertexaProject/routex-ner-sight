import { Link } from "@tanstack/react-router";

const roleLinks = [
  { to: "/authority", label: "Authority" },
  { to: "/field-officer", label: "Field Officer" },
  { to: "/driver", label: "Convoy Driver" },
] as const;

export function AppHeader({ role, subtitle }: { role: string; subtitle: string }) {
  return (
    <header className="glass sticky top-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-none border-x-0 border-t-0 px-4 py-3 sm:px-6">
      <Link to="/" className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/20 text-sm font-bold text-primary">
          R
        </span>
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-semibold">RouteX</span>
          <span className="block text-[11px] text-muted-foreground">NER Logistics Intelligence</span>
        </span>
      </Link>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <nav className="glass-soft hidden items-center gap-1 rounded-full p-1 md:flex">
          {roleLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "bg-primary/20 text-primary" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="glass-soft rounded-full px-3 py-1.5 text-right">
          <span className="block text-[11px] font-medium">{role}</span>
          <span className="block text-[10px] text-muted-foreground">{subtitle}</span>
        </div>
      </div>
    </header>
  );
}
