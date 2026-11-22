import { z } from "../../lib/zod";
import { CONNECTORS, NETWORKS, type StationDto } from "../../domain/station";
import type { Point } from "../../lib/geo";
import type { Result } from "../../lib/result";

const stationSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  network: z.enum(NETWORKS),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  distanceKm: z.number().min(0).max(5),
  address: z.string().max(300),
  lastUpdated: z.iso.datetime({ offset: true }),
  amenities: z.array(z.enum(["restroom", "cafe", "dining", "wifi"])),
  connectors: z.array(
    z.object({
      type: z.enum(CONNECTORS),
      powerKw: z.number().min(0).max(400),
      tariffInrPerKwh: z.number().nonnegative().nullable(),
      status: z.enum(["available", "busy", "offline"]),
    }),
  ),
});
const responseSchema = z.object({
  stations: z.array(stationSchema).max(300),
  center: z.object({ lat: z.number(), lng: z.number() }),
  radiusKm: z.number(),
  sources: z.array(z.string()),
});
export async function fetchStations(
  center: Point,
  signal: AbortSignal,
): Promise<Result<StationDto[], string>> {
  try {
    const query = new URLSearchParams({
      lat: String(center.lat),
      lng: String(center.lng),
      radiusKm: "5",
    });
    const response = await fetch(`/api/stations/nearby?${query}`, { signal });
    if (response.status === 401)
      return { ok: false, error: "Session expired. Please sign in again." };
    if (!response.ok)
      return {
        ok: false,
        error: "Unable to load stations. Try another location.",
      };
    const payload: unknown = await response.json();
    const parsed = responseSchema.safeParse(payload);
    return parsed.success
      ? { ok: true, value: parsed.data.stations }
      : { ok: false, error: "Station data unavailable." };
  } catch {
    return { ok: false, error: "Connection unavailable. Please retry." };
  }
}
