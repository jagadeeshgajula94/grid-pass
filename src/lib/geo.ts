export interface Point {
  lat: number;
  lng: number;
}
export interface RouteProjection {
  distanceKm: number;
  kmAlongRoute: number;
}
const longitudeDelta = (value: number): number => ((value + 540) % 360) - 180;
function segmentProjection(
  point: Point,
  start: Point,
  end: Point,
): { distanceKm: number; fraction: number } {
  const scale = Math.cos(radians((start.lat + end.lat) / 2));
  const x = radians(longitudeDelta(end.lng - start.lng)) * scale * EARTH_KM;
  const y = radians(end.lat - start.lat) * EARTH_KM;
  const px = radians(longitudeDelta(point.lng - start.lng)) * scale * EARTH_KM;
  const py = radians(point.lat - start.lat) * EARTH_KM;
  const fraction =
    x * x + y * y < Number.EPSILON
      ? 0
      : Math.max(0, Math.min(1, (px * x + py * y) / (x * x + y * y)));
  return {
    fraction,
    distanceKm: Math.hypot(px - fraction * x, py - fraction * y),
  };
}
export function pointToSegmentKm(
  point: Point,
  start: Point,
  end: Point,
): number {
  return segmentProjection(point, start, end).distanceKm;
}
export function projectOntoPolyline(
  point: Point,
  coordinates: Point[],
): RouteProjection {
  let best = { distanceKm: Infinity, kmAlongRoute: 0 };
  let along = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const start = coordinates[i - 1];
    const end = coordinates.at(i);
    if (!start || !end) continue;
    const projected = segmentProjection(point, start, end);
    const length = haversineKm(start, end);
    if (projected.distanceKm < best.distanceKm)
      best = {
        distanceKm: projected.distanceKm,
        kmAlongRoute: along + length * projected.fraction,
      };
    along += length;
  }
  return best;
}
export function polylineLengthKm(coordinates: Point[]): number {
  return coordinates.reduce((sum, point, i) => {
    const previous = i > 0 ? coordinates.at(i - 1) : undefined;
    return sum + (previous ? haversineKm(previous, point) : 0);
  }, 0);
}
export function routeBounds(
  coordinates: Point[],
  bufferKm: number,
): BoundingBox {
  const boxes = coordinates.map((point) =>
    boundingBox(point.lat, point.lng, bufferKm),
  );
  return {
    south: Math.min(...boxes.map((box) => box.south)),
    north: Math.max(...boxes.map((box) => box.north)),
    west: Math.min(...boxes.map((box) => box.west)),
    east: Math.max(...boxes.map((box) => box.east)),
  };
}
export function greatCircleLine(start: Point, end: Point): Point[] {
  const angle = haversineKm(start, end) / EARTH_KM;
  const steps = Math.max(1, Math.ceil((angle * EARTH_KM) / 5));
  const vector = (point: Point): number[] => [
    Math.cos(radians(point.lat)) * Math.cos(radians(point.lng)),
    Math.cos(radians(point.lat)) * Math.sin(radians(point.lng)),
    Math.sin(radians(point.lat)),
  ];
  const a = vector(start);
  const b = vector(end);
  return Array.from({ length: steps + 1 }, (_, i) => {
    if (i === 0) return start;
    if (i === steps) return end;
    const fraction = i / steps;
    if (Math.abs(Math.sin(angle)) < 1e-8)
      return {
        lat: start.lat + (end.lat - start.lat) * fraction,
        lng: start.lng + longitudeDelta(end.lng - start.lng) * fraction,
      };
    const components = a.map(
      (value, j) =>
        (value * Math.sin((1 - fraction) * angle) +
          (b.at(j) ?? 0) * Math.sin(fraction * angle)) /
        Math.sin(angle),
    );
    const [x = 0, y = 0, z = 0] = components;
    return {
      lat: (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI,
      lng: (Math.atan2(y, x) * 180) / Math.PI,
    };
  });
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
