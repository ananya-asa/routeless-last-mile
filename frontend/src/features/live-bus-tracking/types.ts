// ============================================================
// Live bus tracking — isolated frontend contract.
//
// These interfaces are intentionally self-contained so the backend can adopt
// them without touching the existing TransportOption / RecoveryProposal shapes.
// ============================================================

/** [longitude, latitude] — GeoJSON order, matching OSRM geometry. */
export type LonLat = [number, number];

export interface BusStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface BusRoute {
  routeId: string;
  busId: string;
  routeName: string;
  /** Full road-following geometry, [longitude, latitude] pairs. */
  coordinates: LonLat[];
  stops: BusStop[];
  /** 'backend' routes are real; 'demo' routes are sample data. */
  source: 'backend' | 'demo';
  geometryNote?: string;
}

export interface BusLocation {
  busId: string;
  latitude: number;
  longitude: number;
  /** ISO-8601 timestamp of the GPS fix. */
  timestamp: string;
  heading?: number;
  speedKph?: number;
  /** Optional 0..1 progress along the route, when the provider supplies it. */
  progress?: number;
}

export type TrackingFeedKind = 'live' | 'demo';

/**
 * Read-only feed consumed by <LiveBusTracking />.
 *
 * A backend adapter only needs to implement loadRoute() once and call the
 * subscriber whenever a GPS update arrives.
 */
export interface BusTrackingFeed {
  id: string;
  label: string;
  kind: TrackingFeedKind;
  loadRoute(): Promise<BusRoute>;
  subscribe(listener: (location: BusLocation) => void): () => void;
  getInitialLocation?(): BusLocation | null;
}

/**
 * Adapter for a backend push channel (SSE, WebSocket, MQTT bridge, polling).
 * Create it with the route fetched from the backend, then call pushLocation()
 * from the transport. Until the first push, the UI says "Waiting for GPS".
 */
export interface ManualTrackingFeed extends BusTrackingFeed {
  pushLocation(location: BusLocation): void;
  replaceRoute(route: BusRoute): void;
}

export interface RouteProgress {
  /** Index of the nearest route vertex to the bus. */
  index: number;
  /** 0..1 along the route. */
  progress: number;
  nextStop: BusStop;
  distanceToNextStopM: number;
  remainingDistanceM: number;
  etaMinutes: number;
}

export interface DemoFeedOptions {
  /** How often a new simulated position is emitted. */
  intervalMs?: number;
  /** Compressed demo playback multiplier, e.g. 10 = ten times real time. */
  speedMultiplier?: number;
  /** Cruise speed used for the ETA and playback maths. */
  speedKph?: number;
  /** Where the demo bus starts along the route (0..1). */
  startProgress?: number;
}
