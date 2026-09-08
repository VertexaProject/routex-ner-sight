import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppHeader } from "@/components/routex/AppHeader";
import { Panel } from "@/components/routex/Panel";
import { incidentTypes, incidents, severityLevels } from "@/lib/mock-data";

export const Route = createFileRoute("/field-officer")({
  head: () => ({
    meta: [
      { title: "Report an Incident — RouteX Field Officer" },
      {
        name: "description",
        content:
          "RouteX field reporting: log landslides, floods, bridge damage and blockages with location, photos, description and severity.",
      },
      { property: "og:title", content: "Report an Incident — RouteX Field Officer" },
      {
        property: "og:description",
        content:
          "Log road incidents from the field with location, photo evidence and severity for the NER control room.",
      },
    ],
  }),
  component: FieldOfficerScreen,
});

const inputClass =
  "w-full rounded-xl border border-input bg-white/5 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-ring";

const labelClass = "mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground";

function FieldOfficerScreen() {
  const [type, setType] = useState(incidentTypes[0]);
  const [place, setPlace] = useState("");
  const [coords, setCoords] = useState("26.1445° N, 91.7362° E");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<(typeof severityLevels)[number]>("Moderate");
  const [photos, setPhotos] = useState<{ name: string; url: string }[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Placeholder submit — a real API call will replace this later.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  function reset() {
    setType(incidentTypes[0]);
    setPlace("");
    setDescription("");
    setSeverity("Moderate");
    setPhotos([]);
    setSubmitted(false);
  }

  return (
    <div className="min-h-screen">
      <AppHeader role="Field Officer" subtitle="Officer 12 · Kohima sector" />

      <main className="mx-auto grid max-w-6xl gap-3 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel title="Report an incident">
          {submitted ? (
            <div className="py-8 text-center">
              <p className="font-display text-lg font-semibold">Incident submitted</p>
              <p className="mx-auto mt-2 max-w-sm text-[13px] text-muted-foreground">
                {type} at {place || "current location"} was queued for the control room with{" "}
                {severity.toLowerCase()} severity and {photos.length} photo
                {photos.length === 1 ? "" : "s"}.
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-6 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Report another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="type">
                    Incident type
                  </label>
                  <select
                    id="type"
                    className={inputClass}
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {incidentTypes.map((t) => (
                      <option key={t} value={t} className="bg-card">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="place">
                    Location
                  </label>
                  <input
                    id="place"
                    className={inputClass}
                    placeholder="e.g. NH-2 near Piphema, Nagaland"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="glass-soft flex flex-wrap items-center justify-between gap-2 rounded-xl px-3.5 py-2.5">
                <span className="text-[12px] text-muted-foreground">
                  Coordinates: <span className="text-foreground">{coords}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setCoords("25.6751° N, 94.1086° E")}
                  className="text-[11px] font-medium text-primary"
                >
                  Use current GPS
                </button>
              </div>

              <div>
                <span className={labelClass}>Severity</span>
                <div className="flex flex-wrap gap-2">
                  {severityLevels.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverity(s)}
                      className={`rounded-xl px-3.5 py-2 text-[13px] transition-colors ${
                        severity === s
                          ? "bg-primary/20 text-primary"
                          : "glass-soft text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className={labelClass}>Photo upload</span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="glass-soft w-full rounded-xl border-dashed px-4 py-7 text-center text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Tap to add photos from camera or gallery
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setPhotos((p) => [
                      ...p,
                      ...files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
                    ]);
                  }}
                />
                {photos.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {photos.map((p, idx) => (
                      <div key={p.url} className="relative h-20 w-20 overflow-hidden rounded-xl">
                        <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          aria-label={`Remove ${p.name}`}
                          onClick={() => setPhotos((ps) => ps.filter((_, i) => i !== idx))}
                          className="glass absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full text-[11px]"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="desc">
                  Description
                </label>
                <textarea
                  id="desc"
                  rows={4}
                  className={inputClass}
                  placeholder="What happened, how much of the road is affected, is traffic moving?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Submit incident
              </button>
            </form>
          )}
        </Panel>

        <Panel title="My recent reports" bodyClassName="p-2">
          <ul className="divide-y divide-border/60">
            {incidents.map((i) => (
              <li key={i.id} className="px-2 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium">{i.type}</p>
                  <span className="text-[11px] text-muted-foreground">{i.severity}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {i.place} · {i.ago}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </main>
    </div>
  );
}
