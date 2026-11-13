// useSSE.ts — Hook to listen to backend events
import { useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useSSE(onEvent: (event: any) => void) {
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/api/events`);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(data);
      } catch (err) {
        console.error('SSE JSON parse error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE connection error:', err);
    };

    return () => {
      eventSource.close();
    };
  }, [onEvent]);
}

