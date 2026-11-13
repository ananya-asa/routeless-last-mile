// ============================================================
// Geometry helpers for the tracking feature.
// No React, no Leaflet, no DOM — easy to test and reuse.
// ============================================================

import type {
  BusLocation,
  BusRoute,
  LonLat,
  RouteProgress,
} from './types';

const EARTH_RADIUS_M = 6_371_000;
const DEFAULT_SPEED_KPH = 24;

const toRad = (degrees: number) => (degrees * Math.PI) / 180;
const toDeg = (radians: number) => (radians * 180) / Math.PI;

export interface RouteMetrics {
  cumulativeM: number[];
  totalM: number;
  /** Nearest route vertex index for each stop, in route order. */
  stopIndices: number[];
}

export function haversineM(a: LonLat, b: LonLat): number {
  const dLon = toRad(b[0] - a[0]);
  const dLat = toRad(b[1] - a[1]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearingDegrees(from: LonLat, to: LonLat): number {
  const lat1 = toRad(from[1]);
  const lat2 = toRad(to[1]);
  const dLon = toRad(to[0] - from[0]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function nearestCoordinateIndex(
  latitude: number,
  longitude: number,
  coordinates: LonLat[],
): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < coordinates.length; index += 1) {
    const coordinate = coordinates[index];
    const dLat = coordinate[1] - latitude;
    const dLon = coordinate[0] - longitude;
    const distance = dLat * dLat + dLon * dLon;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

export function buildRouteMetrics(route: BusRoute): RouteMetrics {
  const cumulativeM: number[] = [0];
  for (let index = 1; index < route.coordinates.length; index += 1) {
    cumulativeM.push(
      cumulativeM[index - 1] +
        haversineM(route.coordinates[index - 1], route.coordinates[index]),
    );
  }

  const stopIndices = route.stops.map((stop) =>
    nearestCoordinateIndex(stop.latitude, stop.longitude, route.coordinates),
  );

  return {
    cumulativeM,
    totalM: cumulativeM[cumulativeM.length - 1] ?? 0,
    stopIndices,
  };
}

function indexForDistance(cumulativeM: number[], distanceM: number): number {
  for (let index = 0; index < cumulativeM.length; index += 1) {
    if (cumulativeM[index] >= distanceM) return index;
  }
  return Math.max(0, cumulativeM.length - 1);
}

interface RoutePoint {
  coordinate: LonLat;
  index: number;
  heading: number;
}

function pointAtDistance(
  route: BusRoute,
  metrics: RouteMetrics,
  distanceM: number,
): RoutePoint {
  const clamped = Math.min(Math.max(distanceM, 0), metrics.totalM);
  const index = indexForDistance(metrics.cumulativeM, clamped);
  const start = route.coordinates[index];
  const previous = route.coordinates[Math.max(0, index - 1)];
  const next = route.coordinates[Math.min(route.coordinates.length - 1, index + 1)];
  return {
    coordinate: start,
    index,
    heading: bearingDegrees(previous, next),
  };
}

/**
 * Deterministic demo position for a 0..1 route progress. Used by the demo feed
 * and by the static fallback map so both always agree.
 */
export function locationAtProgress(
  route: BusRoute,
  metrics: RouteMetrics,
  progress: number,
  speedKph: number,
  timestamp = new Date().toISOString(),
): BusLocation {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const point = pointAtDistance(route, metrics, metrics.totalM * clamped);
  const nextIndex = Math.min(route.coordinates.length - 1, point.index + 1);
  const heading = bearingDegrees(
    point.coordinate,
    route.coordinates[nextIndex],
  );

  return {
    busId: route.busId,
    latitude: point.coordinate[1],
    longitude: point.coordinate[0],
    timestamp,
    heading,
    speedKph,
    progress: clamped,
  };
}

/**
 * Turns the latest GPS fix into the information a student needs. Works with
 * provider-supplied progress when available and falls back to nearest-vertex
 * matching when the backend only sends lat/lon.
 */
export function analyzeRouteProgress(
  route: BusRoute,
  metrics: RouteMetrics,
  location: BusLocation,
): RouteProgress {
  const hasProgress =
    typeof location.progress === 'number' &&
    Number.isFinite(location.progress);
  const progress = hasProgress
    ? Math.min(Math.max(location.progress as number, 0), 1)
    : (() => {
        const index = nearestCoordinateIndex(
          location.latitude,
          location.longitude,
          route.coordinates,
        );
        return metrics.totalM > 0
          ? (metrics.cumulativeM[index] ?? 0) / metrics.totalM
          : 0;
      })();

  const index = indexForDistance(metrics.cumulativeM, metrics.totalM * progress);
  const lastStop = route.stops[route.stops.length - 1];
  const nextStopIndex =
    metrics.stopIndices.find((stopIndex) => stopIndex > index + 1) ??
    metrics.stopIndices[metrics.stopIndices.length - 1] ??
    0;
  const nextStop =
    route.stops[metrics.stopIndices.indexOf(nextStopIndex)] ?? lastStop;

  const currentM = metrics.cumulativeM[index] ?? 0;
  const nextStopM = metrics.cumulativeM[nextStopIndex] ?? metrics.totalM;
  const remainingDistanceM = Math.max(0, metrics.totalM - currentM);
  const distanceToNextStopM = Math.max(0, nextStopM - currentM);
  const speedKph =
    location.speedKph && location.speedKph > 1
      ? location.speedKph
      : DEFAULT_SPEED_KPH;
  const etaMinutes =
    remainingDistanceM <= 30
      ? 0
      : Math.max(
          1,
          Math.round(remainingDistanceM / ((speedKph * 1000) / 60)),
        );

  return {
    index,
    progress,
    nextStop,
    distanceToNextStopM,
    remainingDistanceM,
    etaMinutes,
  };
}

export function formatDistance(distanceM: number): string {
  if (!Number.isFinite(distanceM) || distanceM <= 0) return '0 m';
  if (distanceM < 1000) return `${Math.round(distanceM / 10) * 10} m`;
  return `${(distanceM / 1000).toFixed(1)} km`;
}

export function isValidLocation(location: BusLocation): boolean {
  return (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180 &&
    !Number.isNaN(Date.parse(location.timestamp))
  );
}

/** Leaflet wants [lat, lng]; our contract uses [lon, lat]. */
export function toLatLngPairs(coordinates: LonLat[]): [number, number][] {
  return coordinates.map(([lng, lat]) => [lat, lng]);
}
