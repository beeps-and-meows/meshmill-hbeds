import type { IncomingMessage, ServerResponse } from 'node:http';
import { json, readBody, preflight } from './_helpers';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (preflight(req, res)) return;
  const body = await readBody(req);
  const required = ['sourceType', 'facilityId', 'vendor'];
  const missing = required.filter((k) => !body[k]);
  if (missing.length) return json(res, { error: 'Missing required fields', details: missing }, 400);
  if (!body.payload && !body.rawText) return json(res, { error: 'Either payload or rawText is required', details: [] }, 400);
  const warnings: string[] = [];
  if (body.sourceType === 'HL7' && body.payload) warnings.push('HL7 payloads should use rawText, not payload');
  json(res, {
    accepted: true,
    facilityId: body.facilityId,
    sourceType: body.sourceType,
    normalizedAt: new Date().toISOString(),
    validationWarnings: warnings,
  });
}
