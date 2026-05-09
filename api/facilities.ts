import type { IncomingMessage, ServerResponse } from 'node:http';
import { json, parseQuery, resolveDataset, preflight } from './_helpers.js';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (preflight(req, res)) return;
  const qs = parseQuery(req.url ?? '');
  const { data } = resolveDataset(req.url ?? '');
  let out = data.facilities as any[];
  const region = qs.get('region');
  const status = qs.get('status');
  if (region) out = out.filter((f) => f.region?.toLowerCase().includes(region.toLowerCase()));
  if (status) out = out.filter((f) => f.status === status);
  json(res, out);
}
