// In production (Vercel) API routes live at /api — same origin, no CORS needed.
// Locally the Express server runs on port 8000.
export const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:8000';

// ── Canonical types (match OpenAPI contract) ──────────────────────────────────

export interface CanonicalFacility {
  facilityId: string;
  name: string;
  region: string;
  vendor: string | null;
  status: 'pending' | 'syncing' | 'active' | 'degraded' | 'offline';
  lastUpdate: string;
  divertStatus: boolean;
  surgeMode: boolean;
  capacity?: Record<string, { staffed: number; available: number }>;
  capabilities?: {
    traumaLevel: string | null;
    strokeCenter: boolean;
    cardiacCenter: boolean;
    burnCenter: boolean;
    ecmo: boolean;
    isolation: boolean;
    toxicology: boolean;
    psychSafe: boolean;
    nicu: boolean;
    pediatricIcu: boolean;
  };
  transport?: {
    ambulance: boolean;
    helicopter: boolean;
    fixedWing: boolean;
    roadAccessStatus: string;
  };
  location?: { lat: number; lng: number };
}

export interface MonitoringStatus {
  facilityId: string;
  facility: string;
  region: string;
  vendor: string;
  lastHeartbeatAt: string;
  heartbeatStatus: 'healthy' | 'delayed' | 'missing';
  feedLatencyMs?: number;
  retryCount?: number;
  connectionMethod?: string;
}

export interface ReportingStatus {
  facilityId: string;
  lastSubmission: string;
  status: 'success' | 'delayed' | 'failed';
  latencySeconds?: number;
  validationStatus?: 'pending' | 'passed' | 'failed';
}

export interface SupportIncident {
  incidentId: string;
  facilityId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  resolvedAt: string | null;
  slaHours: number;
  description?: string;
}

export interface SlaStatus {
  facilityId: string;
  slaTargetHours: number;
  responseTimeHours: number;
  breach: boolean;
}

export interface OnboardingStatus {
  facilityId: string;
  state: 'pending' | 'active' | 'validated' | 'failed';
  validationStatus: 'pending' | 'passed' | 'failed';
  cohort?: string | null;
  connectorType?: string;
  lastHeartbeatAt?: string;
}

export interface ApiEvent {
  eventId: string;
  eventType: string;
  facilityId: string | null;
  timestamp: string;
  message: string;
}

export interface DisasterStatus {
  scenarioId: string;
  hazardType: string;
  severity: 'monitoring' | 'advisory' | 'warning' | 'critical';
  affectedRegions: string[];
  startedAt: string;
}

export interface ApiData {
  facilities: CanonicalFacility[];
  monitoring: MonitoringStatus[];
  reporting: ReportingStatus[];
  incidents: SupportIncident[];
  sla: SlaStatus[];
  onboarding: OnboardingStatus[];
  events: ApiEvent[];
  disasters: DisasterStatus[];
}

// ── Merged row type used by the facility table ────────────────────────────────

export interface FacilityRow {
  facilityId: string;
  name: string;
  region: string;
  status: CanonicalFacility['status'];
  divertStatus: boolean;
  surgeMode: boolean;
  heartbeatStatus?: MonitoringStatus['heartbeatStatus'];
  feedLatencyMs?: number;
  retryCount?: number;
  connectionMethod?: string;
  lastHeartbeatAt?: string;
  reportingStatus?: ReportingStatus['status'];
  reportingLatency?: number;
  validationStatus?: ReportingStatus['validationStatus'];
  lastSubmission?: string;
  totalStaffed: number;
  totalAvailable: number;
  onboardingState?: OnboardingStatus['state'];
  incidentSeverity?: SupportIncident['severity'];
  incidentStatus?: SupportIncident['status'];
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchAll(dataset: number): Promise<ApiData> {
  const qs = `?dataset=${dataset}`;
  const [
    facilities,
    monitoring,
    reporting,
    incidents,
    sla,
    onboarding,
    events,
    disasters,
  ] = await Promise.all([
    fetch(`${API_BASE}/facilities${qs}`).then((r) => r.json()),
    fetch(`${API_BASE}/monitoring/status${qs}`).then((r) => r.json()),
    fetch(`${API_BASE}/reporting/status${qs}`).then((r) => r.json()),
    fetch(`${API_BASE}/support/incidents${qs}`).then((r) => r.json()),
    fetch(`${API_BASE}/support/sla${qs}`).then((r) => r.json()),
    fetch(`${API_BASE}/onboarding/status${qs}`).then((r) => r.json()),
    fetch(`${API_BASE}/events${qs}`).then((r) => r.json()),
    fetch(`${API_BASE}/disaster/status${qs}`).then((r) => r.json()),
  ]);
  return { facilities, monitoring, reporting, incidents, sla, onboarding, events, disasters };
}
