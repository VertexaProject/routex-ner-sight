import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteXIcon } from "@/components/routex/RouteXLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RouteX — NER Logistics & Accessibility Intelligence" },
      {
        name: "description",
        content:
          "RouteX demo sign-in: choose an Authority, Field Officer or Convoy Driver view to explore road status across India's North Eastern Region.",
      },
      { property: "og:title", content: "RouteX — NER Logistics & Accessibility Intelligence" },
      {
        property: "og:description",
        content:
          "Choose a demo role to explore live road status, incidents and convoy routing across the North Eastern Region.",
      },
    ],
  }),
  component: RoleSelection,
});

const roles = [
  {
    to: "/authority" as const,
    name: "Authority",
    who: "State control room",
    desc: "Region-wide map, road status, incidents, weather risk and affected deliveries.",
  },
  {
    to: "/field-officer" as const,
    name: "Field Officer",
    who: "On-ground reporting",
    desc: "Report landslides, floods and blockages with photos, location and severity.",
  },
  {
    to: "/driver" as const,
    name: "Convoy Driver",
    who: "In-cab guidance",
    desc: "Current route, ETA, live road status, hazard warnings and alternate routes.",
  },
];

function RoleSelection() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-4xl">
        <div className="flex items-center gap-3.5">
          <RouteXIcon size="lg" className="sm:h-12 sm:w-12" />
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-foreground">
              Route<span className="text-primary font-black">X</span>
            </h1>
            <p className="mt-0.5 text-sm sm:text-base font-medium text-muted-foreground">
              AI-powered logistics & accessibility intelligence for India's North Eastern Region
            </p>
          </div>
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Demo sign-in · select a role
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {roles.map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className="glass glass-hover group flex flex-col justify-between rounded-2xl p-6 transition-all"
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">{r.who}</span>
                <span className="mt-2 block font-display text-xl font-bold text-foreground">{r.name}</span>
                <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">{r.desc}</span>
              </div>
              <span className="mt-6 text-sm font-bold text-primary flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                Continue <span>→</span>
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-xs sm:text-sm text-muted-foreground">
          Prototype interface with demo data. Roads, convoys and incidents shown are illustrative.
        </p>
      </div>
    </main>
  );
}
