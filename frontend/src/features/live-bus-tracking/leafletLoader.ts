// ============================================================
// Leaflet runtime loader.
//
// The feature is intentionally isolated: Leaflet 1.9.4 is loaded from a pinned
// CDN at runtime so package.json / lockfiles are not touched. For production,
// install `leaflet` and import it here instead — the component API is unchanged.
// ============================================================

export interface LeafletLatLng {
  lat: number;
  lng: number;
}

export interface LeafletBounds {
  pad(padding: number): LeafletBounds;
}

export interface LeafletIcon {
  options?: Record<string, unknown>;
}

export interface LeafletLayer {
  addTo(map: LeafletMap): this;
  remove(): void;
}

export interface LeafletPath extends LeafletLayer {
  setLatLngs(latlngs: [number, number][]): this;
  setStyle(style: Record<string, unknown>): this;
}

export interface LeafletCircleMarker extends LeafletLayer {
  setStyle(style: Record<string, unknown>): this;
  bindTooltip(content: string, options?: Record<string, unknown>): this;
}

export interface LeafletMarker extends LeafletLayer {
  setLatLng(latlng: [number, number]): this;
  getLatLng(): LeafletLatLng;
  setIcon(icon: LeafletIcon): this;
}

export interface LeafletMap {
  setView(
    center: [number, number],
    zoom: number,
    options?: { animate?: boolean; duration?: number },
  ): this;
  fitBounds(
    bounds: LeafletBounds | [number, number][],
    options?: { padding?: [number, number]; animate?: boolean },
  ): this;
  panTo(
    center: [number, number],
    options?: { animate?: boolean; duration?: number },
  ): this;
  getZoom(): number;
  invalidateSize(options?: { animate?: boolean }): void;
  on(event: string, handler: () => void): this;
  off(event: string, handler: () => void): this;
  remove(): void;
}

export interface LeafletNamespace {
  map(element: HTMLElement, options?: Record<string, unknown>): LeafletMap;
  tileLayer(url: string, options?: Record<string, unknown>): LeafletLayer;
  polyline(
    latlngs: [number, number][],
    options?: Record<string, unknown>,
  ): LeafletPath;
  marker(
    latlng: [number, number],
    options?: Record<string, unknown>,
  ): LeafletMarker;
  circleMarker(
    latlng: [number, number],
    options?: Record<string, unknown>,
  ): LeafletCircleMarker;
  divIcon(options: Record<string, unknown>): LeafletIcon;
  latLngBounds(latlngs: [number, number][]): LeafletBounds;
}

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

const LEAFLET_VERSION = '1.9.4';
const LEAFLET_CSS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const LEAFLET_JS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;

let loaderPromise: Promise<LeafletNamespace> | null = null;

function ensureStylesheet() {
  if (document.getElementById('routeless-leaflet-css')) return;
  const link = document.createElement('link');
  link.id = 'routeless-leaflet-css';
  link.rel = 'stylesheet';
  link.href = LEAFLET_CSS;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

export function loadLeaflet(): Promise<LeafletNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Leaflet can only load in the browser.'));
  }
  if (window.L) {
    ensureStylesheet();
    return Promise.resolve(window.L);
  }
  if (loaderPromise) return loaderPromise;

  ensureStylesheet();

  loaderPromise = new Promise<LeafletNamespace>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-routeless-leaflet]',
    );
    let timeout: number | null = null;

    const cleanup = () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      if (timeout !== null) window.clearTimeout(timeout);
    };

    const handleLoad = () => {
      cleanup();
      if (window.L) {
        resolve(window.L);
      } else {
        reject(new Error('Leaflet loaded but the global L object was missing.'));
      }
    };

    const handleError = () => {
      cleanup();
      script.remove();
      reject(new Error('Leaflet could not be loaded from the CDN.'));
    };

    const script = existing ?? document.createElement('script');
    if (!existing) {
      script.src = LEAFLET_JS;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.routelessLeaflet = 'true';
      document.head.appendChild(script);
    }

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    timeout = window.setTimeout(() => {
      cleanup();
      script.remove();
      reject(new Error('Leaflet took too long to load from the CDN.'));
    }, 15_000);
  }).catch((error: unknown) => {
    loaderPromise = null;
    throw error;
  });

  return loaderPromise;
}
