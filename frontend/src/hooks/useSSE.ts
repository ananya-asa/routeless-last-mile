// ============================================================
// useSSE.ts — Person 3 real-time student listener.
//
// Backend contract (Person 2): GET /api/events, unnamed `data:` messages.
// Existing one-argument usage is preserved so the coordinator track can reuse it.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { API_BASE } from '../api/client';

export type SseStatus = 'idle' | 'connecting' | 'open' | 'error' | 'unsupported';

export interface UseSseOptions {
  enabled?: boolean;
  retryDelayMs?: number;
}

export interface UseSseResult {
  status: SseStatus;
  lastEvent: unknown;
  error: string | null;
  eventCount: number;
}

export function useSSE(
  onEvent: (event: unknown) => void,
  { enabled = true, retryDelayMs = 5000 }: UseSseOptions = {},
): UseSseResult {
  const [status, setStatus] = useState<SseStatus>('idle');
  const [lastEvent, setLastEvent] = useState<unknown>(null);
  const [eventCount, setEventCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }

    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
      setStatus('unsupported');
      setError('This browser does not support live updates.');
      return;
    }

    let disposed = false;
    let retryTimer: number | null = null;
    let source: EventSource | null = null;

    const connect = () => {
      if (disposed) return;
      setStatus('connecting');
      source = new EventSource(`${API_BASE}/api/events`);

      source.onopen = () => {
        if (disposed) return;
        setStatus('open');
        setError(null);
      };

      source.onmessage = (event) => {
        if (disposed || !event.data) return;
        try {
          const parsed: unknown = JSON.parse(event.data);
          setLastEvent(parsed);
          setEventCount((count) => count + 1);
          onEventRef.current(parsed);
        } catch {
          // Keep-alive comments and malformed frames are ignored.
        }
      };

      source.onerror = () => {
        if (disposed) return;
        source?.close();
        source = null;
        setStatus('error');
        setError('Live updates paused. Reconnecting…');
        retryTimer = window.setTimeout(() => {
          if (!disposed) connect();
        }, retryDelayMs);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      source?.close();
    };
  }, [enabled, retryDelayMs]);

  return { status, lastEvent, error, eventCount };
}
