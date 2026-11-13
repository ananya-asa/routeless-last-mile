// ============================================================
// events.ts — SSE endpoint for real-time coordinator updates.
// Every message must be framed as `data: ...\n\n` for EventSource.
// ============================================================

import { Hono } from 'hono';
import { DEMO_NOW_MIN } from './recoveryData.js';

export const eventRoutes = new Hono();

type Client = {
  id: string;
  write: (data: string) => void;
};

const clients = new Set<Client>();
const encoder = new TextEncoder();

export function broadcast(payload: unknown) {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch {
      clients.delete(client);
    }
  }
}

eventRoutes.get('/', (c) => {
  let pingInterval: ReturnType<typeof setInterval> | undefined;
  let client: Client | undefined;

  const cleanup = () => {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = undefined;
    }
    if (client) {
      clients.delete(client);
      client = undefined;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          cleanup();
        }
      };

      client = {
        id: Math.random().toString(36).slice(2),
        write,
      };
      clients.add(client);

      // Ask EventSource to reconnect after 3s if the connection drops.
      write('retry: 3000\n\n');
      write(
        `data: ${JSON.stringify({ type: 'connected', atMin: DEMO_NOW_MIN })}\n\n`,
      );

      // Keep-alive comment every 15s so proxies do not close the stream.
      pingInterval = setInterval(() => write(': ping\n\n'), 15_000);

      const signal = c.req.raw.signal;
      if (signal) {
        signal.addEventListener('abort', cleanup, { once: true });
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});
