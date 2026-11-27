export const EV_MODELS = [
  "Mahindra XUV 9e",
  "Tata Nexon EV",
  "MG ZS EV",
  "Hyundai Ioniq 5",
  "BYD Atto 3",
  "Kia EV6",
  "Mahindra XEV 9e",
  "Mahindra BE 6",
  "Mahindra XUV400",
  "Tata Punch EV",
  "Tata Tiago EV",
  "Tata Curvv EV",
  "MG Windsor EV",
  "MG Comet EV",
  "Hyundai Creta Electric",
  "BYD Seal",
  "Citroën eC3",
] as const;
export type EvModel = (typeof EV_MODELS)[number];
export type Provenance = {
  source: string | null;
  kind: "published" | "measured" | "estimate";
};
export const EV_DATA_FIELDS = [
  "nominalKwh",
  "usableKwh",
  "claimedRangeKm",
  "testCycle",
  "maxDcKw",
  "maxAcKw",
  "cityWhPerKm",
  "highwayWhPerKm",
] as const;
export type EvDataField = (typeof EV_DATA_FIELDS)[number];
export interface EvPack {
  id: string;
  model: EvModel;
  supported: boolean;
  nominalKwh: number;
  usableKwh: number | null;
  claimedRangeKm: number;
  testCycle: "ARAI" | "MIDC";
  maxDcKw: number;
  maxAcKw: number;
  cityWhPerKm: number;
  highwayWhPerKm: number;
  provenance: Readonly<Record<EvDataField, Provenance>>;
}
const SOURCES = {
  xev: "https://www.mahindraelectricsuv.com/on/demandware.static/-/Library-Sites-eSUVSharedLibrary/default/MXV9/XEV9e_BROCHURE_R1_20260428.pdf",
  be: "https://www.mahindraelectricsuv.com/on/demandware.static/-/Library-Sites-eSUVSharedLibrary/default/dw2ea5ae4c/Be-6e/BE-6-Brochure.pdf",
  xuv: "https://img.gaadicdn.com/brochures/files/Mahindra-XUV400-EV/EC/1709701548498/XUV400ProRangeBrochure.pdf",
  tata: "https://ev.tata.cars/support.html",
  punch:
    "https://static-assets.tatamotors.com/Production/www-tatamotors-com-NEW/wp-content/uploads/2024/01/Punch.ev-Brochure.pdf",
  zs: "https://www.mgmotor.co.in/vehicles/mgzsev-electric-car-in-india",
  windsor:
    "https://www.mgmotor.co.in/content/dam/brand/mgmotor/press-release/documents/mgi-pr-pdf-0056.pdf",
  comet:
    "https://s7ap1.scene7.com/is/content/mgmotor/mgmotor/documents/MG%20Comet%20EV%20-%20Brochure.pdf",
  creta:
    "https://www.hyundai.com/content/dam/hyundai/in/en/data/brochure/cretaelctricbrochure.pdf",
  ioniq:
    "https://www.91wheels.com/news/hyundai-ioniq-5-ev-launched-at-rs-44-95-lakh-gets-631-km-range",
  atto: "https://asset.autocarindia.com/static/models/brochures/BYD-Atto_3-Brochure.pdf",
  seal: "https://bydautoindia.com/bydseal",
  sealRange: "https://www.autocarindia.com/cars/byd/seal/range",
  kiaOld:
    "https://www.kia.com/content/dam/kia2/in/en/our-vehicles/showroom/Brochures/Kia-EV6_Desktop.pdf",
  kia: "https://www.kia.com/content/dam/kia2/in/en/images/buy/download-brochure/Ev6-Latest-Brochure-2025.pdf",
  ec3: "https://www.citroennepal.com/content/dam/citroen/nepal/new-e-c3/e-C3-Shine-Brochure.pdf",
  measured:
    "https://www.autocarindia.com/auto-features/tata-nexon-ev-range-real-world-mileage-test-45kwh-battery-433577",
  nexon:
    "https://www.autovikas.com/storage/brochures/autovikas/tata-nexon-ev.pdf",
  curvv:
    "https://static-cdn.team-bhp.com/prod/new-car-cms/Tata/Curvv-EV/2024/08/07/c1c353c0-feed-4cfe-8a3e-2f42254e29f2-curvv-ev-brochure.pdf",
  tiago:
    "https://dealer-locator.cars.tatamotors.com/ev/assets/images/tiago-ev-brochure.pdf",
} as const;
const ESTIMATE: Provenance = { source: null, kind: "estimate" };
function published(source: string): Provenance {
  return { source, kind: "published" };
}
type PackRow = readonly [
  string,
  EvModel,
  number,
  number,
  number,
  number,
  number,
  number,
  keyof typeof SOURCES,
  EvPack["testCycle"],
];
const ROWS: readonly PackRow[] = [
  [
    "mahindra-xev-9e-59",
    EV_MODELS[6],
    59,
    522,
    150,
    180,
    140,
    11,
    "xev",
    "MIDC",
  ],
  [
    "mahindra-xev-9e-79",
    EV_MODELS[6],
    79,
    656,
    1000 / 5.38,
    1000 / 6.18,
    175,
    11,
    "xev",
    "MIDC",
  ],
  ["mahindra-be-6-59", EV_MODELS[7], 59, 557, 145, 175, 140, 11, "be", "MIDC"],
  [
    "mahindra-be-6-79",
    EV_MODELS[7],
    79,
    683,
    1000 / 5.55,
    1000 / 5.81,
    175,
    11,
    "be",
    "MIDC",
  ],
  [
    "mahindra-xuv400-34.5",
    EV_MODELS[8],
    34.5,
    375,
    125,
    155,
    50,
    3.3,
    "xuv",
    "MIDC",
  ],
  [
    "mahindra-xuv400-39.4",
    EV_MODELS[8],
    39.4,
    456,
    125,
    155,
    50,
    7.2,
    "xuv",
    "MIDC",
  ],
  [
    "tata-nexon-ev-30",
    EV_MODELS[1],
    30,
    275,
    115,
    145,
    50,
    6.6,
    "tata",
    "MIDC",
  ],
  [
    "tata-nexon-ev-45",
    EV_MODELS[1],
    45,
    489,
    126.58227848101265,
    130.3780964797914,
    60,
    7.2,
    "tata",
    "MIDC",
  ],
  [
    "tata-punch-ev-25",
    EV_MODELS[9],
    25,
    315,
    105,
    135,
    50,
    3.3,
    "punch",
    "MIDC",
  ],
  [
    "tata-punch-ev-35",
    EV_MODELS[9],
    35,
    421,
    110,
    140,
    50,
    7.2,
    "punch",
    "MIDC",
  ],
  [
    "tata-tiago-ev-19.2",
    EV_MODELS[10],
    19.2,
    221,
    95,
    125,
    25,
    3.3,
    "tata",
    "MIDC",
  ],
  [
    "tata-tiago-ev-24",
    EV_MODELS[10],
    24,
    275,
    95,
    125,
    25,
    7.2,
    "tata",
    "MIDC",
  ],
  [
    "tata-curvv-ev-45",
    EV_MODELS[11],
    45,
    430,
    125,
    155,
    60,
    7.2,
    "tata",
    "MIDC",
  ],
  [
    "tata-curvv-ev-55",
    EV_MODELS[11],
    55,
    502,
    130,
    160,
    70,
    7.2,
    "tata",
    "MIDC",
  ],
  ["mg-zs-ev-50.3", EV_MODELS[2], 50.3, 461, 140, 170, 50, 7.4, "zs", "ARAI"],
  [
    "mg-windsor-ev-38",
    EV_MODELS[12],
    38,
    332,
    120,
    150,
    45,
    7.4,
    "windsor",
    "ARAI",
  ],
  [
    "mg-comet-ev-17.3",
    EV_MODELS[13],
    17.3,
    230,
    95,
    130,
    0,
    3.3,
    "comet",
    "ARAI",
  ],
  [
    "hyundai-creta-electric-42",
    EV_MODELS[14],
    42,
    390,
    125,
    155,
    50,
    11,
    "creta",
    "ARAI",
  ],
  [
    "hyundai-creta-electric-51.4",
    EV_MODELS[14],
    51.4,
    473,
    130,
    160,
    50,
    11,
    "creta",
    "ARAI",
  ],
  [
    "hyundai-ioniq-5-72.6",
    EV_MODELS[3],
    72.6,
    631,
    150,
    185,
    220,
    11,
    "ioniq",
    "ARAI",
  ],
  [
    "byd-atto-3-49.92",
    EV_MODELS[4],
    49.92,
    468,
    145,
    175,
    70,
    7,
    "atto",
    "ARAI",
  ],
  [
    "byd-atto-3-60.48",
    EV_MODELS[4],
    60.48,
    521,
    150,
    180,
    80,
    7,
    "atto",
    "MIDC",
  ],
  [
    "byd-seal-61.44",
    EV_MODELS[15],
    61.44,
    510,
    145,
    170,
    110,
    7,
    "seal",
    "ARAI",
  ],
  [
    "byd-seal-82.56",
    EV_MODELS[15],
    82.56,
    650,
    150,
    175,
    150,
    7,
    "seal",
    "ARAI",
  ],
  [
    "kia-ev6-77.4",
    EV_MODELS[5],
    77.4,
    708,
    160,
    190,
    240,
    11,
    "kiaOld",
    "ARAI",
  ],
  ["kia-ev6-84", EV_MODELS[5], 84, 663, 160, 190, 258, 11, "kia", "MIDC"],
  [
    "citroen-ec3-29.2",
    EV_MODELS[16],
    29.2,
    320,
    115,
    145,
    30,
    3.3,
    "ec3",
    "MIDC",
  ],
];
const MEASURED_SOURCES = new Map([
  ["tata-nexon-ev-45", SOURCES.measured],
  [
    "mahindra-xev-9e-79",
    "https://www.autocarindia.com/auto-features/mahindra-xev-9e-real-world-range-tested-explained-436045",
  ],
  [
    "mahindra-be-6-79",
    "https://www.autocarindia.com/car-reviews/mahindra-be-6-road-test-review-437526",
  ],
]);
function makePack(row: PackRow): EvPack {
  const [
    id,
    model,
    nominalKwh,
    claimedRangeKm,
    cityWhPerKm,
    highwayWhPerKm,
    maxDcKw,
    maxAcKw,
    source,
    testCycle,
  ] = row;
  const reference = new Map(Object.entries(SOURCES)).get(source);
  if (!reference) throw new Error("Missing catalogue source");

  return {
    id,
    model,
    supported: true,
    nominalKwh,
    usableKwh: null,
    claimedRangeKm,
    testCycle,
    maxDcKw,
    maxAcKw,
    cityWhPerKm,
    highwayWhPerKm,
    provenance: provenanceFor(id, model, reference),
  };
}
export const EV_CATALOGUE: readonly EvPack[] = ROWS.map(makePack);
export const SELECTABLE_PACKS: readonly EvPack[] = EV_CATALOGUE.filter(
  (pack) => pack.supported,
);
export const VARIANT_IDS = SELECTABLE_PACKS.map((pack) => pack.id);
export interface PackSelection {
  pack: EvPack;
  packConfirmed: boolean;
}
export function findPack(id: string): EvPack | undefined {
  return SELECTABLE_PACKS.find((pack) => pack.id === id);
}
export function legacyPack(label: string): PackSelection | undefined {
  const model = label === "Mahindra XUV 9e" ? "Mahindra XEV 9e" : label;
  const pack = SELECTABLE_PACKS.filter((entry) => entry.model === model).sort(
    (a, b) => a.nominalKwh - b.nominalKwh,
  )[0];
  return pack ? { pack, packConfirmed: false } : undefined;
}
export function selectPack(profile: {
  evModel?: string;
  variantId?: string;
  packConfirmed?: boolean;
}): PackSelection | undefined {
  if (profile.variantId) {
    const pack = findPack(profile.variantId);
    return pack
      ? { pack, packConfirmed: profile.packConfirmed ?? true }
      : undefined;
  }
  return profile.evModel ? legacyPack(profile.evModel) : undefined;
}

function provenanceFor(
  id: string,
  model: EvModel,
  reference: string,
): EvPack["provenance"] {
  const provenance = {
    nominalKwh: published(reference),
    usableKwh: ESTIMATE,
    claimedRangeKm: published(reference),
    testCycle: published(reference),
    maxDcKw: ESTIMATE,
    maxAcKw: ESTIMATE,
    cityWhPerKm: ESTIMATE,
    highwayWhPerKm: ESTIMATE,
  };
  if (model === "BYD Seal") {
    provenance.claimedRangeKm = published(SOURCES.sealRange);
    provenance.testCycle = published(SOURCES.sealRange);
  }
  const measured = MEASURED_SOURCES.get(id);
  if (measured) {
    provenance.cityWhPerKm = { source: measured, kind: "measured" };
    provenance.highwayWhPerKm = { source: measured, kind: "measured" };
  }
  if (model === "Tata Nexon EV") provenance.maxAcKw = published(SOURCES.nexon);
  if (model === "Tata Curvv EV") provenance.maxAcKw = published(SOURCES.curvv);
  return provenance;
}
