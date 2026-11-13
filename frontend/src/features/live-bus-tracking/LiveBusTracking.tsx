import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  Bus,
  Check,
  Clock,
  Info,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Route,
} from 'lucide-react';
import {
  analyzeRouteProgress,
  buildRouteMetrics,
  formatDistance,
  isValidLocation,
  toLatLngPairs,
  type RouteMetrics,
} from './geo';
import { createDemoTrackingFeed } from './feeds';
import type {
  BusLocation,
  BusRoute,
  BusTrackingFeed,
} from './types';
import {
  loadLeaflet,
  type LeafletMarker,
  type LeafletNamespace,
  type LeafletPath,
} from './leafletLoader';
import { StaticRouteFallback } from './StaticRouteFallback';
import './live-bus-tracking.css';

export interface LiveBusTrackingProps {
  /**
   * Optional backend feed. Defaults to the clearly-labelled local demo feed so
   * the feature can be rendered before the tracking API exists.
   */
  feed?: BusTrackingFeed;
  className?: string;
  /** Set false when the host page already provides a page title. */
  showHeading?: boolean;
}

type MapStatus = 'idle' | 'loading' | 'ready' | 'fallback';
type RouteStatus = 'loading' | 'ready' | 'error';
type TrackingStatus = 'demo' | 'live' | 'waiting' | 'stale';

const STALE_AFTER_MS = 45_000;
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

interface MapBundle {
  L: LeafletNamespace;
  map: ReturnType<LeafletNamespace['map']>;
  travelled: LeafletPath;
  ahead: LeafletPath;
  bus: LeafletMarker | null;
}

const STATUS_COPY: Record<
  TrackingStatus,
  { label: string; detail: string; tone: TrackingStatus }
> = {
  demo: {
    label: 'Demo tracking',
    detail: 'Simulated bus positions on a real road route. Not live GPS.',
    tone: 'demo',
  },
  live: {
    label: 'Live GPS',
    detail: 'Positions are coming from the bus GPS feed.',
    tone: 'live',
  },
  waiting: {
    label: 'Waiting for GPS',
    detail: 'Connected to the live feed. Waiting for the first location update.',
    tone: 'waiting',
  },
  stale: {
    label: 'GPS delayed',
    detail: 'The last GPS update is over 45 seconds old. Positions may be behind.',
    tone: 'stale',
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isRenderableRoute(route: BusRoute): boolean {
  return (
    typeof route.routeName === 'string' &&
    route.routeName.length > 0 &&
    Boolean(route.routeId) &&
    Boolean(route.busId) &&
    Array.isArray(route.coordinates) &&
    route.coordinates.length >= 2 &&
    route.coordinates.every(
      (pair) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        Number.isFinite(pair[0]) &&
        Number.isFinite(pair[1]) &&
        Math.abs(pair[1]) <= 90 &&
        Math.abs(pair[0]) <= 180,
    ) &&
    Array.isArray(route.stops) &&
    route.stops.length >= 1 &&
    route.stops.every(
      (stop) =>
        Boolean(stop.id) &&
        typeof stop.name === 'string' &&
        Number.isFinite(stop.latitude) &&
        Number.isFinite(stop.longitude) &&
        Math.abs(stop.latitude) <= 90 &&
        Math.abs(stop.longitude) <= 180,
    )
  );
}

function busIcon(L: LeafletNamespace, heading: number) {
  const rotation = Number.isFinite(heading) ? heading : 0;
  return L.divIcon({
    className: 'lbt-bus-div-icon',
    html: `
      <span class="lbt-bus-pin">
        <span class="lbt-bus-pin__halo"></span>
        <span class="lbt-bus-pin__disc">
          <span class="lbt-bus-pin__arrow" style="transform: rotate(${rotation}deg)">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 2.6 19.6 20 12 16.4 4.4 20 12 2.6Z" />
            </svg>
          </span>
          <span class="lbt-bus-pin__glyph">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M6 17V6.2C6 4.4 7.6 3 9.6 3h4.8C16.4 3 18 4.4 18 6.2V17h-1.6v1.6h-2.2V17H9.8v1.6H7.6V17H6Zm2-9.6h8V6.2c0-.4-.4-.8-.9-.8H9.6c-.5 0-.9.4-.9.8v1.2Zm0 3.4h8V8.6H8v2.2Zm1.5 3.1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm5 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
            </svg>
          </span>
        </span>
      </span>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
}

function formatRelativeTime(timestamp: string, now: number): string {
  const time = Date.parse(timestamp);
  if (Number.isNaN(time)) return 'time unavailable';
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 8) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function formatClock(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function minutesForDistance(distanceM: number, speedKph?: number): number {
  const speed = speedKph && speedKph > 1 ? speedKph : 24;
  if (distanceM <= 20) return 0;
  return Math.max(1, Math.round(distanceM / ((speed * 1000) / 60)));
}

export function LiveBusTracking({
  feed: feedProp,
  className,
  showHeading = true,
}: LiveBusTrackingProps) {
  const demoFeed = useMemo(() => createDemoTrackingFeed(), []);
  const feed = feedProp ?? demoFeed;
  const headingId = useId();

  const [route, setRoute] = useState<BusRoute | null>(null);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>('loading');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [location, setLocation] = useState<BusLocation | null>(null);
  const [mapStatus, setMapStatus] = useState<MapStatus>('idle');
  const [followBus, setFollowBus] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [loadNonce, setLoadNonce] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapBundleRef = useRef<MapBundle | null>(null);
  const followRef = useRef(followBus);

  followRef.current = followBus;

  const metrics = useMemo<RouteMetrics | null>(
    () => (route ? buildRouteMetrics(route) : null),
    [route],
  );

  const progress = useMemo(
    () =>
      route && metrics && location
        ? analyzeRouteProgress(route, metrics, location)
        : null,
    [route, metrics, location],
  );

  const ageMs = location ? now - Date.parse(location.timestamp) : null;
  const stale = feed.kind === 'live' && ageMs !== null && ageMs > STALE_AFTER_MS;
  const trackingStatus: TrackingStatus =
    feed.kind === 'demo'
      ? 'demo'
      : !location
        ? 'waiting'
        : stale
          ? 'stale'
          : 'live';
  const statusCopy = STATUS_COPY[trackingStatus];

  // Clock for relative timestamps and stale detection.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (location) setNow(Date.now());
  }, [location]);

  // Load the route once per feed, then stay subscribed to GPS updates.
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    setRoute(null);
    setLocation(null);
    setRouteStatus('loading');
    setRouteError(null);
    setMapStatus('idle');

    const fail = (error: unknown) => {
      if (!active) return;
      setRouteStatus('error');
      setRouteError(
        error instanceof Error ? error.message : 'The route could not be loaded.',
      );
    };

    feed
      .loadRoute()
      .then((nextRoute) => {
        if (!active) return;
        if (!isRenderableRoute(nextRoute)) {
          throw new Error('The tracking feed returned incomplete route geometry.');
        }
        setRoute(nextRoute);
        setRouteStatus('ready');

        const initial = feed.getInitialLocation?.() ?? null;
        if (
          initial &&
          initial.busId === nextRoute.busId &&
          isValidLocation(initial)
        ) {
          setLocation(initial);
        }

        unsubscribe = feed.subscribe((nextLocation) => {
          if (!active) return;
          if (
            nextLocation.busId === nextRoute.busId &&
            isValidLocation(nextLocation)
          ) {
            setLocation(nextLocation);
          }
        });
      })
      .catch(fail);

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [feed, loadNonce]);

  // Initialise Leaflet and draw the full road geometry, stops and bus layer.
  useEffect(() => {
    if (!route) return;
    const container = mapContainerRef.current;
    if (!container) return;

    let active = true;
    let resizeObserver: ResizeObserver | null = null;
    let createdMap: ReturnType<LeafletNamespace['map']> | null = null;
    setMapStatus('loading');

    loadLeaflet()
      .then((L) => {
        if (!active || !mapContainerRef.current) return;
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
          attributionControl: true,
          minZoom: 8,
          maxZoom: 19,
        });
        createdMap = map;

        L.tileLayer(TILE_URL, {
          attribution: TILE_ATTRIBUTION,
          maxZoom: 19,
          detectRetina: true,
        }).addTo(map);

        const latlngs = toLatLngPairs(route.coordinates);

        L.polyline(latlngs, {
          color: '#fffcf5',
          weight: 13,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        L.polyline(latlngs, {
          color: '#8aa79c',
          weight: 4,
          opacity: 0.75,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        const ahead = L.polyline(latlngs, {
          color: '#0f6b57',
          weight: 6,
          opacity: 0.98,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        const travelled = L.polyline([], {
          color: '#e2a72e',
          weight: 6,
          opacity: 0.98,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        route.stops.forEach((stop, index) => {
          const isEndpoint = index === 0 || index === route.stops.length - 1;
          const marker = L.circleMarker([stop.latitude, stop.longitude], {
            radius: isEndpoint ? 7 : 5,
            color: '#fffcf5',
            weight: 2.5,
            fillColor: isEndpoint ? '#0a2620' : '#0f6b57',
            fillOpacity: 1,
          }).addTo(map);
          marker.bindTooltip(
            `<strong>${escapeHtml(stop.name)}</strong><br/>Stop ${index + 1} of ${route.stops.length}`,
            {
              direction: index === 0 ? 'bottom' : 'top',
              className: 'lbt-stop-tooltip',
              permanent: isEndpoint,
              offset: [0, index === 0 ? 8 : -8],
            },
          );
        });

        map.fitBounds(L.latLngBounds(latlngs), {
          padding: [36, 36],
          animate: false,
        });

        const stopFollowing = () => setFollowBus(false);
        map.on('dragstart', stopFollowing);

        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize({ animate: false });
        });
        resizeObserver.observe(mapContainerRef.current);

        mapBundleRef.current = { L, map, travelled, ahead, bus: null };
        setMapStatus('ready');
        window.requestAnimationFrame(() => {
          map.invalidateSize({ animate: false });
        });
      })
      .catch(() => {
        createdMap?.remove();
        mapBundleRef.current = null;
        if (active) setMapStatus('fallback');
      });

    return () => {
      active = false;
      resizeObserver?.disconnect();
      mapBundleRef.current?.map.remove();
      mapBundleRef.current = null;
    };
  }, [route, loadNonce]);

  // Move the bus marker and repaint travelled / remaining route sections.
  useEffect(() => {
    const bundle = mapBundleRef.current;
    if (!bundle || !route || !progress || mapStatus !== 'ready') return;
    const latlngs = toLatLngPairs(route.coordinates);
    const split = Math.max(
      0,
      Math.min(latlngs.length - 1, progress.index),
    );

    bundle.travelled.setLatLngs(latlngs.slice(0, split + 1));
    bundle.ahead.setLatLngs(latlngs.slice(split));

    if (!location) {
      if (bundle.bus) {
        bundle.bus.remove();
        bundle.bus = null;
      }
      return;
    }

    const position: [number, number] = [location.latitude, location.longitude];
    const icon = busIcon(bundle.L, location.heading ?? 0);

    if (bundle.bus) {
      bundle.bus.setLatLng(position);
      bundle.bus.setIcon(icon);
    } else {
      bundle.bus = bundle.L.marker(position, {
        icon,
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(bundle.map);
    }

    if (followRef.current) {
      bundle.map.panTo(position, { animate: true, duration: 0.7 });
    }
  }, [route, progress, location, mapStatus]);

  const handleFollowToggle = useCallback(() => {
    setFollowBus((current) => {
      const next = !current;
      if (next && location && mapBundleRef.current) {
        mapBundleRef.current.map.setView(
          [location.latitude, location.longitude],
          Math.max(14, mapBundleRef.current.map.getZoom()),
          { animate: true, duration: 0.7 },
        );
      }
      return next;
    });
  }, [location]);

  const handleRetry = useCallback(() => {
    setLoadNonce((value) => value + 1);
  }, []);

  const origin = route?.stops[0]?.name;
  const destination = route?.stops[route.stops.length - 1]?.name;
  const nextStopEta =
    progress && location
      ? minutesForDistance(
          progress.distanceToNextStopM,
          location.speedKph,
        )
      : null;
  const lastUpdateLabel = location
    ? formatRelativeTime(location.timestamp, now)
    : feed.kind === 'live'
      ? 'waiting for first fix'
      : 'not started';

  return (
    <section
      className={`lbt${className ? ` ${className}` : ''}`}
      aria-labelledby={showHeading ? headingId : undefined}
      aria-label={showHeading ? undefined : 'Live bus tracking map'}
    >
      <header className="lbt__header">
        <div className="lbt__heading">
          <p className="lbt__eyebrow">
            <span className="lbt__eyebrow-icon" aria-hidden="true">
              <Navigation size={13} strokeWidth={2.5} />
            </span>
            Live bus tracking
          </p>
          {showHeading ? (
            <h2 className="lbt__title" id={headingId}>
              {route?.routeName ?? 'Your bus, on the map'}
            </h2>
          ) : null}
          <p className="lbt__subtitle">
            {route ? (
              <>
                <span className="lbt__bus-id">{route.busId}</span>
                <span className="lbt__dot" aria-hidden="true" />
                {origin && destination
                  ? `${origin} → ${destination}`
                  : `Route ${route.routeId}`}
              </>
            ) : (
              'Loading route details…'
            )}
          </p>
        </div>
        <div className="lbt__status-wrap">
          <span
            className={`lbt__status lbt__status--${statusCopy.tone}`}
            role="status"
            aria-live="polite"
          >
            <span className="lbt__status-dot" aria-hidden="true" />
            {statusCopy.label}
          </span>
          <span className="lbt__updated">
            <Clock size={12} strokeWidth={2.5} aria-hidden="true" />
            {lastUpdateLabel}
          </span>
        </div>
      </header>

      <p
        className={`lbt__notice lbt__notice--${feed.kind === 'demo' ? 'demo' : trackingStatus}`}
      >
        <Info size={15} strokeWidth={2.5} aria-hidden="true" />
        <span>{statusCopy.detail}</span>
      </p>

      <div className="lbt__layout">
        <div className="lbt__map-panel">
          <div className="lbt__map-frame">
            <div
              ref={mapContainerRef}
              className="lbt__map"
              role="region"
              aria-label={
                route
                  ? `Interactive map for ${route.routeName}`
                  : 'Interactive bus route map'
              }
            />

            {routeStatus === 'loading' ? (
              <div className="lbt__map-loading" aria-live="polite">
                <span className="lbt__spinner" aria-hidden="true" />
                <strong>Preparing the map</strong>
                <span>Loading route geometry and stops…</span>
              </div>
            ) : null}

            {routeStatus === 'error' ? (
              <div className="lbt__map-state" role="alert">
                <span className="lbt__state-icon lbt__state-icon--danger">
                  <AlertTriangle size={20} strokeWidth={2.2} />
                </span>
                <strong>Route unavailable</strong>
                <span>{routeError ?? 'The tracking feed did not return a route.'}</span>
                <button
                  type="button"
                  className="lbt__button lbt__button--quiet"
                  onClick={handleRetry}
                >
                  <RefreshCw size={14} strokeWidth={2.4} />
                  Try again
                </button>
              </div>
            ) : null}

            {(mapStatus === 'fallback' || mapStatus === 'loading') &&
            route &&
            routeStatus === 'ready' ? (
              <StaticRouteFallback route={route} location={location} />
            ) : null}

            {mapStatus === 'loading' && route && routeStatus === 'ready' ? (
              <span className="lbt__map-loading-pill" role="status">
                <span className="lbt__spinner lbt__spinner--small" aria-hidden="true" />
                Loading interactive map…
              </span>
            ) : null}

            {mapStatus === 'fallback' && route ? (
              <div className="lbt__map-fallback-note">
                <AlertTriangle size={13} strokeWidth={2.4} aria-hidden="true" />
                <span>Interactive map unavailable. Showing a static route preview.</span>
                <button
                  type="button"
                  className="lbt__map-fallback-retry"
                  onClick={handleRetry}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {routeStatus === 'ready' && progress ? (
              <div className="lbt__map-next" aria-live="polite">
                <span className="lbt__map-next-label">Next stop</span>
                <strong className="lbt__map-next-name">{progress.nextStop.name}</strong>
                <span className="lbt__map-next-meta">
                  <span>
                    <MapPin size={12} strokeWidth={2.5} aria-hidden="true" />
                    {formatDistance(progress.distanceToNextStopM)}
                  </span>
                  <span>
                    <Clock size={12} strokeWidth={2.5} aria-hidden="true" />
                    {nextStopEta === 0 ? 'arriving' : `~${nextStopEta ?? '—'} min`}
                  </span>
                </span>
              </div>
            ) : null}

            {routeStatus === 'ready' && !location && feed.kind === 'live' ? (
              <div className="lbt__map-waiting" role="status">
                <Radio size={15} strokeWidth={2.4} aria-hidden="true" />
                Waiting for the first GPS fix
              </div>
            ) : null}

            {routeStatus === 'ready' ? (
              <div className="lbt__map-controls">
                <button
                  type="button"
                  className={`lbt__follow${followBus ? ' lbt__follow--active' : ''}`}
                  onClick={handleFollowToggle}
                  disabled={!location}
                  aria-pressed={followBus}
                >
                  <LocateFixed size={15} strokeWidth={2.5} />
                  {followBus ? 'Following bus' : 'Follow bus'}
                </button>
              </div>
            ) : null}
          </div>

          {routeStatus === 'ready' && progress ? (
            <div className="lbt__mobile-next">
              <MapPin size={14} strokeWidth={2.5} aria-hidden="true" />
              <span>Next stop</span>
              <strong>{progress.nextStop.name}</strong>
              <span className="lbt__mobile-next-meta">
                {formatDistance(progress.distanceToNextStopM)} ·{' '}
                {nextStopEta === 0 ? 'arriving' : `~${nextStopEta ?? '—'} min`}
              </span>
            </div>
          ) : null}

          <ul className="lbt__legend" aria-label="Map legend">
            <li>
              <span className="lbt__legend-swatch lbt__legend-swatch--travelled" />
              Travelled
            </li>
            <li>
              <span className="lbt__legend-swatch lbt__legend-swatch--ahead" />
              Ahead
            </li>
            <li>
              <span className="lbt__legend-swatch lbt__legend-swatch--stop" />
              Stops
            </li>
            <li className="lbt__legend-note">
              <Route size={13} strokeWidth={2.4} aria-hidden="true" />
              {route?.geometryNote
                ? 'Road geometry · demo stops'
                : 'Route geometry'}
            </li>
          </ul>
        </div>

        <aside className="lbt__sidebar" aria-label="Bus and trip details">
          <div className="lbt__card">
            <div className="lbt__vehicle">
              <span className="lbt__vehicle-icon" aria-hidden="true">
                <Bus size={20} strokeWidth={2.2} />
              </span>
              <div className="lbt__vehicle-copy">
                <span className="lbt__card-label">Your bus</span>
                <strong>{route?.busId ?? '—'}</strong>
                <span>{route?.routeId ?? 'Loading route'}</span>
              </div>
              {route && location ? (
                <span className="lbt__vehicle-state">
                  <span aria-hidden="true" />
                  On route
                </span>
              ) : null}
            </div>

            <dl className="lbt__stats">
              <div className="lbt__stat">
                <dt>ETA to destination</dt>
                <dd>
                  {progress && location ? (
                    <>
                      {progress.etaMinutes}
                      <span> min</span>
                    </>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div className="lbt__stat">
                <dt>Remaining</dt>
                <dd>
                  {progress ? formatDistance(progress.remainingDistanceM) : '—'}
                </dd>
              </div>
              <div className="lbt__stat">
                <dt>Next stop in</dt>
                <dd>
                  {progress ? formatDistance(progress.distanceToNextStopM) : '—'}
                </dd>
              </div>
              <div className="lbt__stat">
                <dt>Last update</dt>
                <dd className="lbt__stat-time">
                  {location ? formatClock(location.timestamp) : '—'}
                  <span>{lastUpdateLabel}</span>
                </dd>
              </div>
            </dl>

            <div className="lbt__progress">
              <div className="lbt__progress-head">
                <span>Trip progress</span>
                <strong>
                  {progress ? `${Math.round(progress.progress * 100)}%` : '—'}
                </strong>
              </div>
              <div
                className="lbt__progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={
                  progress ? Math.round(progress.progress * 100) : 0
                }
                aria-label="Trip progress"
              >
                <span
                  className="lbt__progress-fill"
                  style={{ width: `${progress ? progress.progress * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="lbt__card lbt__stops-card">
            <div className="lbt__stops-head">
              <div>
                <span className="lbt__card-label">Stops on this trip</span>
                <strong>
                  {route
                    ? `${route.stops.length} stops · ${formatDistance(metrics?.totalM ?? 0)}`
                    : 'Loading stops'}
                </strong>
              </div>
              <MapPin size={16} strokeWidth={2.2} aria-hidden="true" />
            </div>

            {route ? (
              <ol className="lbt__stops">
                {route.stops.map((stop, index) => {
                  const stopIndex = metrics?.stopIndices[index] ?? 0;
                  const isNext = progress?.nextStop.id === stop.id;
                  const isPassed = Boolean(
                    progress && !isNext && stopIndex <= progress.index,
                  );
                  const state = isNext
                    ? 'next'
                    : isPassed
                      ? 'passed'
                      : 'upcoming';
                  const isDestination = index === route.stops.length - 1;
                  return (
                    <li key={stop.id} className={`lbt__stop lbt__stop--${state}`}>
                      <span className="lbt__stop-marker" aria-hidden="true">
                        {isPassed ? (
                          <Check size={11} strokeWidth={3} />
                        ) : isNext ? (
                          <Bus size={11} strokeWidth={2.6} />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </span>
                      <div className="lbt__stop-copy">
                        <strong>{stop.name}</strong>
                        <span>
                          {isNext
                            ? `Next stop · ${formatDistance(progress?.distanceToNextStopM ?? 0)}`
                            : isPassed
                              ? 'Passed'
                              : isDestination
                                ? 'Destination'
                                : `Stop ${index + 1}`}
                        </span>
                      </div>
                      {isDestination ? (
                        <span className="lbt__stop-tag">Last stop</span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="lbt__stops-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          {feed.kind === 'live' ? (
            <p className="lbt__fineprint">
              <Radio size={13} strokeWidth={2.4} aria-hidden="true" />
              Live positions come from the operator feed. If updates stop, the
              map marks the feed as delayed.
            </p>
          ) : (
            <p className="lbt__fineprint">
              <Info size={13} strokeWidth={2.4} aria-hidden="true" />
              Demo tracking: positions are simulated along road geometry. Connect
              a backend GPS feed to switch to live tracking.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

export default LiveBusTracking;
