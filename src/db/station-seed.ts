import { NETWORKS, NETWORK_LABELS, type StationDto } from "../domain/station";
import { LANDMARK_SEED } from "./landmark-seed";

const CITIES = [
  {
    name: "Hyderabad",
    lat: 17.385,
    lng: 78.4867,
    areas: [
      "Abids",
      "Koti",
      "Nampally",
      "Basheerbagh",
      "Himayatnagar",
      "Lakdikapul",
    ],
  },
  {
    name: "Vijayawada",
    lat: 16.5062,
    lng: 80.648,
    areas: ["Benz Circle", "Governorpet", "Patamata"],
  },
  {
    name: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    areas: ["MG Road", "Indiranagar", "Richmond Town"],
  },
  {
    name: "Chennai",
    lat: 13.0827,
    lng: 80.2707,
    areas: ["Egmore", "T Nagar", "Nungambakkam"],
  },
  {
    name: "Mumbai",
    lat: 19.076,
    lng: 72.8777,
    areas: ["Bandra", "Andheri", "Kurla"],
  },
  {
    name: "Delhi NCR",
    lat: 28.6139,
    lng: 77.209,
    areas: ["Connaught Place", "Karol Bagh", "Lodhi Road"],
  },
];
const CORRIDORS = [
  {
    name: "NH65",
    start: CITIES[0],
    end: CITIES[1],
    areas: ["Choutuppal", "Suryapet", "Kodad", "Nandigama"],
  },
  {
    name: "NH44",
    start: CITIES[0],
    end: CITIES[2],
    areas: ["Jadcherla", "Kurnool", "Anantapur", "Chikkaballapur"],
  },
  {
    name: "NH48",
    start: CITIES[2],
    end: CITIES[3],
    areas: ["Hosur", "Krishnagiri", "Vellore", "Sriperumbudur"],
  },
  {
    name: "Mumbai–Pune Expressway",
    start: CITIES[4],
    end: { lat: 18.5204, lng: 73.8567 },
    areas: ["Panvel", "Khalapur", "Lonavala", "Talegaon"],
  },
];
function seededRandom(): () => number {
  let state = 28471;
  return (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function station(
  index: number,
  lat: number,
  lng: number,
  address: string,
  random: () => number,
): StationDto {
  const network = NETWORKS[index % 6] ?? "tata-power";
  const isAc = network === "ather-grid" || index % 4 === 0;
  const powerKw = isAc ? 11 : 60 + (index % 3) * 30;
  const operationalStatus = index % 5 === 0 ? "busy" : "available";
  const label =
    Object.entries(NETWORK_LABELS).find(([key]) => key === network)?.[1] ??
    "Other";
  return {
    id: `local-${index}`,
    name: `${label} ${address.split(",")[0]}`,
    network,
    lat,
    lng,
    address,
    distanceKm: 0,
    connectors: [
      {
        type: isAc ? "TYPE2" : "CCS2",
        powerKw: network === "ather-grid" ? 3.3 : powerKw,
        tariffInrPerKwh:
          Math.round((isAc ? 12 + random() * 6 : 18 + random() * 7) * 100) /
          100,
        status: index % 11 === 0 ? "offline" : operationalStatus,
      },
    ],
    amenities: index % 2 === 0 ? ["restroom", "cafe"] : ["dining", "wifi"],
    lastUpdated: "2026-01-01T00:00:00.000Z",
  };
}
function addHighwayStations(
  stations: StationDto[],
  random: () => number,
): void {
  for (const landmark of LANDMARK_SEED.filter((place) =>
    /NH(65|44|48)/.test(place.name),
  )) {
    stations.push(
      station(
        stations.length,
        landmark.lat,
        landmark.lng,
        `${landmark.name} Highway Charging Hub`,
        random,
      ),
    );
  }
}
function generateStations(): StationDto[] {
  const random = seededRandom();
  const stations: StationDto[] = [];
  for (const city of CITIES) {
    for (let i = 0; i < 60; i++) {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * (i < 36 ? 0.025 : 0.1);
      stations.push(
        station(
          stations.length,
          city.lat + Math.sin(angle) * radius,
          city.lng + Math.cos(angle) * radius,
          `${city.areas[i % city.areas.length]} Charging Hub ${Math.floor(i / city.areas.length) + 1}, ${city.name}`,
          random,
        ),
      );
    }
  }
  for (const corridor of CORRIDORS) {
    if (!corridor.start || !corridor.end) continue;
    for (const [i, area] of corridor.areas.entries()) {
      const fraction = (i + 1) / (corridor.areas.length + 1);
      stations.push(
        station(
          stations.length,
          corridor.start.lat +
            (corridor.end.lat - corridor.start.lat) * fraction,
          corridor.start.lng +
            (corridor.end.lng - corridor.start.lng) * fraction,
          `${area} Wayside Plaza, ${corridor.name}`,
          random,
        ),
      );
    }
  }
  addHighwayStations(stations, random);
  return stations;
}
export const STATION_SEED: readonly StationDto[] = generateStations();
