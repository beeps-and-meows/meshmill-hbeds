import type { IncomingMessage, ServerResponse } from 'node:http';
import { json, parseQuery, resolveDataset, preflight } from '../_helpers.js';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (preflight(req, res)) return;
  const qs = parseQuery(req.url ?? '');
  const { data } = resolveDataset(req.url ?? '');
  let out = data.incidents as any[];
  const severity = qs.get('severity');
  if (severity) out = out.filter((i) => i.severity === severity);
  json(res, out);
}
