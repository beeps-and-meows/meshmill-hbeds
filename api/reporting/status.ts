import type { IncomingMessage, ServerResponse } from 'node:http';
import { json, resolveDataset, preflight } from '../_helpers';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (preflight(req, res)) return;
  const { data } = resolveDataset(req.url ?? '');
  json(res, data.reporting);
}
