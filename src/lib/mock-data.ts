/**
 * Mock/demo data for RouteX. Every export here is a stand-in for a future API
 * call, so screens read from one place and can later swap to real services.
 */

export type RoadStatus = "open" | "caution" | "high-risk" | "blocked";

export const roadStatusMeta: Record<
  RoadStatus,
  { label: string; colorVar: string; className: string }
> = {
  open: { label: "Open", colorVar: "var(--status-open)", className: "text-status-open" },
  caution: { label: "Caution", colorVar: "var(--status-caution)", className: "text-status-caution" },
  "high-risk": { label: "High Risk", colorVar: "var(--status-risk)", className: "text-status-risk" },
  blocked: { label: "Blocked", colorVar: "var(--status-blocked)", className: "text-status-blocked" },
};

export type Role = "authority" | "field-officer" | "driver";

/** Simplified NER state outlines in a 0-1000 x 0-620 viewBox. */
export const nerStates: { id: string; name: string; short: string; points: string; labelAt: [number, number] }[] = [
  {
    id: "arunachal",
    name: "Arunachal Pradesh",
    short: "AR",
    points: "402,58 520,26 640,40 742,86 830,74 906,112 884,166 806,158 720,182 636,164 540,178 452,150 396,110",
    labelAt: [650, 110],
  },
  {
    id: "assam",
    name: "Assam",
    short: "AS",
    points: "300,196 400,158 470,164 556,190 652,176 760,192 848,178 872,214 780,246 690,232 604,258 520,254 452,238 372,252 300,236",
    labelAt: [560, 218],
  },
  {
    id: "sikkim",
    name: "Sikkim",
    short: "SK",
    points: "150,120 214,104 246,144 208,180 156,166",
    labelAt: [198, 144],
  },
  {
    id: "meghalaya",
    name: "Meghalaya",
    short: "ML",
    points: "306,258 420,250 520,268 546,306 448,326 350,314 300,292",
    labelAt: [418, 290],
  },
  {
    id: "nagaland",
    name: "Nagaland",
    short: "NL",
    points: "770,252 852,224 884,268 866,336 812,356 758,322",
    labelAt: [818, 292],
  },
  {
    id: "manipur",
    name: "Manipur",
    short: "MN",
    points: "716,340 812,358 850,404 828,470 744,486 690,432 692,378",
    labelAt: [770, 418],
  },
  {
    id: "mizoram",
    name: "Mizoram",
    short: "MZ",
    points: "630,432 706,438 730,494 712,576 656,596 616,538 612,478",
    labelAt: [668, 512],
  },
  {
    id: "tripura",
    name: "Tripura",
    short: "TR",
    points: "504,392 594,384 610,438 588,494 520,500 486,446",
    labelAt: [548, 440],
  },
];

/** Highway corridors drawn over the map, each with a live status. */
export const corridors: {
  id: string;
  name: string;
  path: string;
  status: RoadStatus;
  note: string;
}[] = [
  {
    id: "nh27",
    name: "NH-27 Guwahati – Jorhat",
    path: "M 330 240 C 440 216, 560 214, 700 226",
    status: "open",
    note: "Clear, average speed 52 km/h",
  },
  {
    id: "nh715",
    name: "NH-715 Tezpur – Itanagar",
    path: "M 520 246 C 540 200, 580 168, 636 132",
    status: "caution",
    note: "Light rain, reduced visibility",
  },
  {
    id: "nh2",
    name: "NH-2 Dimapur – Kohima – Imphal",
    path: "M 800 240 C 820 300, 790 352, 764 424",
    status: "high-risk",
    note: "Active landslide zone near Kohima",
  },
  {
    id: "nh6",
    name: "NH-6 Shillong – Aizawl",
    path: "M 424 296 C 520 340, 590 400, 664 496",
    status: "caution",
    note: "Fog patches after 18:00",
  },
  {
    id: "nh108",
    name: "NH-108 Along – Pasighat",
    path: "M 700 130 C 744 148, 792 156, 848 168",
    status: "blocked",
    note: "Bridge washed out, closed to all traffic",
  },
  {
    id: "nh10",
    name: "NH-10 Siliguri – Gangtok",
    path: "M 168 190 C 186 166, 196 148, 212 128",
    status: "high-risk",
    note: "Slope instability at 10th Mile",
  },
];

export type Vehicle = {
  id: string;
  label: string;
  at: [number, number];
  status: RoadStatus;
  cargo: string;
  driver: string;
};

export const vehicles: Vehicle[] = [
  { id: "RX-104", label: "Convoy 104", at: [470, 232], status: "open", cargo: "Relief rations", driver: "S. Baruah" },
  { id: "RX-217", label: "Convoy 217", at: [786, 300], status: "high-risk", cargo: "Medical supplies", driver: "K. Longkumer" },
  { id: "RX-330", label: "Convoy 330", at: [560, 372], status: "caution", cargo: "Fuel", driver: "R. Debbarma" },
  { id: "RX-408", label: "Convoy 408", at: [660, 500], status: "open", cargo: "Water tankers", driver: "L. Hmar" },
  { id: "RX-512", label: "Convoy 512", at: [196, 148], status: "caution", cargo: "Tents", driver: "P. Lepcha" },
];

export type Incident = {
  id: string;
  type: string;
  place: string;
  at: [number, number];
  severity: "Low" | "Moderate" | "High" | "Critical";
  reportedBy: string;
  ago: string;
};

export const incidents: Incident[] = [
  { id: "INC-9021", type: "Landslide", place: "Kohima, NL", at: [812, 300], severity: "Critical", reportedBy: "Field Officer 12", ago: "18 min ago" },
  { id: "INC-9018", type: "Bridge damage", place: "Pasighat, AR", at: [842, 166], severity: "Critical", reportedBy: "Field Officer 04", ago: "1 hr ago" },
  { id: "INC-9014", type: "Flooding", place: "Dhemaji, AS", at: [700, 214], severity: "High", reportedBy: "Field Officer 21", ago: "2 hr ago" },
  { id: "INC-9009", type: "Road subsidence", place: "Aizawl bypass, MZ", at: [668, 506], severity: "Moderate", reportedBy: "Field Officer 08", ago: "4 hr ago" },
  { id: "INC-9003", type: "Fallen trees", place: "Shillong, ML", at: [420, 292], severity: "Low", reportedBy: "Field Officer 15", ago: "6 hr ago" },
];

export const weatherSummary = [
  { region: "Arunachal Pradesh", condition: "Heavy rain", rainfall: "82 mm/24h", risk: "High" },
  { region: "Assam", condition: "Cloudy", rainfall: "18 mm/24h", risk: "Low" },
  { region: "Nagaland", condition: "Thunderstorm", rainfall: "64 mm/24h", risk: "High" },
  { region: "Meghalaya", condition: "Fog", rainfall: "31 mm/24h", risk: "Moderate" },
  { region: "Mizoram", condition: "Light rain", rainfall: "12 mm/24h", risk: "Moderate" },
  { region: "Sikkim", condition: "Snow above 3000 m", rainfall: "9 mm/24h", risk: "High" },
];

export const alerts = [
  { id: "AL-77", title: "NH-108 closed at Pasighat", detail: "Bridge washout confirmed. Reroute via NH-515.", level: "critical", ago: "12 min" },
  { id: "AL-76", title: "Landslide risk on NH-2", detail: "Slope sensors trending unstable near Kohima.", level: "high", ago: "36 min" },
  { id: "AL-75", title: "Sikkim snowline advisory", detail: "NH-10 above 10th Mile restricted after 20:00.", level: "high", ago: "1 hr" },
  { id: "AL-74", title: "Fog window on NH-6", detail: "Visibility under 100 m expected 18:00–22:00.", level: "moderate", ago: "3 hr" },
];

export const affectedDeliveries = [
  { id: "DL-3391", cargo: "Medical supplies", to: "Kohima CHC", delay: "+4 h 20 m", status: "high-risk" as RoadStatus },
  { id: "DL-3387", cargo: "Rice & pulses", to: "Pasighat depot", delay: "Halted", status: "blocked" as RoadStatus },
  { id: "DL-3382", cargo: "Fuel", to: "Agartala hub", delay: "+55 m", status: "caution" as RoadStatus },
  { id: "DL-3376", cargo: "Tarpaulin kits", to: "Gangtok store", delay: "+1 h 10 m", status: "caution" as RoadStatus },
  { id: "DL-3370", cargo: "Water tankers", to: "Aizawl camp", delay: "On time", status: "open" as RoadStatus },
];

export const authorityStats = [
  { label: "Active convoys", value: "42" },
  { label: "Open incidents", value: "11" },
  { label: "Blocked corridors", value: "3" },
  { label: "Network reach", value: "87%" },
];

export const incidentTypes = [
  "Landslide",
  "Flooding",
  "Bridge damage",
  "Road subsidence",
  "Fallen trees",
  "Accident / blockage",
  "Snow or ice",
  "Other",
];

export const severityLevels = ["Low", "Moderate", "High", "Critical"] as const;

export const driverRoute = {
  convoyId: "RX-217",
  driver: "K. Longkumer",
  origin: "Dimapur Logistics Hub",
  destination: "Kohima Community Health Centre",
  routeName: "NH-2 via Chumoukedima",
  distanceLeft: "38 km",
  eta: "1 h 25 m",
  arrivalAt: "16:40 IST",
  status: "high-risk" as RoadStatus,
  legs: [
    { name: "Dimapur – Chumoukedima", status: "open" as RoadStatus, note: "Clear road" },
    { name: "Chumoukedima – Piphema", status: "caution" as RoadStatus, note: "Wet surface, 40 km/h" },
    { name: "Piphema – Kohima", status: "high-risk" as RoadStatus, note: "Landslide debris on one lane" },
  ],
  hazard: {
    title: "Active landslide zone in 12 km",
    detail:
      "Debris reported near Piphema at 15:02. One lane open with convoy escort. Expect 20–30 minute holding time.",
    severity: "Critical",
  },
  alternate: {
    name: "NH-29 via Medziphema",
    eta: "1 h 50 m",
    extra: "+25 min, +14 km",
    status: "open" as RoadStatus,
    note: "Longer but fully open; recommended for heavy vehicles.",
  },
};
