import type { StationDto } from "../domain/station";
import type { BoundingBox } from "../lib/geo";
import { STATION_SEED } from "../db/station-seed";
export interface LocalStationRepository {
  findWithin(box: BoundingBox): StationDto[];
}
export class SeedStationRepository implements LocalStationRepository {
  findWithin(box: BoundingBox): StationDto[] {
    return STATION_SEED.filter((station) => {
      let lng = station.lng;
      if (lng < box.west) lng += 360;
      else if (lng > box.east) lng -= 360;
      return (
        station.lat >= box.south &&
        station.lat <= box.north &&
        lng >= box.west &&
        lng <= box.east
      );
    }).map((station) => structuredClone(station));
  }
}
