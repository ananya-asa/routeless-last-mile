import type { BusLocation, BusRoute } from './types';
import { nearestCoordinateIndex } from './geo';

interface StaticRouteFallbackProps {
  route: BusRoute;
  location: BusLocation | null;
}

const WIDTH = 640;
const HEIGHT = 300;
const PAD = 28;

/**
 * Shown only when Leaflet or the map tiles cannot load. It is deliberately
 * labelled as a static preview — never presented as an interactive live map.
 */
export function StaticRouteFallback({
  route,
  location,
}: StaticRouteFallbackProps) {
  const lons = route.coordinates.map(([lon]) => lon);
  const lats = route.coordinates.map(([, lat]) => lat);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const spanLon = maxLon - minLon || 1;
  const spanLat = maxLat - minLat || 1;

  const project = (lon: number, lat: number): [number, number] => [
    PAD + ((lon - minLon) / spanLon) * (WIDTH - PAD * 2),
    PAD + (1 - (lat - minLat) / spanLat) * (HEIGHT - PAD * 2),
  ];

  const points = route.coordinates.map(([lon, lat]) =>
    project(lon, lat).map((value) => value.toFixed(1)).join(','),
  );
  const path = `M${points.join(' L')}`;

  const currentIndex = location
    ? nearestCoordinateIndex(
        location.latitude,
        location.longitude,
        route.coordinates,
      )
    : 0;
  const travelled = points.slice(0, currentIndex + 1);
  const travelledPath = travelled.length
    ? `M${travelled.join(' L')}`
    : '';

  const busPoint = location
    ? project(location.longitude, location.latitude)
    : project(route.coordinates[0][0], route.coordinates[0][1]);

  return (
    <svg
      className="lbt__fallback"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Static preview of ${route.routeName}. The interactive map is unavailable.`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="lbt-fallback-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9e3d3" />
          <stop offset="1" stopColor="#dcd5c2" />
        </linearGradient>
        <pattern
          id="lbt-fallback-grid"
          width="34"
          height="34"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M34 0H0V34"
            fill="none"
            stroke="rgba(10,38,32,0.09)"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <rect width={WIDTH} height={HEIGHT} fill="url(#lbt-fallback-bg)" />
      <rect width={WIDTH} height={HEIGHT} fill="url(#lbt-fallback-grid)" />
      <path
        d={`${path} L${WIDTH - PAD},${HEIGHT - PAD} L${PAD},${HEIGHT - PAD} Z`}
        fill="rgba(27,156,122,0.06)"
      />

      <path
        d={path}
        fill="none"
        stroke="#fffcf5"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={path}
        fill="none"
        stroke="#0f6b57"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
      {travelledPath ? (
        <path
          d={travelledPath}
          fill="none"
          stroke="#f4b942"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {route.stops.map((stop, index) => {
        const [x, y] = project(stop.longitude, stop.latitude);
        const isEnd = index === route.stops.length - 1;
        const isStart = index === 0;
        return (
          <g key={stop.id}>
            <circle
              cx={x}
              cy={y}
              r={isStart || isEnd ? 7 : 5}
              fill={isStart || isEnd ? '#0a2620' : '#fffcf5'}
              stroke={isStart || isEnd ? '#fffcf5' : '#0a2620'}
              strokeWidth="2.5"
            />
            {isStart || isEnd ? (
              <text
                x={x + (isEnd ? -10 : 10)}
                y={y + (isEnd ? 24 : -14)}
                textAnchor={isEnd ? 'end' : 'start'}
                fill="#0a2620"
                fontSize="10"
                fontWeight="700"
                fontFamily="Segoe UI, sans-serif"
              >
                {stop.name}
              </text>
            ) : null}
          </g>
        );
      })}

      <g transform={`translate(${busPoint[0]} ${busPoint[1]})`}>
        <circle r="15" fill="#fffcf5" opacity="0.9" />
        <circle r="11" fill="#0a2620" />
        <rect x="-5" y="-5" width="10" height="11" rx="2" fill="#f4b942" />
        <circle cx="-3" cy="7" r="1.6" fill="#f4b942" />
        <circle cx="3" cy="7" r="1.6" fill="#f4b942" />
      </g>
    </svg>
  );
}
