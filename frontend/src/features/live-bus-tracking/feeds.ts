// ============================================================
// Tracking feeds.
//
// Demo feed: local simulated GPS along the pinned OSRM route.
// Manual feed: adapter the backend can push real GPS fixes into later.
// ============================================================

import { buildRouteMetrics, isValidLocation, locationAtProgress } from './geo';
import { DEMO_ROUTE } from './demoRoute';
import type {
  BusLocation,
  BusRoute,
  BusTrackingFeed,
  DemoFeedOptions,
  ManualTrackingFeed,
} from './types';

const DEFAULT_INTERVAL_MS = 2200;
const DEFAULT_SPEED_KPH = 28;
const DEFAULT_SPEED_MULTIPLIER = 10;

/**
 * Simulated feed used until the backend supplies GPS. The badge in the UI is
 * driven by `kind: 'demo'`, so this can never be mistaken for live tracking.
 */
export function createDemoTrackingFeed(
  route: BusRoute = DEMO_ROUTE,
  options: DemoFeedOptions = {},
): BusTrackingFeed {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const speedKph = options.speedKph ?? DEFAULT_SPEED_KPH;
  const speedMultiplier = options.speedMultiplier ?? DEFAULT_SPEED_MULTIPLIER;
  const metrics = buildRouteMetrics(route);

  let progress = options.startProgress ?? 0.08;
  let completedTicks = 0;
  let timer: number | null = null;
  let latest: BusLocation | null = null;
  const listeners = new Set<(location: BusLocation) => void>();

  const emit = () => {
    const location = locationAtProgress(route, metrics, progress, speedKph);
    latest = location;
    listeners.forEach((listener) => listener(location));
  };

  const step = () => {
    if (progress >= 1) {
      completedTicks += 1;
      if (completedTicks > 2) {
        progress = 0.01;
        completedTicks = 0;
      }
    } else {
      const metresPerTick =
        (speedKph * 1000 * speedMultiplier * intervalMs) / (60 * 60 * 1000);
      progress = Math.min(1, progress + metresPerTick / Math.max(1, metrics.totalM));
    }
    emit();
  };

  return {
    id: `${route.routeId}:demo`,
    label: `${route.busId} · Demo tracking`,
    kind: 'demo',
    loadRoute: async () => route,
    subscribe(listener) {
      listeners.add(listener);
      if (latest) {
        listener(latest);
      } else {
        emit();
      }
      if (timer === null) {
        timer = window.setInterval(step, intervalMs);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer !== null) {
          window.clearInterval(timer);
          timer = null;
        }
      };
    },
    getInitialLocation: () => latest,
  };
}

/**
 * Backend adapter. The transport layer (SSE / WebSocket / polling) owns the
 * connection and calls pushLocation for every GPS fix.
 *
 *   const feed = createManualTrackingFeed(routeFromBackend);
 *   sse.addEventListener('bus:location', (event) => {
 *     feed.pushLocation(JSON.parse(event.data));
 *   });
 */
export function createManualTrackingFeed(route: BusRoute): ManualTrackingFeed {
  let currentRoute = route;
  let latest: BusLocation | null = null;
  const listeners = new Set<(location: BusLocation) => void>();

  return {
    id: `${route.routeId}:live`,
    label: `${route.busId} · Live GPS`,
    kind: 'live',
    loadRoute: async () => currentRoute,
    subscribe(listener) {
      listeners.add(listener);
      if (latest) listener(latest);
      return () => listeners.delete(listener);
    },
    getInitialLocation: () => latest,
    pushLocation(location) {
      if (!isValidLocation(location)) return;
      if (currentRoute.busId && location.busId !== currentRoute.busId) return;
      latest = location;
      listeners.forEach((listener) => listener(location));
    },
    replaceRoute(nextRoute) {
      currentRoute = nextRoute;
    },
  };
}
