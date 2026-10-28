import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import * as http from 'node:http';
import { createServer } from '../../src/server/app.js';

describe('Server & API Integration', () => {
  let server: http.Server;
  let baseUrl = '';

  beforeAll(async () => {
    server = createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr) {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET / serves the dashboard HTML', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('ShipGuard');
    expect(html).toContain('Know your release is ready before you ship');
  });

  it('GET /api/v1/health returns ok status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.status).toBe(200);
    const data = await res.json() as { status: string };
    expect(data.status).toBe('ok');
  });

  it('GET /api/v1/analyzers lists all registered analyzers', async () => {
    const res = await fetch(`${baseUrl}/api/v1/analyzers`);
    expect(res.status).toBe(200);
    const data = await res.json() as Array<{ id: string }>;
    expect(data.length).toBeGreaterThanOrEqual(9);
    expect(data.some(a => a.id === 'security')).toBe(true);
  });
});
