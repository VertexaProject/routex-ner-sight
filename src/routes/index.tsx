import { createFileRoute, Link } from "@tanstack/react-router";

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
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-4xl">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/20 font-display text-lg font-bold text-primary">
            R
          </span>
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">RouteX</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered logistics & accessibility intelligence for India's North Eastern Region
            </p>
          </div>
        </div>

        <p className="mt-8 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Demo sign-in · select a role
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {roles.map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className="glass glass-hover flex flex-col rounded-2xl p-5"
            >
              <span className="text-[11px] uppercase tracking-[0.16em] text-primary">{r.who}</span>
              <span className="mt-2 font-display text-lg font-semibold">{r.name}</span>
              <span className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{r.desc}</span>
              <span className="mt-5 text-xs font-medium text-primary">Continue →</span>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Prototype interface with demo data. Roads, convoys and incidents shown are illustrative.
        </p>
      </div>
    </main>
  );
}
