// Pre-normalized API datasets for Vercel deployment.
// These mirror the four test datasets the local Express server served from
// D:/HBED Data/unpacked, bundled inline so Vercel has no file-system dependency.

const NOW = '2026-03-14T13:47:00Z';
const T1H = '2026-03-14T12:47:00Z';
const T2H = '2026-03-14T11:47:00Z';

// ── Dataset 1 — Small Internal (10 facilities, normal operations) ─────────────

const DS1_FACILITIES = [
  {
    facilityId: 'CAL_NOR_001', name: 'UC Davis Medical Center', region: 'Northern',
    vendor: 'Epic', status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 54, available: 22 }, medical_beds: { staffed: 132, available: 18 } },
  },
  {
    facilityId: 'CAL_BAY_001', name: 'Zuckerberg San Francisco General', region: 'Bay Area',
    vendor: 'Epic', status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 60, available: 20 }, medical_beds: { staffed: 170, available: 12 } },
  },
  {
    facilityId: 'CAL_CEN_001', name: 'Community Regional Medical Center', region: 'Central',
    vendor: 'Oracle Cerner', status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 40, available: 8 }, medical_beds: { staffed: 148, available: 34 } },
  },
  {
    facilityId: 'CAL_LA_001', name: 'Cedars-Sinai Medical Center', region: 'Los Angeles',
    vendor: 'Epic', status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 80, available: 14 }, medical_beds: { staffed: 220, available: 22 } },
  },
  {
    facilityId: 'CAL_LA_002', name: 'LAC+USC Medical Center', region: 'Los Angeles',
    vendor: 'Oracle Cerner', status: 'degraded', lastUpdate: T1H, divertStatus: true, surgeMode: true,
    capacity: { trauma_icu: { staffed: 64, available: 4 }, medical_beds: { staffed: 196, available: 6 } },
  },
  {
    facilityId: 'CAL_IE_001', name: 'Loma Linda University Medical Center', region: 'Inland Empire',
    vendor: 'MEDITECH', status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 48, available: 16 }, medical_beds: { staffed: 160, available: 28 } },
  },
  {
    facilityId: 'CAL_SD_001', name: 'UC San Diego Medical Center', region: 'San Diego',
    vendor: 'Epic', status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 52, available: 18 }, medical_beds: { staffed: 158, available: 24 } },
  },
  {
    facilityId: 'CAL_BAY_002', name: 'Stanford Health Care', region: 'Bay Area',
    vendor: 'Epic', status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 72, available: 26 }, medical_beds: { staffed: 200, available: 38 } },
  },
  {
    facilityId: 'CAL_NOR_002', name: 'Renown Regional Medical Center', region: 'Northern',
    vendor: 'CPSI', status: 'active', lastUpdate: T1H, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 32, available: 10 }, medical_beds: { staffed: 110, available: 22 } },
  },
  {
    facilityId: 'CAL_CEN_002', name: 'Adventist Health Fresno', region: 'Central',
    vendor: 'Altera', status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 28, available: 9 }, medical_beds: { staffed: 98, available: 18 } },
  },
];

const DS1_MONITORING = DS1_FACILITIES.map((f, i) => ({
  facilityId: f.facilityId,
  facility: f.name,
  region: f.region,
  vendor: f.vendor,
  lastHeartbeatAt: NOW,
  heartbeatStatus: f.status === 'degraded' ? 'delayed' : i === 8 ? 'delayed' : 'healthy',
  feedLatencyMs: f.status === 'degraded' ? 420 : i === 8 ? 180 : 38 + i * 5,
  retryCount: f.status === 'degraded' ? 3 : i === 8 ? 1 : 0,
  connectionMethod: ['Fiber', 'Fiber', 'Fiber', 'Fiber', 'Cellular', 'Fiber', 'Fiber', 'Fiber', 'Cellular', 'Fiber'][i],
}));

const DS1_REPORTING = DS1_FACILITIES.map((f, i) => ({
  facilityId: f.facilityId,
  lastSubmission: NOW,
  status: f.status === 'degraded' ? 'failed' : i === 8 ? 'delayed' : 'success',
  latencySeconds: f.status === 'degraded' ? 340 : i === 8 ? 95 : 10 + i * 2,
  validationStatus: f.status === 'degraded' ? 'failed' : i === 8 ? 'pending' : 'passed',
}));

const DS1_INCIDENTS = DS1_FACILITIES.slice(0, 3).map((f, i) => ({
  incidentId: `INC_DS1_00${i + 1}`,
  facilityId: f.facilityId,
  severity: ['low', 'medium', 'critical'][i] as any,
  status: ['resolved', 'in_progress', 'open'][i] as any,
  createdAt: T2H,
  resolvedAt: i === 0 ? T1H : null,
  slaHours: [8, 4, 2][i],
  description: [`Routine maintenance window`, `Feed validation delay`, `Heartbeat outage — investigating`][i],
}));

const DS1_SLA = DS1_INCIDENTS.map((inc) => ({
  facilityId: inc.facilityId,
  slaTargetHours: inc.slaHours,
  responseTimeHours: inc.status === 'resolved' ? inc.slaHours * 0.6 : inc.slaHours * 0.3,
  breach: inc.status === 'open' && inc.slaHours <= 2,
}));

const DS1_ONBOARDING = DS1_FACILITIES.map((f, i) => ({
  facilityId: f.facilityId,
  state: f.status === 'degraded' ? 'failed' : i >= 8 ? 'active' : 'validated',
  validationStatus: f.status === 'degraded' ? 'failed' : 'passed',
  cohort: [`Wave-1`, `Wave-1`, `Wave-2`, `Wave-2`, `Wave-3`, `Wave-3`, `Wave-3`, `Wave-1`, `Wave-4`, `Wave-4`][i],
  connectorType: ['FHIR', 'FHIR', 'REST', 'FHIR', 'REST', 'HL7', 'FHIR', 'FHIR', 'SFTP', 'REST'][i],
  lastHeartbeatAt: NOW,
}));

const DS1_EVENTS = [
  { eventId: 'EVT_DS1_001', eventType: 'heartbeat_missing', facilityId: 'CAL_LA_002', timestamp: T1H, message: 'Heartbeat missing for CAL_LA_002.' },
  { eventId: 'EVT_DS1_002', eventType: 'reporting_failure', facilityId: 'CAL_LA_002', timestamp: T1H, message: 'Reporting failure detected for CAL_LA_002.' },
  { eventId: 'EVT_DS1_003', eventType: 'feed_retry', facilityId: 'CAL_NOR_002', timestamp: NOW, message: 'Feed retry triggered for CAL_NOR_002.' },
];

export const dataset1 = {
  facilities: DS1_FACILITIES,
  monitoring: DS1_MONITORING,
  reporting: DS1_REPORTING,
  incidents: DS1_INCIDENTS,
  sla: DS1_SLA,
  onboarding: DS1_ONBOARDING,
  events: DS1_EVENTS,
  disasters: [],
};

// ── Dataset 2 — Scale Internal (7 facilities, mixed stress) ──────────────────

const DS2_FACILITIES = [
  {
    facilityId: 'CAL_NOR_101', name: 'Shasta Regional Medical Center', region: 'Northern',
    vendor: 'MEDITECH', status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 36, available: 12 }, medical_beds: { staffed: 120, available: 20 } },
  },
  {
    facilityId: 'CAL_BAY_101', name: 'Highland Hospital Oakland', region: 'Bay Area',
    vendor: 'Epic', status: 'degraded', lastUpdate: T1H, divertStatus: false, surgeMode: true,
    capacity: { trauma_icu: { staffed: 44, available: 6 }, medical_beds: { staffed: 162, available: 10 } },
  },
  {
    facilityId: 'CAL_LA_101', name: 'Harbor-UCLA Medical Center', region: 'Los Angeles',
    vendor: 'Oracle Cerner', status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 58, available: 16 }, medical_beds: { staffed: 188, available: 30 } },
  },
  {
    facilityId: 'CAL_LA_102', name: 'Ronald Reagan UCLA Medical Center', region: 'Los Angeles',
    vendor: 'Epic', status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 76, available: 22 }, medical_beds: { staffed: 210, available: 42 } },
  },
  {
    facilityId: 'CAL_IE_101', name: 'Riverside University Health System', region: 'Inland Empire',
    vendor: 'Oracle Cerner', status: 'offline', lastUpdate: T2H, divertStatus: true, surgeMode: false,
    capacity: { trauma_icu: { staffed: 40, available: 0 }, medical_beds: { staffed: 140, available: 0 } },
  },
  {
    facilityId: 'CAL_SD_101', name: 'Sharp Memorial Hospital', region: 'San Diego',
    vendor: 'Epic', status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 46, available: 14 }, medical_beds: { staffed: 152, available: 26 } },
  },
  {
    facilityId: 'CAL_CEN_101', name: 'Kaweah Health Medical Center', region: 'Central',
    vendor: 'CPSI', status: 'active', lastUpdate: T1H, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 30, available: 8 }, medical_beds: { staffed: 106, available: 14 } },
  },
];

const DS2_MONITORING = DS2_FACILITIES.map((f, i) => ({
  facilityId: f.facilityId, facility: f.name, region: f.region, vendor: f.vendor,
  lastHeartbeatAt: f.status === 'offline' ? T2H : NOW,
  heartbeatStatus: f.status === 'offline' ? 'missing' : f.status === 'degraded' ? 'delayed' : 'healthy',
  feedLatencyMs: f.status === 'offline' ? null : f.status === 'degraded' ? 380 : 42 + i * 8,
  retryCount: f.status === 'offline' ? 5 : f.status === 'degraded' ? 2 : 0,
  connectionMethod: f.status === 'offline' ? 'Cellular' : 'Fiber',
}));

const DS2_REPORTING = DS2_FACILITIES.map((f) => ({
  facilityId: f.facilityId, lastSubmission: f.status === 'offline' ? T2H : NOW,
  status: f.status === 'offline' ? 'failed' : f.status === 'degraded' ? 'delayed' : 'success',
  latencySeconds: f.status === 'offline' ? null : f.status === 'degraded' ? 290 : 14,
  validationStatus: f.status === 'offline' ? 'failed' : f.status === 'degraded' ? 'pending' : 'passed',
}));

const DS2_INCIDENTS = [
  { incidentId: 'INC_DS2_001', facilityId: 'CAL_IE_101', severity: 'critical', status: 'open', createdAt: T2H, resolvedAt: null, slaHours: 1, description: 'Facility offline — system unreachable. Escalated to engineering.' },
  { incidentId: 'INC_DS2_002', facilityId: 'CAL_BAY_101', severity: 'high', status: 'in_progress', createdAt: T1H, resolvedAt: null, slaHours: 2, description: 'Feed degradation — latency spike, retry loop active.' },
  { incidentId: 'INC_DS2_003', facilityId: 'CAL_CEN_101', severity: 'medium', status: 'in_progress', createdAt: T1H, resolvedAt: null, slaHours: 4, description: 'Delayed heartbeat — investigating connectivity.' },
];

const DS2_SLA = DS2_INCIDENTS.map((inc) => ({
  facilityId: inc.facilityId, slaTargetHours: inc.slaHours,
  responseTimeHours: inc.status === 'resolved' ? inc.slaHours * 0.5 : inc.slaHours * 0.9,
  breach: inc.slaHours <= 2 && inc.status === 'open',
}));

const DS2_ONBOARDING = DS2_FACILITIES.map((f) => ({
  facilityId: f.facilityId,
  state: f.status === 'offline' ? 'failed' : f.status === 'degraded' ? 'active' : 'validated',
  validationStatus: f.status === 'offline' ? 'failed' : 'passed',
  cohort: 'Wave-2', connectorType: 'FHIR', lastHeartbeatAt: NOW,
}));

const DS2_EVENTS = [
  { eventId: 'EVT_DS2_001', eventType: 'heartbeat_missing', facilityId: 'CAL_IE_101', timestamp: T2H, message: 'Heartbeat missing — facility CAL_IE_101 unreachable for >2h.' },
  { eventId: 'EVT_DS2_002', eventType: 'reporting_failure', facilityId: 'CAL_IE_101', timestamp: T2H, message: 'Reporting failure — CAL_IE_101 offline.' },
  { eventId: 'EVT_DS2_003', eventType: 'feed_retry', facilityId: 'CAL_BAY_101', timestamp: T1H, message: 'Feed retry triggered — CAL_BAY_101 latency elevated.' },
  { eventId: 'EVT_DS2_004', eventType: 'sla_breach', facilityId: 'CAL_IE_101', timestamp: NOW, message: 'SLA breach imminent for CAL_IE_101 — 1h target.' },
];

export const dataset2 = {
  facilities: DS2_FACILITIES,
  monitoring: DS2_MONITORING,
  reporting: DS2_REPORTING,
  incidents: DS2_INCIDENTS,
  sla: DS2_SLA,
  onboarding: DS2_ONBOARDING,
  events: DS2_EVENTS,
  disasters: [],
};

// ── Dataset 3 — Emergency Synthetic (6 facilities, wildfire + earthquake + flood) ─

const DS3_FACILITIES = [
  {
    facilityId: 'CAL_NOR_201', name: 'Mercy Medical Center Redding', region: 'Northern',
    vendor: 'MEDITECH', status: 'degraded', lastUpdate: T1H, divertStatus: false, surgeMode: true,
    capacity: { trauma_icu: { staffed: 34, available: 8 }, medical_beds: { staffed: 110, available: 6 } },
  },
  {
    facilityId: 'CAL_NOR_202', name: 'Enloe Medical Center', region: 'Northern',
    vendor: 'Altera', status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 28, available: 10 }, medical_beds: { staffed: 96, available: 14 } },
  },
  {
    facilityId: 'CAL_CEN_201', name: 'Adventist Health Hanford', region: 'Central',
    vendor: 'CPSI', status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 22, available: 7 }, medical_beds: { staffed: 84, available: 12 } },
  },
  {
    facilityId: 'CAL_BAY_201', name: 'Eden Medical Center Castro Valley', region: 'Bay Area',
    vendor: 'Oracle Cerner', status: 'degraded', lastUpdate: T1H, divertStatus: true, surgeMode: true,
    capacity: { trauma_icu: { staffed: 30, available: 2 }, medical_beds: { staffed: 102, available: 4 } },
  },
  {
    facilityId: 'ACS_NOR_001', name: 'Sacramento Civic Overflow Site', region: 'Northern',
    vendor: null, status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { medical_beds: { staffed: 200, available: 180 } },
  },
  {
    facilityId: 'ACS_BAY_001', name: 'Bay Area Regional ACS', region: 'Bay Area',
    vendor: null, status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { medical_beds: { staffed: 150, available: 130 } },
  },
];

const DS3_MONITORING = DS3_FACILITIES.map((f) => ({
  facilityId: f.facilityId, facility: f.name, region: f.region, vendor: f.vendor ?? 'State',
  lastHeartbeatAt: f.status === 'degraded' ? T1H : NOW,
  heartbeatStatus: f.status === 'degraded' ? 'delayed' : 'healthy',
  feedLatencyMs: f.status === 'degraded' ? 520 : 55,
  retryCount: f.status === 'degraded' ? 4 : 0,
  connectionMethod: f.status === 'degraded' ? 'Cellular' : 'Fiber',
}));

const DS3_REPORTING = DS3_FACILITIES.map((f) => ({
  facilityId: f.facilityId, lastSubmission: f.status === 'degraded' ? T1H : NOW,
  status: f.status === 'degraded' ? 'delayed' : 'success',
  latencySeconds: f.status === 'degraded' ? 420 : 18,
  validationStatus: f.status === 'degraded' ? 'pending' : 'passed',
}));

const DS3_INCIDENTS = [
  { incidentId: 'INC_DS3_001', facilityId: 'CAL_NOR_201', severity: 'critical', status: 'open', createdAt: T2H, resolvedAt: null, slaHours: 1, description: 'Wildfire evacuation zone — facility at surge capacity, road access limited.' },
  { incidentId: 'INC_DS3_002', facilityId: 'CAL_BAY_201', severity: 'high', status: 'open', createdAt: T1H, resolvedAt: null, slaHours: 2, description: 'Earthquake aftershock damage — ED on diversion, structural assessment in progress.' },
];

const DS3_SLA = DS3_INCIDENTS.map((inc) => ({
  facilityId: inc.facilityId, slaTargetHours: inc.slaHours,
  responseTimeHours: inc.slaHours * 0.8, breach: inc.slaHours <= 2,
}));

const DS3_ONBOARDING = DS3_FACILITIES.map((f) => ({
  facilityId: f.facilityId,
  state: f.status === 'degraded' ? 'active' : 'validated',
  validationStatus: f.status === 'degraded' ? 'pending' : 'passed',
  cohort: 'Emergency-Wave', connectorType: f.vendor ? 'REST' : 'Manual', lastHeartbeatAt: NOW,
}));

const DS3_EVENTS = [
  { eventId: 'EVT_DS3_001', eventType: 'wildfire_alert', facilityId: 'CAL_NOR_201', timestamp: T2H, message: 'Wildfire — Butte/Shasta County emergency. CAL_NOR_201 in evacuation zone.' },
  { eventId: 'EVT_DS3_002', eventType: 'wildfire_alert', facilityId: null, timestamp: T2H, message: 'Statewide wildfire advisory — Northern region on watch.' },
  { eventId: 'EVT_DS3_003', eventType: 'earthquake_alert', facilityId: 'CAL_BAY_201', timestamp: T1H, message: 'M5.8 earthquake — Bay Area. CAL_BAY_201 structural inspection triggered.' },
  { eventId: 'EVT_DS3_004', eventType: 'flood_watch', facilityId: null, timestamp: T1H, message: 'Flash flood watch active — Central Valley (Sacramento to Fresno corridor).' },
  { eventId: 'EVT_DS3_005', eventType: 'acs_activation', facilityId: 'ACS_NOR_001', timestamp: NOW, message: 'Alternate care site ACS_NOR_001 activated — accepting low-acuity overflow.' },
  { eventId: 'EVT_DS3_006', eventType: 'acs_activation', facilityId: 'ACS_BAY_001', timestamp: NOW, message: 'Bay Area ACS activated — earthquake response staging.' },
  { eventId: 'EVT_DS3_007', eventType: 'reporting_failure', facilityId: 'CAL_BAY_201', timestamp: T1H, message: 'Reporting delayed — CAL_BAY_201 on emergency generator.' },
];

const DS3_DISASTERS = [
  { scenarioId: 'DIS_001', hazardType: 'wildfire', severity: 'critical', affectedRegions: ['Northern', 'Central'], startedAt: T2H },
  { scenarioId: 'DIS_002', hazardType: 'earthquake', severity: 'warning', affectedRegions: ['Bay Area'], startedAt: T1H },
  { scenarioId: 'DIS_003', hazardType: 'flood', severity: 'advisory', affectedRegions: ['Central'], startedAt: T1H },
];

export const dataset3 = {
  facilities: DS3_FACILITIES,
  monitoring: DS3_MONITORING,
  reporting: DS3_REPORTING,
  incidents: DS3_INCIDENTS,
  sla: DS3_SLA,
  onboarding: DS3_ONBOARDING,
  events: DS3_EVENTS,
  disasters: DS3_DISASTERS,
};

// ── Dataset 4 — Full Integrated Stress (4 facilities, combined internal + external) ─

const DS4_FACILITIES = [
  {
    facilityId: 'CAL_LA_301', name: 'Los Angeles County USC Medical Center', region: 'Los Angeles',
    vendor: 'Oracle Cerner', status: 'degraded', lastUpdate: T1H, divertStatus: true, surgeMode: true,
    capacity: { trauma_icu: { staffed: 72, available: 3 }, medical_beds: { staffed: 240, available: 8 } },
    disasterAffected: true, disasterType: 'wildfire', disasterSeverity: 'critical',
  },
  {
    facilityId: 'CAL_IE_301', name: 'Arrowhead Regional Medical Center', region: 'Inland Empire',
    vendor: 'MEDITECH', status: 'degraded', lastUpdate: T1H, divertStatus: false, surgeMode: true,
    capacity: { trauma_icu: { staffed: 44, available: 5 }, medical_beds: { staffed: 148, available: 7 } },
    disasterAffected: true, disasterType: 'wildfire', disasterSeverity: 'warning',
  },
  {
    facilityId: 'CAL_SD_301', name: 'Scripps Mercy Hospital', region: 'San Diego',
    vendor: 'Epic', status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { trauma_icu: { staffed: 50, available: 18 }, medical_beds: { staffed: 164, available: 32 } },
    disasterAffected: false,
  },
  {
    facilityId: 'ACS_LA_301', name: 'Los Angeles Regional ACS', region: 'Los Angeles',
    vendor: null, status: 'active', lastUpdate: NOW, divertStatus: false, surgeMode: false,
    capacity: { medical_beds: { staffed: 300, available: 260 } },
    disasterAffected: false,
  },
];

const DS4_MONITORING = DS4_FACILITIES.map((f) => ({
  facilityId: f.facilityId, facility: f.name, region: f.region, vendor: f.vendor ?? 'State',
  lastHeartbeatAt: f.status === 'degraded' ? T1H : NOW,
  heartbeatStatus: f.status === 'degraded' ? 'missing' : 'healthy',
  feedLatencyMs: f.status === 'degraded' ? 680 : 60,
  retryCount: f.status === 'degraded' ? 6 : 0,
  connectionMethod: f.status === 'degraded' ? 'Cellular' : 'Fiber',
}));

const DS4_REPORTING = DS4_FACILITIES.map((f) => ({
  facilityId: f.facilityId, lastSubmission: f.status === 'degraded' ? T2H : NOW,
  status: f.status === 'degraded' ? 'failed' : 'success',
  latencySeconds: f.status === 'degraded' ? null : 22,
  validationStatus: f.status === 'degraded' ? 'failed' : 'passed',
}));

const DS4_INCIDENTS = [
  { incidentId: 'INC_DS4_001', facilityId: 'CAL_LA_301', severity: 'critical', status: 'open', createdAt: T2H, resolvedAt: null, slaHours: 1, description: 'Wildfire smoke incursion — ICU at critical capacity, ED on diversion.' },
  { incidentId: 'INC_DS4_002', facilityId: 'CAL_IE_301', severity: 'high', status: 'open', createdAt: T1H, resolvedAt: null, slaHours: 2, description: 'Surge mode active — wildfire evacuee influx from San Bernardino County.' },
];

const DS4_SLA = DS4_INCIDENTS.map((inc) => ({
  facilityId: inc.facilityId, slaTargetHours: inc.slaHours,
  responseTimeHours: inc.slaHours * 0.95, breach: true,
}));

const DS4_ONBOARDING = DS4_FACILITIES.map((f) => ({
  facilityId: f.facilityId,
  state: f.status === 'degraded' ? 'failed' : 'validated',
  validationStatus: f.status === 'degraded' ? 'failed' : 'passed',
  cohort: 'Emergency-Wave', connectorType: f.vendor ? 'FHIR' : 'Manual', lastHeartbeatAt: NOW,
}));

const DS4_EVENTS = [
  { eventId: 'EVT_DS4_001', eventType: 'wildfire_alert', facilityId: 'CAL_LA_301', timestamp: T2H, message: 'Wildfire — LA County. CAL_LA_301 on emergency protocol, ICU critical.' },
  { eventId: 'EVT_DS4_002', eventType: 'wildfire_alert', facilityId: 'CAL_IE_301', timestamp: T1H, message: 'Wildfire spread — Inland Empire. Evacuee surge at CAL_IE_301.' },
  { eventId: 'EVT_DS4_003', eventType: 'heartbeat_missing', facilityId: 'CAL_LA_301', timestamp: T1H, message: 'Heartbeat missing — CAL_LA_301 on backup generator.' },
  { eventId: 'EVT_DS4_004', eventType: 'reporting_failure', facilityId: 'CAL_LA_301', timestamp: T1H, message: 'Reporting failed — CAL_LA_301 comms degraded.' },
  { eventId: 'EVT_DS4_005', eventType: 'acs_activation', facilityId: 'ACS_LA_301', timestamp: NOW, message: 'ACS_LA_301 fully activated — accepting all acuity overflow from LA Region.' },
  { eventId: 'EVT_DS4_006', eventType: 'sla_breach', facilityId: 'CAL_LA_301', timestamp: NOW, message: 'SLA breach confirmed — CAL_LA_301 incident exceeds 1h target.' },
];

const DS4_DISASTERS = [
  { scenarioId: 'DIS_DS4_001', hazardType: 'wildfire', severity: 'critical', affectedRegions: ['Los Angeles', 'Inland Empire'], startedAt: T2H },
];

export const dataset4 = {
  facilities: DS4_FACILITIES,
  monitoring: DS4_MONITORING,
  reporting: DS4_REPORTING,
  incidents: DS4_INCIDENTS,
  sla: DS4_SLA,
  onboarding: DS4_ONBOARDING,
  events: DS4_EVENTS,
  disasters: DS4_DISASTERS,
};

export const DATASETS: Record<1 | 2 | 3 | 4, typeof dataset1> = {
  1: dataset1,
  2: dataset2,
  3: dataset3 as any,
  4: dataset4 as any,
};
