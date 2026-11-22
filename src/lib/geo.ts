export interface Point {
  lat: number;
  lng: number;
}
export interface BoundingBox {
  south: number;
  north: number;
  west: number;
  east: number;
}
const EARTH_KM = 6371.0088;
const radians = (degrees: number): number => (degrees * Math.PI) / 180;
export function haversineKm(a: Point, b: Point): number {
  const value =
    Math.sin(radians(b.lat - a.lat) / 2) ** 2 +
    Math.cos(radians(a.lat)) *
      Math.cos(radians(b.lat)) *
      Math.sin(radians(b.lng - a.lng) / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(Math.min(1, value)));
}
export function boundingBox(
  lat: number,
  lng: number,
  radiusKm: number,
): BoundingBox {
  const deltaLat = ((radiusKm / EARTH_KM) * 180) / Math.PI;
  const deltaLng =
    Math.abs(lat) + deltaLat >= 90
      ? 180
      : (Math.asin(
          Math.min(1, Math.sin(radiusKm / EARTH_KM) / Math.cos(radians(lat))),
        ) *
          180) /
        Math.PI;
  return {
    south: Math.max(-90, lat - deltaLat),
    north: Math.min(90, lat + deltaLat),
    west: lng - deltaLng,
    east: lng + deltaLng,
  };
}
export function gridCellKey(
  lat: number,
  lng: number,
  radiusKm: number,
): string {
  return `${Math.round(lat * 20) / 20}:${Math.round(lng * 20) / 20}:${radiusKm}`;
}
export function circleCoordinates(center: Point, radiusKm = 5): number[][] {
  const angular = radiusKm / EARTH_KM;
  const latitude = radians(center.lat);
  return Array.from({ length: 65 }, (_, index) => {
    const bearing = ((index % 64) / 64) * Math.PI * 2;
    const lat = Math.asin(
      Math.sin(latitude) * Math.cos(angular) +
        Math.cos(latitude) * Math.sin(angular) * Math.cos(bearing),
    );
    const lng =
      radians(center.lng) +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(latitude),
        Math.cos(angular) - Math.sin(latitude) * Math.sin(lat),
      );
    return [(lng * 180) / Math.PI, (lat * 180) / Math.PI];
  });
}
