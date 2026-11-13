// events.ts — SSE (Server-Sent Events) endpoint for real-time broadcasts
import { Hono } from 'hono';

export const eventRoutes = new Hono();

type Client = {
  id: string;
  write: (data: string) => void;
};

const clients = new Set<Client>();

export function broadcast(payload: any) {
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
  return new Response(
    new ReadableStream({
      start(controller) {
        const client: Client = {
          id: Math.random().toString(36).substring(7),
          write: (data: string) => {
            controller.enqueue(new TextEncoder().encode(data));
          },
        };

        clients.add(client);

        // Keep-alive ping
        const pingInterval = setInterval(() => {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'));
        }, 15000);

        // Send initial connect payload
        client.write(JSON.stringify({ type: 'connected' }));

        c.req.raw.signal.addEventListener('abort', () => {
          clearInterval(pingInterval);
          clients.delete(client);
        });
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  );
});

