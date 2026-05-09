import type { IncomingMessage, ServerResponse } from 'node:http';
import { DATASETS } from './_data';

type DatasetId = 1 | 2 | 3 | 4;

function setCors(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res: ServerResponse, data: unknown, status = 200) {
  setCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseQuery(url: string): URLSearchParams {
  const i = url.indexOf('?');
  return new URLSearchParams(i >= 0 ? url.slice(i + 1) : '');
}

function resolveDataset(qs: URLSearchParams): { id: DatasetId; data: (typeof DATASETS)[DatasetId] } {
  const raw = parseInt(qs.get('dataset') ?? '', 10);
  const id = ([1, 2, 3, 4].includes(raw) ? raw : 1) as DatasetId;
  return { id, data: DATASETS[id] };
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const rawUrl = req.url ?? '/api';
  const path = rawUrl.split('?')[0];
  const qs = parseQuery(rawUrl);
  const { data } = resolveDataset(qs);
  const method = req.method ?? 'GET';

  if (method === 'GET') {
    if (path === '/api' || path === '/api/') {
      return json(res, {
        service: 'MeshMill M.A.R.I.O. Demo API',
        version: '1.1.0',
        note: 'Vercel serverless deployment — datasets bundled inline.',
        datasets: {
          1: 'Small Scale / Normal Operations — 10 California facilities',
          2: 'Scale Internal Stress — 7 facilities, mixed degraded/offline states',
          3: 'Emergency Scenarios — wildfire, earthquake, flood with ACS activation',
          4: 'Full Integrated Stress — disaster mode, SLA breaches, critical capacity',
        },
        usage: 'Append ?dataset=1|2|3|4 to any GET endpoint. Default: dataset=1.',
      });
    }

    if (path === '/api/facilities') {
      let out = data.facilities as any[];
      const region = qs.get('region');
      const status = qs.get('status');
      if (region) out = out.filter((f) => f.region?.toLowerCase().includes(region.toLowerCase()));
      if (status) out = out.filter((f) => f.status === status);
      return json(res, out);
    }

    if (path === '/api/monitoring/status') {
      let out = data.monitoring as any[];
      const region = qs.get('region');
      if (region) out = out.filter((m) => m.region?.toLowerCase().includes(region.toLowerCase()));
      return json(res, out);
    }

    if (path === '/api/reporting/status') return json(res, data.reporting);

    if (path === '/api/support/incidents') {
      let out = data.incidents as any[];
      const severity = qs.get('severity');
      if (severity) out = out.filter((i) => i.severity === severity);
      return json(res, out);
    }

    if (path === '/api/support/sla') return json(res, data.sla);
    if (path === '/api/onboarding/status') return json(res, data.onboarding);
    if (path === '/api/events') return json(res, data.events);
    if (path === '/api/disaster/status') return json(res, data.disasters);
  }

  if (method === 'POST') {
    const body = (await readBody(req)) as any;

    if (path === '/api/routing/carepath') {
      const required = ['patientType', 'priority', 'requiredEnvironment', 'origin', 'preferredTransportModes'];
      const missing = required.filter((k) => !body[k]);
      if (missing.length) return json(res, { error: 'Missing required fields', details: missing }, 400);
      const available = (data.facilities as any[]).filter(
        (f) => f.status !== 'offline' && !f.divertStatus && (f.capacity?.trauma_icu?.available ?? 0) > 0,
      );
      if (!available.length) return json(res, { error: 'No available facilities match this routing request', details: [] }, 400);
      const best = available[0];
      return json(res, {
        patientType: body.patientType,
        priority: body.priority,
        recommendedFacility: best.name,
        recommendedFacilityId: best.facilityId,
        requiredEnvironment: body.requiredEnvironment,
        transportMode: body.preferredTransportModes[0],
        timeToCareMinutes: 15 + Math.floor(Math.random() * 10),
        reason: `Best available capacity match. Facility status: ${best.status}.`,
        alternateFacilities: available.slice(1, 4).map((f: any) => ({
          facilityId: f.facilityId,
          name: f.name,
          transportMode: body.preferredTransportModes[0],
          timeToCareMinutes: 25 + Math.floor(Math.random() * 15),
        })),
      });
    }

    if (path === '/api/ingest') {
      const required = ['sourceType', 'facilityId', 'vendor'];
      const missing = required.filter((k) => !body[k]);
      if (missing.length) return json(res, { error: 'Missing required fields', details: missing }, 400);
      if (!body.payload && !body.rawText) return json(res, { error: 'Either payload or rawText is required', details: [] }, 400);
      const warnings: string[] = [];
      if (body.sourceType === 'HL7' && body.payload) warnings.push('HL7 payloads should use rawText, not payload');
      return json(res, {
        accepted: true,
        facilityId: body.facilityId,
        sourceType: body.sourceType,
        normalizedAt: new Date().toISOString(),
        validationWarnings: warnings,
      });
    }
  }

  json(res, { error: 'Not found' }, 404);
}
