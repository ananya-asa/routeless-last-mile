# Live Bus Tracking

Isolated, reusable student-facing bus map for ROUTELESS. It is **not mounted in the app shell** yet, so no shared navigation, router, package file, backend file, or API contract was changed.

```text
src/features/live-bus-tracking/
├── LiveBusTracking.tsx      map + trip UI
├── live-bus-tracking.css    scoped .lbt styles
├── types.ts                 feed / route / location contract
├── geo.ts                   haversine, progress, ETA, next stop
├── demoRoute.ts             pinned OSRM road geometry + demo stops
├── feeds.ts                 demo feed + backend push adapter
├── leafletLoader.ts         pinned Leaflet 1.9.4 CDN loader
├── StaticRouteFallback.tsx  static preview if the map library fails
├── index.ts                 public exports
├── preview.html             standalone dev preview
├── preview.tsx
└── preview.css
```

## Render it

```tsx
import { LiveBusTracking } from './features/live-bus-tracking';

<LiveBusTracking />
```

With no `feed` prop it uses the clearly-labelled local demo feed. The header badge reads **Demo tracking** and the note states that positions are simulated. It never claims to be live GPS.

To use it in the student page, the only shared-file change needed is importing and rendering the component (for example below `StudentHome`'s recovery card, or behind a "Track bus" button). That integration is intentionally left to the page owner to avoid editing Person 4's shell.

### Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `feed` | `BusTrackingFeed` | built-in demo feed | Backend adapter; keep the object stable across renders. |
| `className` | `string` | — | Extra class on the root `.lbt` section. |
| `showHeading` | `boolean` | `true` | Set `false` when the host page already renders an `<h2>`. |

## Backend integration

The component only needs two things: geometry once, and location updates pushed in. No backend endpoint is assumed, and no fetch call is hidden inside the component.

### Route payload

```json
{
  "routeId": "ROUTE-C",
  "busId": "BUS-B2",
  "routeName": "Route C · Village C → District College",
  "coordinates": [[77.101, 13.342], [77.1008, 13.34206]],
  "stops": [
    { "id": "S1", "name": "Village C Gate", "latitude": 13.342023, "longitude": 77.101004 }
  ],
  "source": "backend",
  "geometryNote": "OSRM road geometry"
}
```

`coordinates` are GeoJSON order: **`[longitude, latitude]`**, matching OSRM/PostGIS output. Stops use named `latitude`/`longitude` fields. Geometry must be the actual road polyline; the component never draws straight lines between stops.

### Location payload

```json
{
  "busId": "BUS-B2",
  "latitude": 13.311,
  "longitude": 77.091,
  "timestamp": "2026-11-13T09:14:22.000Z",
  "heading": 176,
  "speedKph": 27,
  "progress": 0.42
}
```

`timestamp` must be ISO-8601. `heading`, `speedKph`, and `progress` are optional. When `progress` is absent the component computes the nearest route vertex. Invalid coordinates, out-of-range values, and unparseable timestamps are ignored rather than moving the marker.

### Push adapter example

```tsx
import {
  createManualTrackingFeed,
  LiveBusTracking,
  type BusRoute,
} from './features/live-bus-tracking';

// After fetching the route from the backend:
const route: BusRoute = await fetchRouteForStudent(studentId);
const feed = createManualTrackingFeed(route);

// Existing SSE channel or a WebSocket owned by the integration layer:
const source = new EventSource('/api/tracking/stream');
source.addEventListener('bus:location', (event) => {
  feed.pushLocation(JSON.parse(event.data));
});

return <LiveBusTracking feed={feed} />;
```

`pushLocation` validates and filters by `busId`. Until the first GPS fix arrives the UI shows **Waiting for GPS** and keeps the route and stops visible, with no bus marker. If no fix arrives for 45 seconds the badge changes to **GPS delayed** without hiding the last known position.

The feed interface is intentionally small:

```ts
interface BusTrackingFeed {
  id: string;
  label: string;
  kind: 'live' | 'demo';
  loadRoute(): Promise<BusRoute>;
  subscribe(listener: (location: BusLocation) => void): () => void;
  getInitialLocation?(): BusLocation | null;
}
```

This makes it easy to add a polling or WebSocket adapter later without touching the map component.

## Map stack

The app has no map dependency, and this task forbids package-file changes. Leaflet **1.9.4** is therefore loaded from a pinned CDN (`unpkg`) at runtime, with an SRI-free stylesheet/script pair and a 15-second timeout. If the script or tiles are unavailable, a static SVG route preview is shown instead, clearly labelled as static.

For production, install Leaflet normally:

```bash
npm i leaflet
npm i -D @types/leaflet
```

Then replace the global loader with static imports in `leafletLoader.ts`; the component's props and rendering do not change. Runtime CDN loading is the only reason this feature touches the network outside the app's API.

OpenStreetMap tiles are loaded directly from `tile.openstreetmap.org` and attributed in the map. For a high-traffic deployment, use an OSM tile provider with an appropriate usage policy.

## What the UI does

- Road-following route rendered from geometry, with the **travelled** section in amber and the **remaining/ahead** section in mint.
- All stops drawn on the map with tooltips; endpoints get permanent labels.
- Bus marker moves automatically on every feed update, with heading indicator.
- Next stop card with distance and approximate arrival, ETA to destination, remaining distance, last GPS time, and progress bar.
- Full stop timeline marks passed, next, and upcoming stops.
- Zoom via Leaflet controls and wheel/pinch; pan by dragging; **Follow bus** recentres on updates and turns off automatically when the student drags the map.
- Demo/live/waiting/stale/error states, loading skeleton, and static fallback for a failed map load.
- Keyboard-focusable controls, live announcements for next stop/status, and reduced-motion support.

## Demo data

The pinned route is a real 11.0 km OSRM driving route near Tumakuru, Karnataka (231 vertices), captured once and stored in `demoRoute.ts`. Stop names, stop positions, and bus movement are simulated. The demo feed advances at 10× real time so the marker visibly moves. Route geometry is real; nothing in the demo claims live GPS.

## Preview

With the Vite dev server running:

```text
http://localhost:5174/src/features/live-bus-tracking/preview.html
```

The preview page is a standalone harness, not an app route and not part of the production build.
