import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppHeader } from "@/components/routex/AppHeader";
import { Panel } from "@/components/routex/Panel";
import { incidentTypes, incidents, severityLevels } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import { RoleGuard } from "@/components/routex/RoleGuard";
import { useAuth } from "@/lib/auth-store";
import { Camera, MapPin, CheckCircle2, AlertTriangle, Send, Navigation, Loader2 } from "lucide-react";

function getN8nWebhookUrl(): string {
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("routex_n8n_webhook_url");
    if (local) return local;
    if ((window as any).__N8N_WEBHOOK_URL) return (window as any).__N8N_WEBHOOK_URL;
  }
  return (import.meta.env.VITE_N8N_WEBHOOK_URL as string) || "YOUR_N8N_PRODUCTION_WEBHOOK_URL";
}

function parseCoordinates(coordStr: string): { latitude: number; longitude: number } {
  const parts = coordStr.split(",");
  if (parts.length >= 2) {
    const latMatch = parts[0].match(/([+-]?\d+(?:\.\d+)?)/);
    const lngMatch = parts[1].match(/([+-]?\d+(?:\.\d+)?)/);
    if (latMatch && lngMatch) {
      let lat = parseFloat(latMatch[1]);
      let lng = parseFloat(lngMatch[1]);
      if (/S/i.test(parts[0])) lat = -lat;
      if (/W/i.test(parts[1])) lng = -lng;
      return { latitude: lat, longitude: lng };
    }
  }
  return { latitude: 26.1445, longitude: 91.7362 };
}

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
  component: () => (
    <RoleGuard allowedRole="field_officer">
      <FieldOfficerScreen />
    </RoleGuard>
  ),
});

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm";

const labelClass = "mb-2 block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700";

const severityColors: Record<string, { active: string; border: string }> = {
  Low: { active: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/40 font-bold", border: "" },
  Moderate: { active: "bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-500/40 font-bold", border: "" },
  High: { active: "bg-orange-50 text-orange-800 border-orange-300 ring-2 ring-orange-500/40 font-bold", border: "" },
  Critical: { active: "bg-red-50 text-red-800 border-red-300 ring-2 ring-red-500/40 font-bold", border: "" },
};

const ROADS = ["NH-2", "NH-6", "NH-10", "NH-29", "NH-108"] as const;

function FieldOfficerScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [type, setType] = useState(incidentTypes[0]);
  const [roadId, setRoadId] = useState<string>(ROADS[0]);
  const [place, setPlace] = useState("");
  const [coords, setCoords] = useState("26.1445° N, 91.7362° E");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<(typeof severityLevels)[number]>("Moderate");
  const [photos, setPhotos] = useState<{ name: string; url: string }[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Send incident report to n8n production webhook via POST JSON
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const { latitude, longitude } = parseCoordinates(coords);

    const payload = {
      incident_type: type,
      latitude,
      longitude,
      severity,
      description,
      photo_url: photos[0]?.url || "",
      reported_by: user?.name || "Officer 12 · Kohima sector",
      road_id: roadId,
    };

    const webhookUrl = getN8nWebhookUrl();

    try {
      if (
        !webhookUrl ||
        webhookUrl === "YOUR_N8N_PRODUCTION_WEBHOOK_URL" ||
        !webhookUrl.startsWith("http")
      ) {
        throw new Error(
          "n8n production webhook URL is not configured. Please configure VITE_N8N_WEBHOOK_URL in your .env file or environment."
        );
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned status ${response.status} (${response.statusText || "Error"})`);
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to connect to n8n webhook. Please verify the URL and network connection.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function reset() {
    setType(incidentTypes[0]);
    setRoadId(ROADS[0]);
    setPlace("");
    setDescription("");
    setSeverity("Moderate");
    setPhotos([]);
    setSubmitted(false);
    setSubmitError(null);
    setIsSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader role="Field Officer" subtitle="Officer 12 · Kohima sector" />

      <main className="mx-auto grid max-w-6xl w-full gap-4 px-3.5 pb-12 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] flex-1">
        <Panel title={t("report_incident")}>
          {submitted ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-2xl text-emerald-600 border border-emerald-200 shadow-sm">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="font-display text-xl sm:text-2xl font-bold text-slate-900">{t("incident_submitted")}</p>
              <p className="mx-auto mt-2 max-w-md text-sm sm:text-base leading-relaxed text-slate-600">
                {type} on <span className="font-bold text-slate-900">{roadId}</span> at {place || "current location"} was queued for the control room with{" "}
                <span className="font-bold text-slate-900">{severity.toLowerCase()}</span> severity and {photos.length} photo
                {photos.length === 1 ? "" : "s"}.
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm sm:text-base font-bold text-white shadow-md transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                {t("report_another")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="type">
                    {t("incident_type")}
                  </label>
                  <select
                    id="type"
                    className={inputClass}
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {incidentTypes.map((item) => (
                      <option key={item} value={item} className="bg-white text-slate-900">
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="road_id">
                    Road / Corridor
                  </label>
                  <select
                    id="road_id"
                    className={inputClass}
                    value={roadId}
                    onChange={(e) => setRoadId(e.target.value)}
                  >
                    {ROADS.map((item) => (
                      <option key={item} value={item} className="bg-white text-slate-900">
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="place">
                  {t("place")}
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

              <div className="glass-soft flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 rounded-xl px-4 py-2.5 sm:py-3 bg-slate-50/80 border border-slate-200">
                <span className="text-xs sm:text-sm text-slate-600 font-medium flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span>{t("coordinates")}:</span>
                  <strong className="text-slate-900 font-bold">{coords}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setCoords("25.6751° N, 94.1086° E")}
                  className="text-xs sm:text-sm font-bold text-primary hover:underline self-start sm:self-auto flex items-center gap-1"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>{t("use_gps")}</span>
                </button>
              </div>

              <div>
                <span className={labelClass}>{t("severity")}</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {severityLevels.map((s) => {
                    const active = severity === s;
                    const style = severityColors[s];
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSeverity(s)}
                        className={`rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all border ${
                          active
                            ? style.active
                            : "glass-soft border-slate-200 text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-white"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className={labelClass}>{t("photo_upload")}</span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="glass-soft w-full rounded-xl border-dashed border-2 border-slate-300 px-4 py-5 sm:py-6 text-center text-sm sm:text-base text-slate-500 transition-colors hover:text-slate-900 hover:border-primary/50 flex flex-col items-center justify-center gap-1 bg-slate-50/60 hover:bg-white"
                >
                  <Camera className="h-7 w-7 text-slate-400" />
                  <span className="font-bold text-slate-800">Tap to add photos from camera or gallery</span>
                  <span className="text-xs text-slate-500">Attach images of road damage, blockages, or floods</span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    files.forEach((f) => {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const url = (event.target?.result as string) || URL.createObjectURL(f);
                        setPhotos((p) => [...p, { name: f.name, url }]);
                      };
                      reader.readAsDataURL(f);
                    });
                  }}
                />
                {photos.length ? (
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {photos.map((p, idx) => (
                      <div key={p.url} className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                        <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          aria-label={`Remove ${p.name}`}
                          onClick={() => setPhotos((ps) => ps.filter((_, i) => i !== idx))}
                          className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full text-xs font-bold bg-black/60 text-white hover:bg-red-600 transition-colors"
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
                  {t("description")}
                </label>
                <textarea
                  id="desc"
                  rows={3}
                  className={inputClass}
                  placeholder="What happened, how much of the road is affected, is traffic moving?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {submitError && (
                <div className="rounded-xl p-3 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <strong className="font-bold block">Submission Failed</strong>
                    <p className="mt-0.5 text-xs text-red-600 leading-relaxed">{submitError}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-white shadow-md transition-all hover:bg-primary/90 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting Incident...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>{t("submit_incident")}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </Panel>

        <Panel title={t("recent_reports")} bodyClassName="p-2 sm:p-3">
          <ul className="divide-y divide-border/60">
            {incidents.map((i) => (
              <li key={i.id} className="px-3 py-3 hover:bg-black/[0.02] transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm sm:text-base font-semibold text-foreground">{i.type}</p>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-md"
                    style={{
                      color:
                        i.severity === "Critical"
                          ? "#b91c1c"
                          : i.severity === "High"
                            ? "#c2410c"
                            : i.severity === "Moderate"
                              ? "#b45309"
                              : "#047857",
                      backgroundColor:
                        i.severity === "Critical"
                          ? "#fee2e2"
                          : i.severity === "High"
                            ? "#ffedd5"
                            : i.severity === "Moderate"
                              ? "#fef3c7"
                              : "#d1fae5",
                    }}
                  >
                    {i.severity}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
                  <span>{i.place}</span>
                  <span>{i.ago}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </main>
    </div>
  );
}
