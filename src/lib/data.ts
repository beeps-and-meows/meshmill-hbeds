export type BedType =
  | 'Adult ICU'
  | 'Medical Surgical'
  | 'Emergency Department'
  | 'Pediatric ICU'
  | 'NICU'
  | 'Psych'
  | 'Burn'
  | 'Isolation';

export type HospitalStatus = 'Normal' | 'Surge' | 'Diversion' | 'Internal Disaster';
export type RegionKey = 'Northern' | 'Bay Area' | 'Central' | 'Los Angeles' | 'Inland Empire' | 'San Diego';

export interface BedInventory {
  type: BedType;
  staffed: number;
  available: number;
  occupied: number;
}

export interface HospitalRecord {
  id: string;
  name: string;
  region: RegionKey;
  county: string;
  traumaLevel: 'I' | 'II' | 'III' | 'N/A';
  status: HospitalStatus;
  reportingMethod: 'FHIR API' | 'REST API' | 'SFTP';
  ehr: 'Epic' | 'Oracle Cerner' | 'MEDITECH' | 'CPSI' | 'Altera';
  lastUpdated: string;
  nhsnLastSent: string;
  cdpgLastSent: string;
  boardingPatients: number;
  emsWallTimeMinutes: number;
  ambulanceQueue: number;
  notes: string;
  beds: BedInventory[];
}

export interface EmsMetric {
  label: string;
  value: string;
  trend: string;
  tone: 'good' | 'warn' | 'bad';
}

export interface AlertItem {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  time: string;
}

export interface FeedItem {
  id: string;
  time: string;
  event: string;
  category: 'EMS' | 'Hospital' | 'NHSN' | 'Onboarding';
}

export interface HistoricalPoint {
  time: string;
  availableBeds: number;
  edBoarders: number;
}

export interface OnboardingSite {
  hospital: string;
  phase: 'Agreement' | 'Interface Build' | 'Validation' | 'Live';
  owner: string;
  eta: string;
}

export interface RfpAlignmentItem {
  title: string;
  summary: string;
}

export const rfpAlignment: RfpAlignmentItem[] = [
  {
    title: 'Real-time bed visibility by bed type',
    summary: 'Dashboard surfaces staffed, occupied, and available counts for ICU, med/surg, ED, pediatrics, psych, burn, and isolation beds.',
  },
  {
    title: '15-minute operational cadence',
    summary: 'Demo models hospital and EMS refresh timestamps to reflect the RFP cadence for continuous collection and CDPH transmission every 15 minutes.',
  },
  {
    title: 'CDC-NHSN awareness',
    summary: 'UI includes NHSN sync state, twice-daily transmission status, and respiratory-reporting placeholders tied to the RFP. Exhibit A1/A2 were referenced in the RFP but not included in the uploaded content, so exact field lists were modeled conservatively from the stated requirements.',
  },
  {
    title: 'Hospital onboarding operations',
    summary: 'A dedicated panel tracks participation agreements, interface build, validation, and go-live, matching the RFP’s enrollment and activation needs.',
  },
];

export const bedTypes: BedType[] = [
  'Adult ICU',
  'Medical Surgical',
  'Emergency Department',
  'Pediatric ICU',
  'NICU',
  'Psych',
  'Burn',
  'Isolation',
];

export const hospitals: HospitalRecord[] = [
  {
    id: 'uc-davis',
    name: 'UC Davis Medical Center',
    region: 'Northern',
    county: 'Sacramento',
    traumaLevel: 'I',
    status: 'Surge',
    reportingMethod: 'FHIR API',
    ehr: 'Epic',
    lastUpdated: '2026-03-14T13:45:00',
    nhsnLastSent: '2026-03-14T12:00:00',
    cdpgLastSent: '2026-03-14T13:45:00',
    boardingPatients: 18,
    emsWallTimeMinutes: 27,
    ambulanceQueue: 6,
    notes: 'Trauma and ICU demand elevated due to multi-county storm response.',
    map: { x: 190, y: 132 },
    beds: [
      { type: 'Adult ICU', staffed: 54, available: 6, occupied: 48 },
      { type: 'Medical Surgical', staffed: 132, available: 18, occupied: 114 },
      { type: 'Emergency Department', staffed: 44, available: 5, occupied: 39 },
      { type: 'Pediatric ICU', staffed: 18, available: 3, occupied: 15 },
      { type: 'NICU', staffed: 24, available: 4, occupied: 20 },
      { type: 'Psych', staffed: 16, available: 2, occupied: 14 },
      { type: 'Burn', staffed: 10, available: 1, occupied: 9 },
      { type: 'Isolation', staffed: 20, available: 2, occupied: 18 },
    ],
  },
  {
    id: 'sf-general',
    name: 'Zuckerberg San Francisco General',
    region: 'Bay Area',
    county: 'San Francisco',
    traumaLevel: 'I',
    status: 'Diversion',
    reportingMethod: 'FHIR API',
    ehr: 'Epic',
    lastUpdated: '2026-03-14T13:43:00',
    nhsnLastSent: '2026-03-14T12:00:00',
    cdpgLastSent: '2026-03-14T13:30:00',
    boardingPatients: 24,
    emsWallTimeMinutes: 42,
    ambulanceQueue: 9,
    notes: 'Temporary ambulance diversion for ED crowding; ICU still accepting interfacility transfers on approval.',
    map: { x: 128, y: 158 },
    beds: [
      { type: 'Adult ICU', staffed: 60, available: 4, occupied: 56 },
      { type: 'Medical Surgical', staffed: 170, available: 12, occupied: 158 },
      { type: 'Emergency Department', staffed: 52, available: 2, occupied: 50 },
      { type: 'Pediatric ICU', staffed: 12, available: 2, occupied: 10 },
      { type: 'NICU', staffed: 20, available: 4, occupied: 16 },
      { type: 'Psych', staffed: 14, available: 1, occupied: 13 },
      { type: 'Burn', staffed: 8, available: 1, occupied: 7 },
      { type: 'Isolation', staffed: 22, available: 1, occupied: 21 },
    ],
  },
  {
    id: 'community-regional',
    name: 'Community Regional Medical Center',
    region: 'Central',
    county: 'Fresno',
    traumaLevel: 'I',
    status: 'Normal',
    reportingMethod: 'REST API',
    ehr: 'Oracle Cerner',
    lastUpdated: '2026-03-14T13:44:00',
    nhsnLastSent: '2026-03-14T12:00:00',
    cdpgLastSent: '2026-03-14T13:45:00',
    boardingPatients: 11,
    emsWallTimeMinutes: 16,
    ambulanceQueue: 3,
    notes: 'Stable regional capacity with psych-safe and pediatric surge room available.',
    map: { x: 193, y: 215 },
    beds: [
      { type: 'Adult ICU', staffed: 40, available: 8, occupied: 32 },
      { type: 'Medical Surgical', staffed: 148, available: 34, occupied: 114 },
      { type: 'Emergency Department', staffed: 40, available: 8, occupied: 32 },
      { type: 'Pediatric ICU', staffed: 14, available: 4, occupied: 10 },
      { type: 'NICU', staffed: 16, available: 3, occupied: 13 },
      { type: 'Psych', staffed: 12, available: 4, occupied: 8 },
      { type: 'Burn', staffed: 4, available: 1, occupied: 3 },
      { type: 'Isolation', staffed: 18, available: 5, occupied: 13 },
    ],
  },
  {
    id: 'cedars',
    name: 'Cedars-Sinai Medical Center',
    region: 'Los Angeles',
    county: 'Los Angeles',
    traumaLevel: 'II',
    status: 'Surge',
    reportingMethod: 'FHIR API',
    ehr: 'Epic',
    lastUpdated: '2026-03-14T13:46:00',
    nhsnLastSent: '2026-03-14T12:00:00',
    cdpgLastSent: '2026-03-14T13:45:00',
    boardingPatients: 20,
    emsWallTimeMinutes: 31,
    ambulanceQueue: 7,
    notes: 'High acuity surgical admissions and limited isolation capacity.',
    map: { x: 215, y: 332 },
    beds: [
      { type: 'Adult ICU', staffed: 70, available: 5, occupied: 65 },
      { type: 'Medical Surgical', staffed: 210, available: 24, occupied: 186 },
      { type: 'Emergency Department', staffed: 56, available: 6, occupied: 50 },
      { type: 'Pediatric ICU', staffed: 8, available: 1, occupied: 7 },
      { type: 'NICU', staffed: 30, available: 3, occupied: 27 },
      { type: 'Psych', staffed: 10, available: 2, occupied: 8 },
      { type: 'Burn', staffed: 12, available: 2, occupied: 10 },
      { type: 'Isolation', staffed: 26, available: 2, occupied: 24 },
    ],
  },
  {
    id: 'riverside',
    name: 'Riverside University Health System',
    region: 'Inland Empire',
    county: 'Riverside',
    traumaLevel: 'II',
    status: 'Normal',
    reportingMethod: 'SFTP',
    ehr: 'MEDITECH',
    lastUpdated: '2026-03-14T13:42:00',
    nhsnLastSent: '2026-03-14T12:00:00',
    cdpgLastSent: '2026-03-14T13:30:00',
    boardingPatients: 9,
    emsWallTimeMinutes: 14,
    ambulanceQueue: 2,
    notes: 'Good inland transfer destination with med/surg and isolation headroom.',
    map: { x: 255, y: 323 },
    beds: [
      { type: 'Adult ICU', staffed: 32, available: 7, occupied: 25 },
      { type: 'Medical Surgical', staffed: 126, available: 28, occupied: 98 },
      { type: 'Emergency Department', staffed: 34, available: 7, occupied: 27 },
      { type: 'Pediatric ICU', staffed: 10, available: 2, occupied: 8 },
      { type: 'NICU', staffed: 14, available: 3, occupied: 11 },
      { type: 'Psych', staffed: 10, available: 3, occupied: 7 },
      { type: 'Burn', staffed: 4, available: 0, occupied: 4 },
      { type: 'Isolation', staffed: 16, available: 6, occupied: 10 },
    ],
  },
  {
    id: 'ucsd',
    name: 'UC San Diego Health',
    region: 'San Diego',
    county: 'San Diego',
    traumaLevel: 'I',
    status: 'Internal Disaster',
    reportingMethod: 'FHIR API',
    ehr: 'Epic',
    lastUpdated: '2026-03-14T13:47:00',
    nhsnLastSent: '2026-03-14T12:00:00',
    cdpgLastSent: '2026-03-14T13:45:00',
    boardingPatients: 15,
    emsWallTimeMinutes: 36,
    ambulanceQueue: 5,
    notes: 'Internal disaster activation due to ED surge and air transport coordination.',
    map: { x: 230, y: 413 },
    beds: [
      { type: 'Adult ICU', staffed: 48, available: 3, occupied: 45 },
      { type: 'Medical Surgical', staffed: 162, available: 22, occupied: 140 },
      { type: 'Emergency Department', staffed: 46, available: 3, occupied: 43 },
      { type: 'Pediatric ICU', staffed: 14, available: 2, occupied: 12 },
      { type: 'NICU', staffed: 16, available: 2, occupied: 14 },
      { type: 'Psych', staffed: 12, available: 1, occupied: 11 },
      { type: 'Burn', staffed: 6, available: 1, occupied: 5 },
      { type: 'Isolation', staffed: 18, available: 1, occupied: 17 },
    ],
  },
];



export const alerts: AlertItem[] = [
  {
    id: 'a1',
    level: 'critical',
    title: 'Bay Area EMS offload pressure',
    detail: 'Two facilities are above 30 minutes wall time. Diversion rules automatically surfaced to incident command and county EMSA.',
    time: '13:47',
  },
  {
    id: 'a2',
    level: 'warning',
    title: 'NHSN respiratory submission window approaching',
    detail: '12 hospitals have completed validation. 2 sites are awaiting automated acknowledgment.',
    time: '13:30',
  },
  {
    id: 'a3',
    level: 'info',
    title: 'CDPH API healthy',
    detail: '15-minute push is green across all demo interfaces: FHIR, REST API, and SFTP transformation jobs.',
    time: '13:45',
  },
];

export const emsMetrics: EmsMetric[] = [
  { label: 'Median EMS Wall Time', value: '24 min', trend: '-4 min vs 08:00', tone: 'good' },
  { label: 'Ambulances Awaiting Transfer', value: '32', trend: '+5 in last hour', tone: 'warn' },
  { label: 'Receiving Hospitals Open', value: '21 / 26', trend: '81% statewide', tone: 'good' },
  { label: 'Diversion Sites', value: '3', trend: '1 new in Bay Area', tone: 'bad' },
];

export const eventFeed: FeedItem[] = [
  { id: 'f1', time: '13:47', category: 'Hospital', event: 'UC San Diego switched from degraded workflow to business continuity mode; dashboard remains live.' },
  { id: 'f2', time: '13:45', category: 'NHSN', event: 'Twelfth facility transmitted staffed-bed payload and respiratory markers to CDC endpoint.' },
  { id: 'f3', time: '13:39', category: 'EMS', event: 'Alameda County EMS rerouted two ALS units after Bay Area ED wall times exceeded threshold.' },
  { id: 'f4', time: '13:30', category: 'Onboarding', event: 'Kern County pilot site advanced from validation to production readiness review.' },
  { id: 'f5', time: '13:15', category: 'Hospital', event: 'Cedars-Sinai updated adult ICU availability with 15-minute automated feed.' },
];

export const historicalTrend: HistoricalPoint[] = [
  { time: '08:00', availableBeds: 277, edBoarders: 74 },
  { time: '09:00', availableBeds: 262, edBoarders: 81 },
  { time: '10:00', availableBeds: 248, edBoarders: 86 },
  { time: '11:00', availableBeds: 239, edBoarders: 93 },
  { time: '12:00', availableBeds: 231, edBoarders: 98 },
  { time: '13:00', availableBeds: 246, edBoarders: 89 },
  { time: '14:00', availableBeds: 259, edBoarders: 83 },
];

export const onboardingSites: OnboardingSite[] = [
  { hospital: 'Kern Medical', phase: 'Validation', owner: 'HBEDS Interface Team', eta: '2 days' },
  { hospital: 'Santa Clara Valley', phase: 'Agreement', owner: 'Regional Outreach', eta: '5 days' },
  { hospital: 'Scripps Mercy', phase: 'Interface Build', owner: 'FHIR Integrations', eta: '7 days' },
  { hospital: 'Mercy San Juan', phase: 'Live', owner: 'Customer Success', eta: 'Monitoring' },
];

export function summarizeHospitals(records: HospitalRecord[]) {
  const totalStaffedBeds = records.flatMap((r) => r.beds).reduce((sum, bed) => sum + bed.staffed, 0);
  const totalAvailableBeds = records.flatMap((r) => r.beds).reduce((sum, bed) => sum + bed.available, 0);
  const totalOccupiedBeds = records.flatMap((r) => r.beds).reduce((sum, bed) => sum + bed.occupied, 0);
  const hospitalsInDiversion = records.filter((r) => r.status === 'Diversion').length;
  const hospitalsInSurge = records.filter((r) => r.status === 'Surge').length;
  const medianWallTime = Math.round(records.reduce((sum, r) => sum + r.emsWallTimeMinutes, 0) / records.length);

  return {
    totalStaffedBeds,
    totalAvailableBeds,
    totalOccupiedBeds,
    hospitalsInDiversion,
    hospitalsInSurge,
    medianWallTime,
  };
}


export interface HospitalRecord {
  id: string;
  name: string;
  region: RegionKey;
  county: string;
  traumaLevel: 'I' | 'II' | 'III' | 'N/A';
  status: HospitalStatus;
  reportingMethod: 'FHIR API' | 'REST API' | 'SFTP';
  ehr: 'Epic' | 'Oracle Cerner' | 'MEDITECH' | 'CPSI' | 'Altera';
  lastUpdated: string;
  nhsnLastSent: string;
  cdpgLastSent: string;
  boardingPatients: number;
  emsWallTimeMinutes: number;
  ambulanceQueue: number;
  notes: string;
  beds: BedInventory[];

  map: {
    x: number;
    y: number;
  };
}
