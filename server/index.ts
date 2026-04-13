import express, { Request, Response } from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { join } from 'path';

const app = express();
app.use(cors());
app.use(express.json());

// ── Dataset paths ─────────────────────────────────────────────────────────────
const DATA_DIR = 'D:/HBED Data/unpacked';

function loadJson(rel: string) {
  return JSON.parse(readFileSync(join(DATA_DIR, rel), 'utf-8'));
}

const DATASETS = {
  1: loadJson('meshmill_test_set_1_small_internal/meshmill_test_set_1_small_internal.json'),
  2: loadJson('meshmill_test_set_2_scale_internal_package/meshmill_test_set_2_scale_internal.json'),
  3: loadJson('meshmill_emergency_synthetic_dataset_package/synthetic_dataset.json'),
  4: loadJson('meshmill_test_set_4_full_stress_package/meshmill_test_set_4_full_stress.json'),
} as const;

type DatasetId = 1 | 2 | 3 | 4;

function resolveDataset(req: Request): { id: DatasetId; data: any } {
  const raw = parseInt(req.query.dataset as string, 10);
  const id: DatasetId = ([1, 2, 3, 4].includes(raw) ? raw : 1) as DatasetId;
  return { id, data: DATASETS[id] };
}

// ── Format detection ──────────────────────────────────────────────────────────
// Sets 1 / 2 / 4 → flat camelCase  { facilityId, region, status, onboarding, … }
// Set  3          → nested snake_case { facility: { facility_id … }, capability, … }
function isFlat(dataset: any): boolean {
  return typeof dataset.facilities?.[0]?.facilityId === 'string';
}

// ── Shared capacity normalizer ────────────────────────────────────────────────
// Accepts both flat { trauma_icu: { staffed, available } } and Set-3 inner objects
// (which also contain `total`).  Outputs { staffed, available } per bucket.
function normalizeCapacity(raw: any) {
  if (!raw) return undefined;
  const KEYS = [
    'trauma_icu',
    'medical_beds',
    'psych_safe_rooms',
    'pediatric_icu',
    'toxicology_ed_slots',
  ] as const;
  const out: Record<string, { staffed: number; available: number }> = {};
  for (const k of KEYS) {
    if (raw[k]) out[k] = { staffed: raw[k].staffed, available: raw[k].available };
  }
  return Object.keys(out).length ? out : undefined;
}

// ── CanonicalFacility ─────────────────────────────────────────────────────────
function toFacility(f: any, flat: boolean) {
  if (flat) {
    return {
      facilityId: f.facilityId,
      name: f.name ?? f.facilityId,
      region: f.region,
      vendor: f.onboarding?.connectorType ?? null,
      status: f.status,
      lastUpdate: f.onboarding?.goLiveDate ?? new Date().toISOString(),
      divertStatus:
        f.status === 'offline' || f.monitoring?.heartbeatStatus === 'missing',
      surgeMode: f.status === 'degraded' || f.status === 'offline',
      capacity: normalizeCapacity(f.capacity),
    };
  }

  const fac = f.facility;
  const cap = f.capacity;
  const capa = f.capability?.capabilities;
  const trans = f.transportAccess?.transport_access;

  return {
    facilityId: fac.facility_id,
    name: fac.name,
    region: fac.region_id,
    vendor: f.onboardingProfile?.vendor_template ?? null,
    status: fac.status,
    lastUpdate: fac.last_update_at,
    divertStatus: cap?.divert_status ?? false,
    surgeMode: cap?.surge_mode ?? false,
    capacity: normalizeCapacity(cap?.capacity),   // inner .capacity object
    capabilities: capa
      ? {
          traumaLevel: capa.trauma_level ?? null,
          strokeCenter: capa.stroke_center ?? false,
          cardiacCenter: capa.cardiac_center ?? false,
          burnCenter: capa.burn_center ?? false,
          ecmo: capa.ecmo ?? false,
          isolation: capa.isolation_rooms ?? false,
          toxicology: capa.toxicology_capable ?? false,
          psychSafe: capa.psych_safe_environment ?? false,
          nicu: capa.nicu ?? false,
          pediatricIcu: capa.pediatric_icu ?? false,
        }
      : undefined,
    transport: trans
      ? {
          ambulance: trans.ambulance_access ?? false,
          helicopter: trans.helicopter_transfer ?? false,
          fixedWing: trans.fixed_wing_transfer_hub ?? false,
          roadAccessStatus: trans.road_access_status ?? 'unknown',
        }
      : undefined,
    location:
      fac.location ? { lat: fac.location.lat, lng: fac.location.lng } : undefined,
  };
}

// ── MonitoringStatus ──────────────────────────────────────────────────────────
function toMonitoring(f: any, flat: boolean) {
  if (flat) {
    if (!f.monitoring) return null;
    return {
      facilityId: f.facilityId,
      facility: f.name ?? f.facilityId,
      region: f.region,
      vendor: f.onboarding?.connectorType ?? 'Unknown',
      lastHeartbeatAt: new Date().toISOString(),
      heartbeatStatus: f.monitoring.heartbeatStatus,
      feedLatencyMs: f.monitoring.latencyMs ?? undefined,
      retryCount: f.monitoring.retryCount ?? 0,
      connectionMethod: 'Fiber',
    };
  }

  const m = f.monitoring;
  if (!m) return null;
  return {
    facilityId: m.facility_id,
    facility: f.facility.name,
    region: f.facility.region_id,
    vendor: f.onboardingProfile?.vendor_template ?? 'Unknown',
    lastHeartbeatAt: m.last_heartbeat_at,
    heartbeatStatus: m.heartbeat_status,
    feedLatencyMs: m.feed_latency_ms,
    retryCount: m.retry_count,
    connectionMethod: m.connection_method,
  };
}

// ── ReportingStatus ───────────────────────────────────────────────────────────
function toReporting(f: any, flat: boolean) {
  if (flat) {
    if (!f.reporting) return null;
    const status = f.reporting.status;
    return {
      facilityId: f.facilityId,
      lastSubmission: new Date().toISOString(),
      status,
      latencySeconds: f.reporting.latencySeconds ?? undefined,
      validationStatus:
        status === 'success' ? 'passed' : status === 'pending' ? 'pending' : 'failed',
    };
  }

  const r = f.reportingStatus;
  if (!r) return null;
  return {
    facilityId: r.facility_id,
    lastSubmission: r.last_submission_at,
    status: r.status,
    latencySeconds: r.latency_seconds,
    validationStatus: r.validation_status,
  };
}

// ── SupportIncident ───────────────────────────────────────────────────────────
function toIncident(f: any, flat: boolean) {
  if (flat) {
    if (!f.support) return null;
    return {
      incidentId: f.support.incidentId,
      facilityId: f.facilityId,
      severity: f.support.severity,
      status: f.support.status,
      createdAt: new Date(Date.now() - 3_600_000).toISOString(),
      resolvedAt: f.support.status === 'resolved' ? new Date().toISOString() : null,
      slaHours: f.support.slaHours,
      description: `Incident at ${f.name ?? f.facilityId}`,
    };
  }

  const inc = f.supportIncident;
  if (!inc) return null;
  return {
    incidentId: inc.incident_id,
    facilityId: inc.facility_id,
    severity: inc.severity,
    status: inc.status,
    createdAt: inc.created_at,
    resolvedAt: inc.resolved_at || null,
    slaHours: inc.sla_hours,
    description: inc.description,
  };
}

// ── SlaStatus ─────────────────────────────────────────────────────────────────
function toSla(f: any, flat: boolean) {
  if (flat) {
    if (!f.support) return null;
    const target = f.support.slaHours;
    const ratio = f.support.status === 'open' ? 0.3 : 0.7;
    return {
      facilityId: f.facilityId,
      slaTargetHours: target,
      responseTimeHours: Math.round(target * ratio * 10) / 10,
      breach: f.support.status === 'open' && target <= 2,
    };
  }

  const s = f.slaStatus;
  if (!s) return null;
  return {
    facilityId: s.facility_id,
    slaTargetHours: s.sla_target_hours,
    responseTimeHours: s.current_response_time_hours,
    breach: s.breach,
  };
}

// ── OnboardingStatus ──────────────────────────────────────────────────────────
function toOnboarding(f: any, flat: boolean) {
  if (flat) {
    if (!f.onboarding) return null;
    return {
      facilityId: f.facilityId,
      state: f.onboarding.status,
      validationStatus: f.onboarding.validationStatus,
      cohort: f.onboarding.cohort,
      connectorType: f.onboarding.connectorType,
      lastHeartbeatAt: f.onboarding.goLiveDate ?? new Date().toISOString(),
    };
  }

  const o = f.onboardingProfile;
  if (!o) return null;
  return {
    facilityId: o.facility_id,
    state: o.onboarding_state,
    validationStatus: o.validation_status,
    cohort: null,
    connectorType: o.connector_type,
    lastHeartbeatAt: o.last_heartbeat_at,
  };
}

// ── Collection projectors ─────────────────────────────────────────────────────
function allFacilities(data: any) {
  const flat = isFlat(data);
  return (data.facilities ?? []).map((f: any) => toFacility(f, flat));
}

function allMonitoring(data: any) {
  const flat = isFlat(data);
  return (data.facilities ?? [])
    .map((f: any) => toMonitoring(f, flat))
    .filter(Boolean);
}

function allReporting(data: any) {
  const flat = isFlat(data);
  return (data.facilities ?? [])
    .map((f: any) => toReporting(f, flat))
    .filter(Boolean);
}

function allIncidents(data: any) {
  const flat = isFlat(data);
  return (data.facilities ?? [])
    .map((f: any) => toIncident(f, flat))
    .filter(Boolean);
}

function allSla(data: any) {
  const flat = isFlat(data);
  return (data.facilities ?? []).map((f: any) => toSla(f, flat)).filter(Boolean);
}

function allOnboarding(data: any) {
  const flat = isFlat(data);
  return (data.facilities ?? [])
    .map((f: any) => toOnboarding(f, flat))
    .filter(Boolean);
}

// ── Events ────────────────────────────────────────────────────────────────────
// Set 3 has a real event stream.  Sets 1/2/4 synthesize events from facility state.
function allEvents(data: any, id: DatasetId) {
  if (id === 3) {
    return (data.events ?? []).map((e: any) => ({
      eventId: e.event_id,
      eventType: e.event_type,
      facilityId: e.facility_id ?? null,
      timestamp: e.timestamp,
      message: e.message,
    }));
  }

  const flat = isFlat(data);
  const now = new Date().toISOString();
  let seq = 1;
  const events: any[] = [];

  for (const f of data.facilities ?? []) {
    const fid = flat ? f.facilityId : f.facility?.facility_id;
    const hb = flat ? f.monitoring?.heartbeatStatus : f.monitoring?.heartbeat_status;
    const rep = flat ? f.reporting?.status : f.reportingStatus?.status;

    if (hb === 'missing') {
      events.push({
        eventId: `EVT_${seq++}`,
        eventType: 'heartbeat_missing',
        facilityId: fid,
        timestamp: now,
        message: `Heartbeat missing for ${fid}.`,
      });
    } else if (hb === 'delayed') {
      events.push({
        eventId: `EVT_${seq++}`,
        eventType: 'feed_retry',
        facilityId: fid,
        timestamp: now,
        message: `Feed retry triggered for ${fid}.`,
      });
    }

    if (rep === 'failed') {
      events.push({
        eventId: `EVT_${seq++}`,
        eventType: 'reporting_failure',
        facilityId: fid,
        timestamp: now,
        message: `Reporting failure detected for ${fid}.`,
      });
    }

    // Set 4 per-facility disaster
    if (flat && f.disaster?.affected) {
      events.push({
        eventId: `EVT_${seq++}`,
        eventType: `${f.disaster.hazardType}_alert`,
        facilityId: fid,
        timestamp: now,
        message: `${f.disaster.hazardType} impact at ${fid} (severity: ${f.disaster.severity}).`,
      });
    }
  }

  return events;
}

// ── DisasterStatus ────────────────────────────────────────────────────────────
// Set 3: top-level disasterStatus array.
// Set 4: per-facility disaster objects → aggregated by hazardType+severity.
// Sets 1/2: no disaster data.
function allDisasters(data: any, id: DatasetId) {
  if (id === 3) {
    return (data.disasterStatus ?? []).map((d: any) => ({
      scenarioId: d.scenario_id,
      hazardType: d.hazard_type,
      severity: d.severity,
      affectedRegions: d.affected_regions,
      startedAt: d.started_at,
    }));
  }

  if (id !== 4) return [];

  const index = new Map<string, any>();
  let seq = 1;

  for (const f of data.facilities ?? []) {
    const d = f.disaster;
    if (!d?.affected) continue;
    const key = `${d.hazardType}::${d.severity}`;

    if (!index.has(key)) {
      index.set(key, {
        scenarioId: `DIS_SYN_${seq++}`,
        hazardType: d.hazardType,
        severity: d.severity,
        affectedRegions: [f.region],
        startedAt: new Date().toISOString(),
      });
    } else {
      const existing = index.get(key)!;
      if (!existing.affectedRegions.includes(f.region)) {
        existing.affectedRegions.push(f.region);
      }
    }
  }

  return [...index.values()];
}

// ── Routing ───────────────────────────────────────────────────────────────────
// Set 3: uses pre-computed routingDecisions matched by patientType.
// All sets: fallback picks the first available facility with capacity.
function computeRoute(body: any, data: any, id: DatasetId) {
  if (id === 3) {
    const matchingCase = (data.patientCases ?? []).find(
      (c: any) => c.patient_type === body.patientType,
    );
    if (matchingCase) {
      const decision = (data.routingDecisions ?? []).find(
        (d: any) => d.case_id === matchingCase.case_id,
      );
      if (decision) {
        const alts = (decision.alternate_facility_ids ?? []).map((altId: string) => {
          const entry = (data.facilities ?? []).find(
            (f: any) => f.facility?.facility_id === altId,
          );
          return {
            facilityId: altId,
            name: entry?.facility?.name ?? altId,
            transportMode: body.preferredTransportModes[0],
            timeToCareMinutes: decision.time_to_care_minutes + 8,
          };
        });
        return {
          patientType: body.patientType,
          priority: body.priority,
          recommendedFacility: decision.destination_name,
          recommendedFacilityId: decision.recommended_facility_id,
          requiredEnvironment: body.requiredEnvironment,
          transportMode: decision.transport_mode,
          timeToCareMinutes: decision.time_to_care_minutes,
          reason: decision.reason,
          alternateFacilities: alts,
        };
      }
    }
  }

  // Fallback: find first available facility with matching capacity
  const flat = isFlat(data);
  const capKey = body.requiredEnvironment as string;
  const candidates = (data.facilities ?? [])
    .map((f: any) => toFacility(f, flat))
    .filter((f: any) => {
      if (f.status === 'offline') return false;
      if (f.divertStatus) return false;
      const bucket = f.capacity?.[capKey];
      return !bucket || bucket.available > 0;
    });

  if (!candidates.length) return null;

  const best = candidates[0];
  const alts = candidates.slice(1, 4).map((f: any) => ({
    facilityId: f.facilityId,
    name: f.name,
    transportMode: body.preferredTransportModes[0],
    timeToCareMinutes: 25 + Math.floor(Math.random() * 15),
  }));

  return {
    patientType: body.patientType,
    priority: body.priority,
    recommendedFacility: best.name,
    recommendedFacilityId: best.facilityId,
    requiredEnvironment: body.requiredEnvironment,
    transportMode: body.preferredTransportModes[0],
    timeToCareMinutes: 15 + Math.floor(Math.random() * 10),
    reason: `Best available ${capKey} match. Facility status: ${best.status}.`,
    alternateFacilities: alts,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'MeshMill M.A.R.I.O. Demo API',
    version: '1.1.0',
    datasets: {
      1: 'Small Scale / Internal Stress — 10 facilities',
      2: 'Large Scale / Internal Stress — 7 sample facilities (pattern-expandable to 500)',
      3: 'Emergency / External Stress — hospitals + ACS (wildfire, earthquake, flood)',
      4: 'Full Integrated Stress — combined internal + external (4 sample facilities)',
    },
    usage: 'Append ?dataset=1|2|3|4 to any GET endpoint. Default: dataset=1.',
    endpoints: [
      'GET  /facilities',
      'GET  /monitoring/status',
      'GET  /reporting/status',
      'POST /routing/carepath',
      'GET  /support/incidents',
      'GET  /support/sla',
      'GET  /onboarding/status',
      'GET  /events',
      'GET  /disaster/status',
      'POST /ingest',
    ],
  });
});

app.get('/facilities', (req: Request, res: Response) => {
  const { data } = resolveDataset(req);
  let out = allFacilities(data);
  if (req.query.region) {
    const r = (req.query.region as string).toLowerCase();
    out = out.filter((f: any) => f.region?.toLowerCase().includes(r));
  }
  if (req.query.status) {
    out = out.filter((f: any) => f.status === req.query.status);
  }
  res.json(out);
});

app.get('/monitoring/status', (req: Request, res: Response) => {
  const { data } = resolveDataset(req);
  let out = allMonitoring(data);
  if (req.query.region) {
    const r = (req.query.region as string).toLowerCase();
    out = out.filter((m: any) => m.region?.toLowerCase().includes(r));
  }
  res.json(out);
});

app.get('/reporting/status', (req: Request, res: Response) => {
  const { data } = resolveDataset(req);
  let out = allReporting(data);
  if (req.query.region) {
    const r = (req.query.region as string).toLowerCase();
    out = out.filter((rep: any) => rep.region?.toLowerCase().includes(r));
  }
  res.json(out);
});

app.get('/support/incidents', (req: Request, res: Response) => {
  const { data } = resolveDataset(req);
  let out = allIncidents(data);
  if (req.query.severity) {
    out = out.filter((i: any) => i.severity === req.query.severity);
  }
  res.json(out);
});

app.get('/support/sla', (req: Request, res: Response) => {
  const { data } = resolveDataset(req);
  res.json(allSla(data));
});

app.get('/onboarding/status', (req: Request, res: Response) => {
  const { data } = resolveDataset(req);
  res.json(allOnboarding(data));
});

app.get('/events', (req: Request, res: Response) => {
  const { id, data } = resolveDataset(req);
  res.json(allEvents(data, id));
});

app.get('/disaster/status', (req: Request, res: Response) => {
  const { id, data } = resolveDataset(req);
  res.json(allDisasters(data, id));
});

app.post('/routing/carepath', (req: Request, res: Response) => {
  const body = req.body;
  const required = ['patientType', 'priority', 'requiredEnvironment', 'origin', 'preferredTransportModes'];
  const missing = required.filter((k) => !body[k]);
  if (missing.length) {
    return res.status(400).json({ error: 'Missing required fields', details: missing });
  }
  const { id, data } = resolveDataset(req);
  const result = computeRoute(body, data, id);
  if (!result) {
    return res.status(400).json({
      error: 'No available facilities match this routing request',
      details: [`requiredEnvironment: ${body.requiredEnvironment}`],
    });
  }
  res.json(result);
});

app.post('/ingest', (req: Request, res: Response) => {
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

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = 8000;
app.listen(PORT, () => {
  console.log('\nMeshMill M.A.R.I.O. Demo API');
  console.log(`Running at http://localhost:${PORT}`);
  console.log('\nDatasets:');
  console.log('  ?dataset=1  Small internal stress        (10 facilities)');
  console.log('  ?dataset=2  Scale internal stress        (7 samples, ~500 via expansion)');
  console.log('  ?dataset=3  Emergency external stress    (hospitals + ACS)');
  console.log('  ?dataset=4  Full integrated stress       (4 samples, combined)');
  console.log('\nDefault: dataset=1\n');
});
