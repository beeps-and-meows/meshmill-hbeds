import type { IncomingMessage, ServerResponse } from 'node:http';
import { DATASETS } from './_data.js';

type DatasetId = 1 | 2 | 3 | 4;

export function setCors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export function json(res: ServerResponse, data: unknown, status = 200): void {
  setCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function parseQuery(url: string): URLSearchParams {
  const i = url.indexOf('?');
  return new URLSearchParams(i >= 0 ? url.slice(i + 1) : '');
}

export function resolveDataset(url: string): { id: DatasetId; data: (typeof DATASETS)[DatasetId] } {
  const qs = parseQuery(url);
  const raw = parseInt(qs.get('dataset') ?? '', 10);
  const id = ([1, 2, 3, 4].includes(raw) ? raw : 1) as DatasetId;
  return { id, data: DATASETS[id] };
}

export async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}') as Record<string, unknown>); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

export function preflight(req: IncomingMessage, res: ServerResponse): boolean {
  setCors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return true; }
  return false;
}
