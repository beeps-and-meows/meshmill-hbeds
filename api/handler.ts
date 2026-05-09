import express, { Request, Response } from 'express';
import cors from 'cors';
import { DATASETS } from './_data';

const app = express();
app.use(cors());
app.use(express.json());

type DatasetId = 1 | 2 | 3 | 4;

function resolveDataset(req: Request): { id: DatasetId; data: (typeof DATASETS)[DatasetId] } {
  const raw = parseInt(req.query.dataset as string, 10);
  const id: DatasetId = ([1, 2, 3, 4].includes(raw) ? raw : 1) as DatasetId;
  return { id, data: DATASETS[id] };
}

app.get('/api', (_req: Request, res: Response) => {
  res.json({
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
});

app.get('/api/facilities', (req: Request, res: Response) => {
  const { data } = resolveDataset(req);
  let out = data.facilities as any[];
  if (req.query.region) {
    const r = (req.query.region as string).toLowerCase();
    out = out.filter((f) => f.region?.toLowerCase().includes(r));
  }
  if (req.query.status) {
    out = out.filter((f) => f.status === req.query.status);
  }
  res.json(out);
});

app.get('/api/monitoring/status', (req: Request, res: Response) => {
  const { data } = resolveDataset(req);
  let out = data.monitoring as any[];
  if (req.query.region) {
    const r = (req.query.region as string).toLowerCase();
    out = out.filter((m) => m.region?.toLowerCase().includes(r));
  }
  res.json(out);
});

app.get('/api/reporting/status', (req: Request, res: Response) => {
  const { data } = resolveDataset(req);
  res.json(data.reporting);
});

app.get('/api/support/incidents', (req: Request, res: Response) => {
  const { data } = resolveDataset(req);
  let out = data.incidents as any[];
  if (req.query.severity) {
    out = out.filter((i) => i.severity === req.query.severity);
  }
  res.json(out);
});

app.get('/api/support/sla', (req: Request, res: Response) => {
  const { data } = resolveDataset(req);
  res.json(data.sla);
});

app.get('/api/onboarding/status', (req: Request, res: Response) => {
  const { data } = resolveDataset(req);
  res.json(data.onboarding);
});

app.get('/api/events', (req: Request, res: Response) => {
  const { data } = resolveDataset(req);
  res.json(data.events);
});

app.get('/api/disaster/status', (req: Request, res: Response) => {
  const { data } = resolveDataset(req);
  res.json(data.disasters);
});

app.post('/api/routing/carepath', (req: Request, res: Response) => {
  const body = req.body;
  const required = ['patientType', 'priority', 'requiredEnvironment', 'origin', 'preferredTransportModes'];
  const missing = required.filter((k) => !body[k]);
  if (missing.length) {
    return res.status(400).json({ error: 'Missing required fields', details: missing });
  }
  const { data } = resolveDataset(req);
  const available = (data.facilities as any[]).filter(
    (f) => f.status !== 'offline' && !f.divertStatus && (f.capacity?.trauma_icu?.available ?? 0) > 0,
  );
  if (!available.length) {
    return res.status(400).json({ error: 'No available facilities match this routing request', details: [] });
  }
  const best = available[0];
  res.json({
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
});

app.post('/api/ingest', (req: Request, res: Response) => {
  const body = req.body;
  const required = ['sourceType', 'facilityId', 'vendor'];
  const missing = required.filter((k) => !body[k]);
  if (missing.length) {
    return res.status(400).json({ error: 'Missing required fields', details: missing });
  }
  if (!body.payload && !body.rawText) {
    return res.status(400).json({ error: 'Either payload or rawText is required', details: [] });
  }
  const warnings: string[] = [];
  if (body.sourceType === 'HL7' && body.payload) {
    warnings.push('HL7 payloads should use rawText, not payload');
  }
  res.json({
    accepted: true,
    facilityId: body.facilityId,
    sourceType: body.sourceType,
    normalizedAt: new Date().toISOString(),
    validationWarnings: warnings,
  });
});

export default app;
