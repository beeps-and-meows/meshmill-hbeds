import type { IncomingMessage, ServerResponse } from 'node:http';
import { json, readBody, resolveDataset, preflight } from '../_helpers.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (preflight(req, res)) return;
  const body = await readBody(req);
  const required = ['patientType', 'priority', 'requiredEnvironment', 'origin', 'preferredTransportModes'];
  const missing = required.filter((k) => !body[k]);
  if (missing.length) return json(res, { error: 'Missing required fields', details: missing }, 400);
  const { data } = resolveDataset(req.url ?? '');
  const available = (data.facilities as any[]).filter(
    (f) => f.status !== 'offline' && !f.divertStatus && (f.capacity?.trauma_icu?.available ?? 0) > 0,
  );
  if (!available.length) return json(res, { error: 'No available facilities match this routing request', details: [] }, 400);
  const best = available[0];
  json(res, {
    patientType: body.patientType,
    priority: body.priority,
    recommendedFacility: best.name,
    recommendedFacilityId: best.facilityId,
    requiredEnvironment: body.requiredEnvironment,
    transportMode: (body.preferredTransportModes as string[])[0],
    timeToCareMinutes: 15 + Math.floor(Math.random() * 10),
    reason: `Best available capacity match. Facility status: ${best.status}.`,
    alternateFacilities: available.slice(1, 4).map((f: any) => ({
      facilityId: f.facilityId,
      name: f.name,
      transportMode: (body.preferredTransportModes as string[])[0],
      timeToCareMinutes: 25 + Math.floor(Math.random() * 15),
    })),
  });
}
