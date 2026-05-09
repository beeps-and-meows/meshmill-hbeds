import type { IncomingMessage, ServerResponse } from 'node:http';
import { json, parseQuery, resolveDataset, preflight } from '../_helpers.js';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (preflight(req, res)) return;
  const qs = parseQuery(req.url ?? '');
  const { data } = resolveDataset(req.url ?? '');
  let out = data.monitoring as any[];
  const region = qs.get('region');
  if (region) out = out.filter((m) => m.region?.toLowerCase().includes(region.toLowerCase()));
  json(res, out);
}
