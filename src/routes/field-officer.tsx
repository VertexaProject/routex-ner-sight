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
  component: FieldOfficerScreen;
});

function FieldOfficerScreen() {
  return null;
}
