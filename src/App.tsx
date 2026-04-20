import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Ambulance,
  BedDouble,
  Building2,
  CheckCircle2,
  Clock3,
  Moon,
  RefreshCw,
  ShieldCheck,
  SunMedium,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';

import { LoginScreen } from './components/LoginScreen';
import { StatusPill } from './components/StatusPill';
import { CaliforniaCapacityMap } from './components/CaliforniaCapacityMap';
import { IncidentCoordination } from './components/IncidentCoordination';
import { InteroperabilityFeedHealth } from './components/InteroperabilityFeedHealth';
import { InteroperabilityPipeline } from './components/InteroperabilityPipeline';
import { ScenarioSimulation } from './components/ScenarioSimulation';

import { alerts, emsMetrics, hospitals, type BedType } from './lib/data';
import { useApiData } from './hooks/useApiData';
import type { FacilityRow } from './lib/api';

type ThemeMode = 'dark' | 'light';
type ScenarioMode = 'normal' | 'surge' | 'degraded' | 'incident';
type OperationalState = 'CRITICAL' | 'SURGE' | 'WATCH' | 'NORMAL' | 'UNKNOWN';
type DatasetId = 1 | 2 | 3 | 4;
type UserRole = 'facility' | 'state';

type RegionFilter =
  | 'All'
  | 'Northern'
  | 'Bay Area'
  | 'Central'
  | 'Los Angeles'
  | 'Inland Empire'
  | 'San Diego';

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatClock(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(value);
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatEventTitle(eventType: string) {
  return eventType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getStatusTone(status: string): 'green' | 'amber' | 'red' | 'slate' {
  if (status === 'Normal' || status === 'active') return 'green';
  if (status === 'Surge' || status === 'degraded' || status === 'syncing') return 'amber';
  return 'red';
}

function getAlertTone(level: string): 'green' | 'amber' | 'red' | 'blue' | 'slate' {
  if (level === 'critical') return 'red';
  if (level === 'warning') return 'amber';
  if (level === 'info') return 'blue';
  return 'slate';
}

function getHeartbeatTone(status: string | undefined): 'green' | 'amber' | 'red' | 'slate' {
  if (status === 'healthy') return 'green';
  if (status === 'delayed') return 'amber';
  if (status === 'missing') return 'red';
  return 'slate';
}

function getReportingTone(status: string | undefined): 'green' | 'amber' | 'red' | 'slate' {
  if (status === 'success') return 'green';
  if (status === 'delayed') return 'amber';
  if (status === 'failed') return 'red';
  return 'slate';
}

function getIncidentTone(severity: string | undefined): 'green' | 'amber' | 'red' | 'slate' {
  if (severity === 'critical' || severity === 'high') return 'red';
  if (severity === 'medium') return 'amber';
  if (severity === 'low') return 'green';
  return 'slate';
}

function getOperationalTone(
  state: OperationalState
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  if (state === 'NORMAL') return 'green';
  if (state === 'WATCH' || state === 'SURGE') return 'amber';
  if (state === 'CRITICAL') return 'red';
  return 'slate';
}

function computeStatewideOperationalStatus({
  icuCapacityPercent,
  hospitalsOnDiversion,
  hospitalsReporting,
  hospitalsTotal,
}: {
  icuCapacityPercent: number | null;
  hospitalsOnDiversion: number | null;
  hospitalsReporting: number | null;
  hospitalsTotal: number | null;
}) {
  const invalid =
    icuCapacityPercent == null ||
    hospitalsOnDiversion == null ||
    hospitalsReporting == null ||
    hospitalsTotal == null ||
    hospitalsTotal <= 0;

  if (invalid) {
    return {
      state: 'UNKNOWN' as OperationalState,
      description: 'Operational status unavailable; required metrics missing.',
      metrics: {
        hospitalsReporting: 'N/A',
        hospitalsOnDiversion: 'N/A',
        icuCapacityPercent: 'N/A',
      },
    };
  }

  const diversionRatePercent = (hospitalsOnDiversion / hospitalsTotal) * 100;
  const hospitalsReportingPercent = (hospitalsReporting / hospitalsTotal) * 100;

  if (
    icuCapacityPercent <= 10 ||
    diversionRatePercent >= 25 ||
    hospitalsReportingPercent < 70
  ) {
    return {
      state: 'CRITICAL' as OperationalState,
      description: 'Critical capacity constraints; immediate intervention required.',
      metrics: {
        hospitalsReporting: `${hospitalsReporting} / ${hospitalsTotal}`,
        hospitalsOnDiversion: `${hospitalsOnDiversion}`,
        icuCapacityPercent: `${icuCapacityPercent}%`,
      },
    };
  }

  if (icuCapacityPercent <= 20 || diversionRatePercent >= 15) {
    return {
      state: 'SURGE' as OperationalState,
      description: 'High system demand; capacity constrained across multiple regions.',
      metrics: {
        hospitalsReporting: `${hospitalsReporting} / ${hospitalsTotal}`,
        hospitalsOnDiversion: `${hospitalsOnDiversion}`,
        icuCapacityPercent: `${icuCapacityPercent}%`,
      },
    };
  }

  if (icuCapacityPercent <= 30 || diversionRatePercent >= 5 || hospitalsReportingPercent < 85) {
    return {
      state: 'WATCH' as OperationalState,
      description: 'Elevated utilization; monitoring for potential capacity constraints.',
      metrics: {
        hospitalsReporting: `${hospitalsReporting} / ${hospitalsTotal}`,
        hospitalsOnDiversion: `${hospitalsOnDiversion}`,
        icuCapacityPercent: `${icuCapacityPercent}%`,
      },
    };
  }

  return {
    state: 'NORMAL' as OperationalState,
    description: 'Stable statewide capacity; no critical thresholds exceeded.',
    metrics: {
      hospitalsReporting: `${hospitalsReporting} / ${hospitalsTotal}`,
      hospitalsOnDiversion: `${hospitalsOnDiversion}`,
      icuCapacityPercent: `${icuCapacityPercent}%`,
    },
  };
}

function getBedCensusStatus(availablePercent: number) {
  if (availablePercent <= 10) return { label: 'Critical', tone: 'red' as const };
  if (availablePercent <= 25) return { label: 'Watch', tone: 'amber' as const };
  return { label: 'Healthy', tone: 'green' as const };
}

function getCapacityPressureStatus(utilizationPercent: number) {
  if (utilizationPercent >= 95) return { label: 'Critical', tone: 'red' as const };
  if (utilizationPercent >= 85) return { label: 'Strained', tone: 'amber' as const };
  if (utilizationPercent >= 70) return { label: 'Watch', tone: 'amber' as const };
  return { label: 'Normal', tone: 'green' as const };
}

function getFacilityChipBucket(availablePercent: number) {
  if (availablePercent <= 10) return 'critical';
  if (availablePercent <= 20) return 'strained';
  if (availablePercent <= 30) return 'watch';
  return 'healthy';
}

function getHospitalCapacity(hospital: (typeof hospitals)[number], selectedBedType: BedType | 'All') {
  if (selectedBedType === 'All') {
    const staffed = hospital.beds.reduce((sum, bed) => sum + bed.staffed, 0);
    const available = hospital.beds.reduce((sum, bed) => sum + bed.available, 0);
    return { staffed, available };
  }

  const matchingBed = hospital.beds.find((bed) => bed.type === selectedBedType);
  return {
    staffed: matchingBed?.staffed ?? 0,
    available: matchingBed?.available ?? 0,
  };
}

const alternateCareSites = [
  {
    id: 'acs-sacramento',
    name: 'Sacramento Civic Overflow Site',
    region: 'Northern',
    status: 'Standby',
    mode: 'Medical / low-acuity overflow',
    trigger: 'Activates when med/surg occupancy remains above 90% for 2 hours.',
  },
  {
    id: 'acs-fresno',
    name: 'Central Valley Flex Care Pavilion',
    region: 'Central',
    status: 'Warm',
    mode: 'Step-down and post-acute overflow',
    trigger: 'Supports coordinated decompression from Fresno-area hospitals.',
  },
  {
    id: 'acs-la',
    name: 'Los Angeles Regional ACS',
    region: 'Los Angeles',
    status: 'Active',
    mode: 'Alternate care and EMS staging',
    trigger: 'Visible to state coordination for surge routing and staging decisions.',
  },
  {
    id: 'acs-san-diego',
    name: 'San Diego Coastal Recovery Site',
    region: 'San Diego',
    status: 'Standby',
    mode: 'Behavioral health and recovery overflow',
    trigger: 'Contextual overflow option when psych-safe placement becomes constrained.',
  },
] as const;

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole>('facility');
  const [selectedFacilityId, setSelectedFacilityId] = useState(hospitals[0]?.id ?? '');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('hbeds-theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const [scenario, setScenario] = useState<ScenarioMode>('normal');
  const [dataset, setDataset] = useState<DatasetId>(1);
  const [region, setRegion] = useState<RegionFilter>('All');
  const [bedType, setBedType] = useState<BedType | 'All'>('All');
  const [lastRefresh, setLastRefresh] = useState(() => new Date('2026-03-14T13:47:00'));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hbeds-theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLastRefresh((prev) => new Date(prev.getTime() + 15000));
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  // ── API data ──────────────────────────────────────────────────────────────
  const apiState = useApiData(dataset);
  const apiData = apiState.status === 'ready' ? apiState.data : null;

  // ── API-derived values ────────────────────────────────────────────────────

  // Merged facility rows for the API table
  const mergedFacilityRows = useMemo((): FacilityRow[] | null => {
    if (!apiData) return null;
    const monMap = new Map(apiData.monitoring.map((m) => [m.facilityId, m]));
    const repMap = new Map(apiData.reporting.map((r) => [r.facilityId, r]));
    const incMap = new Map(apiData.incidents.map((i) => [i.facilityId, i]));
    const onbMap = new Map(apiData.onboarding.map((o) => [o.facilityId, o]));

    return apiData.facilities.map((f) => {
      const mon = monMap.get(f.facilityId);
      const rep = repMap.get(f.facilityId);
      const inc = incMap.get(f.facilityId);
      const onb = onbMap.get(f.facilityId);
      let totalStaffed = 0, totalAvailable = 0;
      Object.values(f.capacity ?? {}).forEach((b) => {
        totalStaffed += b.staffed;
        totalAvailable += b.available;
      });
      return {
        facilityId: f.facilityId,
        name: f.name,
        region: f.region,
        status: f.status,
        divertStatus: f.divertStatus,
        surgeMode: f.surgeMode,
        heartbeatStatus: mon?.heartbeatStatus,
        feedLatencyMs: mon?.feedLatencyMs,
        retryCount: mon?.retryCount,
        connectionMethod: mon?.connectionMethod,
        lastHeartbeatAt: mon?.lastHeartbeatAt,
        reportingStatus: rep?.status,
        reportingLatency: rep?.latencySeconds,
        validationStatus: rep?.validationStatus,
        lastSubmission: rep?.lastSubmission,
        totalStaffed,
        totalAvailable,
        onboardingState: onb?.state,
        incidentSeverity: inc?.severity,
        incidentStatus: inc?.status,
      };
    });
  }, [apiData]);

  // Filtered facility rows (by region)
  const filteredApiRows = useMemo(() => {
    if (!mergedFacilityRows) return null;
    if (region === 'All') return mergedFacilityRows;
    return mergedFacilityRows.filter((r) =>
      r.region.toLowerCase().includes(region.toLowerCase()),
    );
  }, [mergedFacilityRows, region]);

  // Ribbon inputs from API
  const apiRibbonInputs = useMemo(() => {
    if (!apiData) return null;
    const hospitalsTotal = apiData.facilities.length;
    const hospitalsOnDiversion = apiData.facilities.filter((f) => f.divertStatus).length;
    const hospitalsReporting = apiData.reporting.filter((r) => r.status === 'success').length;
    let icuStaffed = 0, icuAvailable = 0;
    apiData.facilities.forEach((f) => {
      const icu = f.capacity?.trauma_icu;
      if (icu) { icuStaffed += icu.staffed; icuAvailable += icu.available; }
    });
    const icuCapacityPercent = icuStaffed
      ? Math.round((icuAvailable / icuStaffed) * 100)
      : null;
    return { icuCapacityPercent, hospitalsOnDiversion, hospitalsReporting, hospitalsTotal };
  }, [apiData]);

  // Facility bucket counts from API
  const apiFacilityBuckets = useMemo(() => {
    if (!filteredApiRows) return null;
    return filteredApiRows.reduce(
      (acc, r) => {
        if (r.status === 'offline' || r.divertStatus) acc.critical++;
        else if (r.status === 'degraded' || r.surgeMode) acc.watch++;
        else if (r.totalStaffed && r.totalAvailable / r.totalStaffed < 0.2) acc.strained++;
        else acc.healthy++;
        return acc;
      },
      { healthy: 0, watch: 0, strained: 0, critical: 0 },
    );
  }, [filteredApiRows]);

  // State totals from API
  const apiStateTotals = useMemo(() => {
    if (!filteredApiRows) return null;
    let staffed = 0, available = 0;
    filteredApiRows.forEach((r) => { staffed += r.totalStaffed; available += r.totalAvailable; });
    const occupied = staffed - available;
    const availablePct = staffed ? Math.round((available / staffed) * 100) : 0;
    const utilizationPct = staffed ? Math.round((occupied / staffed) * 100) : 0;
    return { staffed, available, occupied, availablePct, utilizationPct, ambulanceQueue: null, avgWallTime: null };
  }, [filteredApiRows]);

  // Alert stream from API events
  const apiAlerts = useMemo(() => {
    if (!apiData || apiData.events.length === 0) return null;
    const eventLevelMap: Record<string, 'critical' | 'warning' | 'info'> = {
      heartbeat_missing: 'critical',
      reporting_failure: 'critical',
      wildfire_alert: 'critical',
      earthquake_alert: 'critical',
      flood_alert: 'warning',
      heatwave_alert: 'warning',
      capacity_alert: 'warning',
      feed_retry: 'warning',
      acs_activated: 'info',
      routing_decision: 'info',
    };
    return apiData.events.slice(0, 8).map((e) => ({
      id: e.eventId,
      level: eventLevelMap[e.eventType] ?? 'info',
      title: formatEventTitle(e.eventType),
      detail: e.message,
      time: formatTime(e.timestamp),
    }));
  }, [apiData]);

  // Reporting stats from API
  const apiReportingStats = useMemo(() => {
    if (!apiData) return null;
    const rep = apiData.reporting;
    const success = rep.filter((r) => r.status === 'success').length;
    const delayed = rep.filter((r) => r.status === 'delayed').length;
    const failed = rep.filter((r) => r.status === 'failed').length;
    const lastSuccessRecord = rep.find((r) => r.status === 'success');
    return { success, delayed, failed, total: rep.length, lastSuccess: lastSuccessRecord?.lastSubmission };
  }, [apiData]);

  // ── Static-data derived values (kept for CaliforniaCapacityMap + fallback) ─

  const scenarioHospitals = useMemo(() => {
    return hospitals.map((hospital) => {
      if (scenario === 'normal') return hospital;

      if (scenario === 'surge') {
        return {
          ...hospital,
          status: hospital.status === 'Normal' ? 'Surge' : hospital.status,
          ambulanceQueue: hospital.ambulanceQueue + 3,
          emsWallTimeMinutes: hospital.emsWallTimeMinutes + 12,
          boardingPatients: hospital.boardingPatients + 6,
          lastUpdated: lastRefresh.toISOString(),
          notes: `${hospital.notes} Surge scenario applied for demo.`,
          beds: hospital.beds.map((bed) => {
            const nextAvailable = Math.max(0, Math.floor(bed.available * 0.55));
            return { ...bed, available: nextAvailable, occupied: bed.staffed - nextAvailable };
          }),
        };
      }

      if (scenario === 'degraded') {
        return {
          ...hospital,
          ambulanceQueue: hospital.ambulanceQueue + 1,
          emsWallTimeMinutes: hospital.emsWallTimeMinutes + 8,
          lastUpdated: lastRefresh.toISOString(),
          notes: `${hospital.notes} Feed degradation and validation delay simulated.`,
        };
      }

      return {
        ...hospital,
        status: hospital.status === 'Normal' ? 'Internal Disaster' : hospital.status,
        ambulanceQueue: hospital.ambulanceQueue + 4,
        emsWallTimeMinutes: hospital.emsWallTimeMinutes + 15,
        boardingPatients: hospital.boardingPatients + 8,
        lastUpdated: lastRefresh.toISOString(),
        notes: `${hospital.notes} Incident command mode active.`,
        beds: hospital.beds.map((bed) => {
          const nextAvailable = Math.max(0, Math.floor(bed.available * 0.45));
          return { ...bed, available: nextAvailable, occupied: bed.staffed - nextAvailable };
        }),
      };
    });
  }, [scenario, lastRefresh]);

  const filteredHospitals = useMemo(() => {
    return scenarioHospitals.filter((hospital) => region === 'All' || hospital.region === region);
  }, [scenarioHospitals, region]);

  const selectedFacility =
    scenarioHospitals.find((hospital) => hospital.id === selectedFacilityId) ?? scenarioHospitals[0];

  const facilityLens = useMemo(() => {
    const relevantBeds =
      bedType === 'All'
        ? selectedFacility.beds
        : selectedFacility.beds.filter((bed) => bed.type === bedType);

    const staffed = relevantBeds.reduce((sum, bed) => sum + bed.staffed, 0);
    const available = relevantBeds.reduce((sum, bed) => sum + bed.available, 0);
    const occupied = staffed - available;
    const availablePct = staffed ? Math.round((available / staffed) * 100) : 0;
    const utilizationPct = staffed ? Math.round((occupied / staffed) * 100) : 0;

    return { staffed, available, occupied, availablePct, utilizationPct };
  }, [selectedFacility, bedType]);

  const placementRows = useMemo(() => {
    return scenarioHospitals
      .filter((hospital) => hospital.id !== selectedFacility.id)
      .map((hospital) => {
        const { staffed, available } = getHospitalCapacity(hospital, bedType);
        const availablePct = staffed ? Math.round((available / staffed) * 100) : 0;
        return {
          id: hospital.id,
          name: hospital.name,
          region: hospital.region,
          status: hospital.status,
          available,
          staffed,
          availablePct,
        };
      })
      .sort((a, b) => b.available - a.available);
  }, [scenarioHospitals, selectedFacility.id, bedType]);

  const contextualAlternateCareSites = useMemo(() => {
    return alternateCareSites.filter(
      (site) => site.region === selectedFacility.region || site.status === 'Active'
    );
  }, [selectedFacility.region]);

  const scenarioAlerts = useMemo(() => {
    const baseAlerts = [...alerts];
    if (scenario === 'surge') {
      return [{ id: 'scenario-surge', level: 'warning' as const, title: 'Regional surge activated', detail: 'ED boarding, ICU saturation, and ambulance queue times are elevated across multiple facilities.', time: 'Now' }, ...baseAlerts];
    }
    if (scenario === 'degraded') {
      return [{ id: 'scenario-degraded', level: 'critical' as const, title: 'Network degradation detected', detail: 'One or more facility feeds are delayed. Fallback validation and transport coordination paths are active.', time: 'Now' }, ...baseAlerts];
    }
    if (scenario === 'incident') {
      return [{ id: 'scenario-incident', level: 'critical' as const, title: 'Incident mode active', detail: 'Command posture elevated. Diversion and high-acuity routing should be coordinated centrally.', time: 'Now' }, ...baseAlerts];
    }
    return baseAlerts;
  }, [scenario]);

  const statewideTotals = useMemo(() => {
    let staffed = 0, available = 0, occupied = 0, ambulanceQueue = 0, wallTimeTotal = 0;
    filteredHospitals.forEach((hospital) => {
      ambulanceQueue += hospital.ambulanceQueue;
      wallTimeTotal += hospital.emsWallTimeMinutes;
      hospital.beds.forEach((bed) => {
        if (bedType === 'All' || bed.type === bedType) {
          staffed += bed.staffed;
          available += bed.available;
          occupied += bed.occupied;
        }
      });
    });
    const avgWallTime = filteredHospitals.length ? Math.round(wallTimeTotal / filteredHospitals.length) : 0;
    const availablePct = staffed ? Math.round((available / staffed) * 100) : 0;
    const utilizationPct = staffed ? Math.round((occupied / staffed) * 100) : 0;
    return { staffed, available, occupied, availablePct, utilizationPct, ambulanceQueue, avgWallTime };
  }, [filteredHospitals, bedType]);

  const facilityBuckets = useMemo(() => {
    return filteredHospitals.reduce(
      (acc, hospital) => {
        const relevantBeds = bedType === 'All' ? hospital.beds : hospital.beds.filter((b) => b.type === bedType);
        const s = relevantBeds.reduce((sum, b) => sum + b.staffed, 0);
        const a = relevantBeds.reduce((sum, b) => sum + b.available, 0);
        const pct = s ? Math.round((a / s) * 100) : 0;
        acc[getFacilityChipBucket(pct)] += 1;
        return acc;
      },
      { healthy: 0, watch: 0, strained: 0, critical: 0 },
    );
  }, [filteredHospitals, bedType]);

  const staticRibbonInputs = useMemo(() => {
    const hospitalsTotal = filteredHospitals.length;
    const adultIcu = filteredHospitals.reduce(
      (totals, hospital) => {
        const icu = hospital.beds.find((bed) => bed.type === 'Adult ICU');
        totals.staffed += icu?.staffed ?? 0;
        totals.available += icu?.available ?? 0;
        return totals;
      },
      { staffed: 0, available: 0 },
    );
    const icuCapacityPercent = adultIcu.staffed
      ? Math.round((adultIcu.available / adultIcu.staffed) * 100)
      : null;
    const hospitalsOnDiversion = filteredHospitals.filter(
      (h) => h.status === 'Diversion' || h.status === 'Internal Disaster',
    ).length;
    const hospitalsReporting =
      scenario === 'degraded' && hospitalsTotal >= 4 ? hospitalsTotal - 1 : hospitalsTotal;
    return { icuCapacityPercent, hospitalsOnDiversion, hospitalsReporting, hospitalsTotal };
  }, [filteredHospitals, scenario]);

  const chartPoints = useMemo(() => {
    if (scenario === 'incident') return [88, 84, 79, 73, 68, 64, 61];
    if (scenario === 'surge') return [90, 87, 81, 76, 72, 69, 66];
    if (scenario === 'degraded') return [91, 89, 85, 83, 80, 78, 76];
    return [92, 90, 88, 86, 84, 83, 82];
  }, [scenario]);

  // ── Effective values: prefer API, fall back to static ─────────────────────

  const effectiveRibbonInputs = apiRibbonInputs ?? staticRibbonInputs;
  const ribbonStatus = useMemo(
    () => computeStatewideOperationalStatus(effectiveRibbonInputs),
    [effectiveRibbonInputs],
  );

  const effectiveTotals = apiStateTotals ?? statewideTotals;
  const effectiveBuckets = apiFacilityBuckets ?? facilityBuckets;
  const effectiveAlerts = apiAlerts ?? scenarioAlerts;

  const latestUpdateLabel = formatClock(lastRefresh);
  const activeFeedHealth =
    scenario === 'degraded'
      ? 'Feed validation active on delayed facilities.'
      : 'Automated reporting is advancing continuously across the network.';

  const bedCensusStatus = getBedCensusStatus(effectiveTotals.availablePct);
  const capacityStatus = getCapacityPressureStatus(effectiveTotals.utilizationPct);
  const facilityBedCensusStatus = getBedCensusStatus(facilityLens.availablePct);
  const facilityCapacityStatus = getCapacityPressureStatus(facilityLens.utilizationPct);
  const facilityAlerts = effectiveAlerts.filter(
    (alert) =>
      alert.detail.includes(selectedFacility.region) ||
      alert.detail.includes(selectedFacility.name.split(' ')[0]) ||
      alert.level !== 'info'
  );

  if (!isAuthenticated) {
    return (
      <LoginScreen
        facilities={hospitals.map((facility) => ({
          id: facility.id,
          name: facility.name,
          region: facility.region,
        }))}
        onLogin={({ role, facilityId }) => {
          const facility =
            hospitals.find((hospital) => hospital.id === facilityId) ?? hospitals[0];
          setActiveRole(role);
          setSelectedFacilityId(facilityId);
          setRegion(role === 'state' ? 'All' : facility.region);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  if (activeRole === 'facility') {
    return (
      <div className="app-shell">
        <section className={`state-ribbon ribbon-${selectedFacility.status.toLowerCase() === 'normal' ? 'normal' : 'watch'}`}>
          <div className="state-ribbon-top">
            <StatusPill tone={getStatusTone(selectedFacility.status)}>{selectedFacility.status}</StatusPill>
            <span>
              Facility operations view scoped to {selectedFacility.name} with placement-aware,
              limited cross-facility visibility.
            </span>
          </div>
          <div className="state-ribbon-meta">
            <span>Facility: {selectedFacility.name}</span>
            <span>Ambulance queue: {selectedFacility.ambulanceQueue}</span>
            <span>EMS offload: {selectedFacility.emsWallTimeMinutes} min</span>
            <span>Cross-facility visibility: placement signals only</span>
          </div>
        </section>

        <section className="topbar platform-header">
          <div className="header-stack">
            <div className="eyebrow operational">
              <ShieldCheck size={16} />
              Facility operations view
            </div>
            <h1>HBEDS Operational Platform</h1>
            <div className="header-powered">Powered by MeshMill&apos;s M.A.R.I.O. Interoperability Engine</div>
            <p className="subtitle header-tagline">
              Own-hospital operations with controlled cross-facility placement awareness for
              transfer, intake, and surge decision support.
            </p>
          </div>

          <div className="topbar-actions">
            <div className="view-toggle">
              <button
                className="secondary-btn is-active"
                type="button"
                onClick={() => setActiveRole('facility')}
              >
                Facility Operations
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={() => {
                  setActiveRole('state');
                  setRegion('All');
                }}
              >
                State Coordination
              </button>
            </div>

            <label className="demo-inline-select">
              Facility context
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
              >
                {scenarioHospitals.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="theme-toggle"
              type="button"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              aria-label="Toggle color mode"
            >
              {theme === 'dark' ? <SunMedium size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>

            <button className="secondary-btn" type="button" onClick={() => setIsAuthenticated(false)}>
              Return to login
            </button>
          </div>
        </section>

        <section className="filters panel">
          <div className="section-head compact">
            <div>
              <h3>
                <Activity size={18} />
                Placement Lens
              </h3>
              <p>
                Focus own-hospital operations and limited placement visibility by care need.
              </p>
            </div>
          </div>

          <div className="filter-row">
            <label>
              Care need
              <select value={bedType} onChange={(e) => setBedType(e.target.value as BedType | 'All')}>
                <option value="All">All bed types</option>
                <option value="Adult ICU">Adult ICU</option>
                <option value="Medical Surgical">Medical Surgical</option>
                <option value="Emergency Department">Emergency Department</option>
                <option value="Pediatric ICU">Pediatric ICU</option>
                <option value="NICU">NICU</option>
                <option value="Psych">Psych</option>
                <option value="Burn">Burn</option>
                <option value="Isolation">Isolation</option>
              </select>
            </label>

            <div className="filter-note">
              <ShieldCheck size={16} />
              Other hospitals expose only status and capacity signals relevant to patient placement.
            </div>
          </div>
        </section>

        <section className="overview-grid">
          <div className="overview-main">
            <div className="hero-panel glass">
              <div className="section-head compact">
                <div>
                  <h3>
                    <Building2 size={18} />
                    Facility Operational Snapshot
                  </h3>
                  <p>
                    Real-time view of staffed bed availability, facility status, and EMS pressure
                    for {selectedFacility.name}.
                  </p>
                </div>
                <StatusPill tone="slate">
                  {bedType === 'All' ? 'All care settings' : `${bedType} placement lens`}
                </StatusPill>
              </div>

              <div className="hero-metrics">
                <div className="stat-card tone-green">
                  <div className="stat-topline">
                    <div className="stat-label">Available / Staffed</div>
                    <StatusPill tone={facilityBedCensusStatus.tone}>
                      {facilityBedCensusStatus.label}
                    </StatusPill>
                  </div>
                  <div className="stat-value">
                    {formatNumber(facilityLens.available)} / {formatNumber(facilityLens.staffed)}
                  </div>
                  <div className="stat-helper">
                    {facilityLens.availablePct}% immediately available in current scope
                  </div>
                </div>

                <div className="stat-card tone-blue">
                  <div className="stat-topline">
                    <div className="stat-label">Facility Status</div>
                    <StatusPill tone={getStatusTone(selectedFacility.status)}>
                      {selectedFacility.status}
                    </StatusPill>
                  </div>
                  <div className="stat-value">{selectedFacility.boardingPatients}</div>
                  <div className="stat-helper">Boarding patients influencing operational flow</div>
                </div>

                <div className="stat-card tone-amber">
                  <div className="stat-topline">
                    <div className="stat-label">Ambulance Queue</div>
                    <StatusPill tone={facilityCapacityStatus.tone}>
                      {facilityCapacityStatus.label}
                    </StatusPill>
                  </div>
                  <div className="stat-value">{selectedFacility.ambulanceQueue}</div>
                  <div className="stat-helper">Units awaiting handoff at this facility</div>
                </div>

                <div className="stat-card tone-red">
                  <div className="stat-label">EMS Offload Time</div>
                  <div className="stat-value">{selectedFacility.emsWallTimeMinutes}m</div>
                  <div className="stat-helper">
                    Current offload time with automated refresh at {formatClock(lastRefresh)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="overview-side">
            <div className="panel">
              <div className="section-head compact">
                <div>
                  <h3>
                    <ShieldCheck size={18} />
                    Role-Aware Visibility
                  </h3>
                  <p>RBAC framing for the facility demo path.</p>
                </div>
              </div>

              <div className="security-list">
                <div className="security-item">
                  <span>Own hospital detail</span>
                  <strong>Full operational view</strong>
                </div>
                <div className="security-item">
                  <span>Other hospitals</span>
                  <strong>Availability + status only</strong>
                </div>
                <div className="security-item">
                  <span>Alternate care sites</span>
                  <strong>Contextual overflow only</strong>
                </div>
                <div className="security-item">
                  <span>EMS workflow</span>
                  <strong>Assisted placement awareness</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="main-grid vertical-slice-grid">
          <div className="left-stack">
            <div className="panel">
              <div className="section-head">
                <div>
                  <h3>
                    <BedDouble size={18} />
                    Own Hospital Detail
                  </h3>
                  <p>Staffed bed availability by bed type, EMS wait conditions, and local notes.</p>
                </div>
                <StatusPill tone="slate">
                  Last sync {formatClock(new Date(selectedFacility.lastUpdated))}
                </StatusPill>
              </div>

              <div className="facility-detail-grid">
                <div className="bed-breakdown">
                  <div className="bed-breakdown-head">
                    <h4>Bed Availability by Type</h4>
                    <span className="tooltip-icon" title="Local facility view retains complete service-line detail.">
                      Own view
                    </span>
                  </div>
                  {selectedFacility.beds.map((bed) => {
                    const pct = bed.staffed ? Math.round((bed.available / bed.staffed) * 100) : 0;
                    return (
                      <div key={bed.type} className="bed-breakdown-row">
                        <div>
                          <strong>{bed.type}</strong>
                          <span>
                            {bed.available} available / {bed.staffed} staffed
                          </span>
                        </div>
                        <div className={`bed-breakdown-value tone-${getStatusTone(pct >= 25 ? 'Normal' : pct >= 10 ? 'Surge' : 'Diversion')}`}>
                          {pct}%
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="placement-summary-card">
                  <div className="map-metric-grid">
                    <div className="map-metric">
                      <Ambulance size={16} />
                      <div>
                        <span>Ambulances Queued</span>
                        <strong>{selectedFacility.ambulanceQueue}</strong>
                      </div>
                    </div>
                    <div className="map-metric">
                      <Clock3 size={16} />
                      <div>
                        <span>EMS Wall Time</span>
                        <strong>{selectedFacility.emsWallTimeMinutes} min</strong>
                      </div>
                    </div>
                    <div className="map-metric">
                      <TriangleAlert size={16} />
                      <div>
                        <span>Operational Notes</span>
                        <strong>{selectedFacility.notes}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="section-head">
                <div>
                  <h3>
                    <TrendingUp size={18} />
                    Placement Network View
                  </h3>
                  <p>
                    Cross-facility visibility is restricted to placement-relevant signals only:
                    bed type, availability, and status.
                  </p>
                </div>
                <StatusPill tone="blue">Limited RBAC scope</StatusPill>
              </div>

              <div className="hospital-table-wrap">
                <table className="hospital-table placement-table">
                  <thead>
                    <tr>
                      <th>Facility</th>
                      <th>Region</th>
                      <th>Status</th>
                      <th>{bedType === 'All' ? 'Available / Staffed' : `${bedType} availability`}</th>
                      <th>Placement Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placementRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div className="facility-title">{row.name}</div>
                          <div className="facility-sub">Cross-facility visibility only</div>
                        </td>
                        <td>{row.region}</td>
                        <td>
                          <StatusPill tone={getStatusTone(row.status)}>{row.status}</StatusPill>
                        </td>
                        <td>
                          <strong>{row.available} / {row.staffed}</strong>
                          <div className="muted">{row.availablePct}% available</div>
                        </td>
                        <td>
                          <StatusPill tone={row.availablePct >= 25 ? 'green' : row.availablePct >= 10 ? 'amber' : 'red'}>
                            {row.availablePct >= 25 ? 'Placement option' : row.availablePct >= 10 ? 'Limited' : 'Constrained'}
                          </StatusPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="right-stack">
            <div className="panel">
              <div className="section-head compact">
                <div>
                  <h3>
                    <Activity size={18} />
                    Facility Alerts
                  </h3>
                  <p>Operational awareness relevant to this facility workflow.</p>
                </div>
              </div>

              <div className="alert-list">
                {facilityAlerts.slice(0, 4).map((alert) => (
                  <div key={alert.id} className={`alert-item ${alert.level}`}>
                    <div>
                      <div className="alert-title">{alert.title}</div>
                      <p>{alert.detail}</p>
                    </div>
                    <div className="right-align">
                      <StatusPill tone={getAlertTone(alert.level)}>{alert.level}</StatusPill>
                      <span className="alert-time">{alert.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="section-head compact">
                <div>
                  <h3>
                    <Ambulance size={18} />
                    Contextual Overflow Options
                  </h3>
                  <p>Alternate care sites are surfaced only when they matter to local placement decisions.</p>
                </div>
              </div>

              <div className="acs-list">
                {contextualAlternateCareSites.map((site) => (
                  <div key={site.id} className="acs-item">
                    <div className="acs-item-head">
                      <strong>{site.name}</strong>
                      <StatusPill tone={site.status === 'Active' ? 'green' : site.status === 'Warm' ? 'amber' : 'slate'}>
                        {site.status}
                      </StatusPill>
                    </div>
                    <span>{site.mode}</span>
                    <span>{site.trigger}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="backup-tools">
          <ScenarioSimulation
            scenario={scenario}
            onChangeScenario={setScenario}
            dataset={dataset}
            onChangeDataset={setDataset}
            apiStatus={apiState.status}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <section className={`state-ribbon ribbon-${ribbonStatus.state.toLowerCase()}`}>
        <div className="state-ribbon-top">
          <StatusPill tone={getOperationalTone(ribbonStatus.state)}>{ribbonStatus.state}</StatusPill>
          <span>{ribbonStatus.description}</span>
        </div>
        <div className="state-ribbon-meta">
          <span>Hospitals Reporting (Live): {ribbonStatus.metrics.hospitalsReporting}</span>
          <span>Hospitals on Diversion: {ribbonStatus.metrics.hospitalsOnDiversion}</span>
          <span>ICU Capacity: {ribbonStatus.metrics.icuCapacityPercent}</span>
          {apiData && (
            <span className="ribbon-dataset-tag">
              Dataset {dataset} · {apiData.facilities.length} facilities
            </span>
          )}
        </div>
      </section>

      <section className="topbar platform-header">
        <div className="header-stack">
          <div className="eyebrow operational">
            <ShieldCheck size={16} />
            State coordination view
          </div>
          <h1>HBEDS Operational Platform</h1>
          <div className="header-powered">Powered by MeshMill&apos;s M.A.R.I.O. Interoperability Engine</div>
          <p className="subtitle header-tagline">
            Aggregated statewide visibility across participating hospitals, embedded EMS
            coordination workflows, and alternate care site awareness for command-level decision
            support.
          </p>
        </div>

        <div className="topbar-actions">
          <div className="view-toggle">
            <button
              className="secondary-btn"
              type="button"
              onClick={() => setActiveRole('facility')}
            >
              Facility Operations
            </button>
            <button className="secondary-btn is-active" type="button">
              State Coordination
            </button>
          </div>

          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            aria-label="Toggle color mode"
          >
            {theme === 'dark' ? <SunMedium size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>

          <button className="secondary-btn" type="button">
            Export summary
          </button>

          <button className="secondary-btn" type="button" onClick={() => setIsAuthenticated(false)}>
            Return to login
          </button>
        </div>
      </section>

      <section className="overview-grid">
        <div className="overview-main">
          <div className="hero-panel glass">
            <div className="section-head compact">
              <div>
                <h3>
                  <TrendingUp size={18} />
                  Statewide Operational Snapshot
                </h3>
                <p>Capacity, strain, EMS pressure, and delay across the selected hospital network.</p>
              </div>

              <div className="snapshot-chip-row">
                <StatusPill tone="green">{effectiveBuckets.healthy} Healthy Facilities</StatusPill>
                <StatusPill tone="amber">{effectiveBuckets.watch} Watch</StatusPill>
                <StatusPill tone="amber">{effectiveBuckets.strained} Strained</StatusPill>
                <StatusPill tone="red">{effectiveBuckets.critical} Critical</StatusPill>
              </div>
            </div>

            <div className="hero-metrics">
              <div className="stat-card tone-green">
                <div className="stat-topline">
                  <div className="stat-label">Bed Census</div>
                  <StatusPill tone={bedCensusStatus.tone}>{bedCensusStatus.label}</StatusPill>
                </div>
                <div className="stat-value">
                  {formatNumber(effectiveTotals.occupied)} / {formatNumber(effectiveTotals.available)} /{' '}
                  {formatNumber(effectiveTotals.staffed)}
                </div>
                <div className="stat-helper">{effectiveTotals.availablePct}% available across staffed beds</div>
              </div>

              <div className="stat-card tone-blue">
                <div className="stat-topline">
                  <div className="stat-label">Capacity Pressure</div>
                  <StatusPill tone={capacityStatus.tone}>{capacityStatus.label}</StatusPill>
                </div>
                <div className="stat-value">{effectiveTotals.utilizationPct}%</div>
                <div className="stat-helper">System-wide staffed bed utilization</div>
              </div>

              <div className="stat-card tone-amber">
                <div className="stat-label">Ambulance Queue</div>
                <div className="stat-value">
                  {effectiveTotals.ambulanceQueue != null
                    ? formatNumber(effectiveTotals.ambulanceQueue)
                    : '—'}
                </div>
                <div className="stat-helper">Queued transports across selected facilities</div>
              </div>

              <div className="stat-card tone-red">
                <div className="stat-label">EMS Offload Time</div>
                <div className="stat-value">
                  {effectiveTotals.avgWallTime != null ? `${effectiveTotals.avgWallTime}m` : '—'}
                </div>
                <div className="stat-helper">Average time-to-offload under active conditions</div>
              </div>
            </div>
          </div>

          <InteroperabilityFeedHealth
            scenario={scenario}
            monitoring={apiData?.monitoring}
            reporting={apiData?.reporting}
          />
        </div>

        <div className="overview-side">
          <div className="panel freshness-panel">
            <div className="section-head compact">
              <div>
                <h3>
                  <RefreshCw size={18} />
                  Live Data Freshness
                </h3>
                <p>Continuous timestamps demonstrating automated reporting without manual entry.</p>
              </div>
              <StatusPill tone={scenario === 'degraded' ? 'amber' : 'green'}>
                {scenario === 'degraded' ? 'Validation fallback active' : 'Automated feed active'}
              </StatusPill>
            </div>

            <div className="freshness-grid freshness-grid-single">
              <div className="freshness-card pulse-card">
                <span className="mini-label">Last network sync</span>
                <strong>{latestUpdateLabel}</strong>
                <span>{activeFeedHealth}</span>
              </div>
              <div className="freshness-card">
                <span className="mini-label">Hospital API stream</span>
                <strong>
                  {apiData
                    ? `${apiData.monitoring.filter((m) => m.heartbeatStatus === 'healthy').length} live / ${apiData.monitoring.filter((m) => m.heartbeatStatus !== 'healthy').length} delayed`
                    : scenario === 'degraded'
                      ? '35 live / 5 validating'
                      : '40 live / 0 delayed'}
                </strong>
                <span>EHR integrations keep normalized operational objects moving in real time.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="filters panel">
        <div className="section-head compact">
          <div>
            <h3>
              <Activity size={18} />
              Operational Filters
            </h3>
            <p>Slice the network by region and bed type to inspect live operational posture.</p>
          </div>
        </div>

        <div className="filter-row">
          <label>
            Region
            <select value={region} onChange={(e) => setRegion(e.target.value as RegionFilter)}>
              <option value="All">All regions</option>
              <option value="Northern">Northern</option>
              <option value="Bay Area">Bay Area</option>
              <option value="Central">Central</option>
              <option value="Los Angeles">Los Angeles</option>
              <option value="Inland Empire">Inland Empire</option>
              <option value="San Diego">San Diego</option>
            </select>
          </label>

          <label>
            Bed type
            <select value={bedType} onChange={(e) => setBedType(e.target.value as BedType | 'All')}>
              <option value="All">All bed types</option>
              <option value="Adult ICU">Adult ICU</option>
              <option value="Medical Surgical">Medical Surgical</option>
              <option value="Emergency Department">Emergency Department</option>
              <option value="Pediatric ICU">Pediatric ICU</option>
              <option value="NICU">NICU</option>
              <option value="Psych">Psych</option>
              <option value="Burn">Burn</option>
              <option value="Isolation">Isolation</option>
            </select>
          </label>

          <div className="filter-note">
            <ShieldCheck size={16} />
            Filters update the snapshot, map, and facility operational detail views.
          </div>
        </div>
      </section>

      {scenario !== 'normal' && (
        <section className={`panel scenario-banner scenario-${scenario}`}>
          <strong>
            {scenario === 'surge' && 'Surge scenario active'}
            {scenario === 'degraded' && 'Network degradation scenario active'}
            {scenario === 'incident' && 'Incident mode active'}
          </strong>
          <span>
            {scenario === 'surge' &&
              'Available capacity has been reduced for demo purposes, with elevated EMS queue and boarding pressure.'}
            {scenario === 'degraded' &&
              'Feed latency and facility validation are degraded. Reporting and platform health reflect lower confidence.'}
            {scenario === 'incident' &&
              'Incident command mode is active, with elevated acuity routing and reduced available capacity.'}
          </span>
        </section>
      )}

      {/* Disaster banner — shown when API returns active disaster scenarios */}
      {apiData && apiData.disasters.length > 0 && (
        <section className="panel scenario-banner scenario-incident">
          <div className="disaster-banner-head">
            <TriangleAlert size={16} />
            <strong>Active Disaster Scenarios ({apiData.disasters.length})</strong>
          </div>
          <div className="disaster-list">
            {apiData.disasters.map((d) => (
              <div key={d.scenarioId} className="disaster-item">
                <StatusPill
                  tone={
                    d.severity === 'critical'
                      ? 'red'
                      : d.severity === 'warning'
                        ? 'amber'
                        : 'slate'
                  }
                >
                  {d.severity}
                </StatusPill>
                <span>
                  <strong>{d.hazardType.charAt(0).toUpperCase() + d.hazardType.slice(1)}</strong>
                  {' — '}
                  {d.affectedRegions.join(', ')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="reporting-strip panel">
        <div className="section-head compact">
          <div>
            <h3>
              <Clock3 size={18} />
              Reporting Status
            </h3>
            <p>Automated statewide reporting posture for CDPH and CDC/NHSN workflows.</p>
            <div className="architecture-link-row">
              <span className="architecture-link-pill">Pipeline Stage 4</span>
              <span className="architecture-link-copy">
                Uses canonical mapping and validation outputs from the interoperability pipeline.
              </span>
            </div>
          </div>
          <StatusPill
            tone={
              apiReportingStats
                ? apiReportingStats.failed > 0
                  ? 'red'
                  : apiReportingStats.delayed > 0
                    ? 'amber'
                    : 'green'
                : scenario === 'degraded'
                  ? 'amber'
                  : 'green'
            }
          >
            {apiReportingStats
              ? apiReportingStats.failed > 0
                ? 'Failures detected'
                : apiReportingStats.delayed > 0
                  ? 'Delays detected'
                  : 'Compliant'
              : scenario === 'degraded'
                ? 'At risk'
                : 'Compliant'}
          </StatusPill>
        </div>

        <div className="reporting-grid">
          {apiReportingStats ? (
            <>
              <div className="reporting-item">
                <strong>CDPH Reporting — Success</strong>
                <span>{apiReportingStats.success} facilities reporting on time</span>
                <span>
                  Status:{' '}
                  {apiReportingStats.failed === 0 && apiReportingStats.delayed === 0
                    ? 'All feeds current'
                    : 'Some feeds affected'}
                </span>
                <span>Feed: Automated</span>
              </div>
              <div className="reporting-item">
                <strong>CDPH Reporting — Delayed</strong>
                <span>{apiReportingStats.delayed} facilities delayed</span>
                <span>
                  Status: {apiReportingStats.delayed > 0 ? 'Monitoring' : 'On track'}
                </span>
                <span>Cadence: 15-minute target</span>
              </div>
              <div className="reporting-item">
                <strong>NHSN Reporting — Failures</strong>
                <span>{apiReportingStats.failed} facilities failed</span>
                <span>
                  Status:{' '}
                  {apiReportingStats.failed > 0 ? 'Intervention required' : 'Accepted by CDC'}
                </span>
                <span>Submission: Automated</span>
              </div>
              <div className="reporting-item">
                <strong>Reporting Coverage</strong>
                <span>
                  {apiReportingStats.success} / {apiReportingStats.total} facilities submitting
                </span>
                <span>
                  Last success:{' '}
                  {apiReportingStats.lastSuccess
                    ? formatTime(apiReportingStats.lastSuccess)
                    : 'N/A'}
                </span>
                <span>Cadence: Twice daily minimum</span>
              </div>
            </>
          ) : (
            <>
              <div className="reporting-item">
                <strong>CDPH Reporting Status</strong>
                <span>Last submission: 2:00 PM</span>
                <span>Status: {scenario === 'degraded' ? 'Delayed review' : 'On time'}</span>
                <span>Feed: Automated</span>
              </div>
              <div className="reporting-item">
                <strong>CDPH Next Window</strong>
                <span>Next due: 2:15 PM</span>
                <span>Status: {scenario === 'degraded' ? 'Monitoring' : 'On track'}</span>
                <span>Cadence: 15-minute target</span>
              </div>
              <div className="reporting-item">
                <strong>NHSN Reporting</strong>
                <span>Last submission: 8:00 AM</span>
                <span>Status: {scenario === 'degraded' ? 'Pending ack' : 'Accepted by CDC'}</span>
                <span>Submission: Automated</span>
              </div>
              <div className="reporting-item">
                <strong>NHSN Next Window</strong>
                <span>Next due: 8:00 PM</span>
                <span>Status: {scenario === 'degraded' ? 'Reviewing' : 'On track'}</span>
                <span>Cadence: Twice daily minimum</span>
              </div>
            </>
          )}
        </div>
      </section>

      <InteroperabilityPipeline />

      <section className="support-card-grid">
        <div className="panel support-card">
          <div className="section-head compact">
            <div>
              <h3>
                <ShieldCheck size={18} />
                Access &amp; Security
              </h3>
              <p>Authentication, access control, auditability, and session protections.</p>
            </div>
          </div>

          <div className="security-list">
            <div className="security-item"><span>Authentication</span><strong>SSO + MFA</strong></div>
            <div className="security-item"><span>Access Control</span><strong>RBAC enforced</strong></div>
            <div className="security-item"><span>Audit Logging</span><strong>Enabled</strong></div>
            <div className="security-item"><span>Session Security</span><strong>Encrypted (TLS 1.2+)</strong></div>
            <div className="security-item"><span>User Scope</span><strong>Role- and jurisdiction-based</strong></div>
          </div>
        </div>

        <div className="panel support-card">
          <div className="section-head compact">
            <div>
              <h3>
                <CheckCircle2 size={18} />
                Deployment Confidence
              </h3>
              <p>Evaluator-ready proof points that reduce perceived implementation risk.</p>
            </div>
          </div>

          <div className="deployment-list">
            <div>
              <strong>Immediate readiness</strong>
              <span>The platform is framed as a live operational system rather than a prototype workflow.</span>
            </div>
            <div>
              <strong>Enterprise fit</strong>
              <span>Visual language and reporting posture align with enterprise command-center dashboards.</span>
            </div>
            <div>
              <strong>Validation range</strong>
              <span>Deployment messaging retains the approximately 40-hospital to 400-hospital scaling proof point.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="main-grid vertical-slice-grid">
        <div className="left-stack">
          <CaliforniaCapacityMap hospitals={filteredHospitals} selectedBedType={bedType} />

          {/* API Facility Table — shown when live data is available */}
          {filteredApiRows ? (
            <div className="panel">
              <div className="section-head">
                <div>
                  <h3>
                    <Building2 size={18} />
                    Facility Operational View
                  </h3>
                  <p>Live status, monitoring health, reporting posture, and capacity from M.A.R.I.O.</p>
                </div>
                <StatusPill tone="slate">{filteredApiRows.length} facilities in scope</StatusPill>
              </div>

              <div className="hospital-table-wrap">
                <table className="hospital-table">
                  <thead>
                    <tr>
                      <th>Facility</th>
                      <th>Status</th>
                      <th>Heartbeat</th>
                      <th>Reporting</th>
                      <th>Capacity</th>
                      <th>Onboarding</th>
                      <th>Incident</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApiRows.map((row) => {
                      const availPct = row.totalStaffed
                        ? Math.round((row.totalAvailable / row.totalStaffed) * 100)
                        : 0;
                      return (
                        <tr key={row.facilityId}>
                          <td>
                            <div className="facility-title">{row.name}</div>
                            <div className="facility-sub">
                              {row.region} · {row.facilityId}
                              {row.divertStatus && (
                                <span className="tag-divert"> · Divert</span>
                              )}
                              {row.surgeMode && (
                                <span className="tag-surge"> · Surge</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <StatusPill tone={getStatusTone(row.status)}>
                              {row.status}
                            </StatusPill>
                          </td>
                          <td>
                            <StatusPill tone={getHeartbeatTone(row.heartbeatStatus)}>
                              {row.heartbeatStatus ?? '—'}
                            </StatusPill>
                            {row.feedLatencyMs != null && (
                              <div className="muted">{row.feedLatencyMs}ms</div>
                            )}
                            {row.retryCount != null && row.retryCount > 0 && (
                              <div className="muted">{row.retryCount} retries</div>
                            )}
                          </td>
                          <td>
                            <StatusPill tone={getReportingTone(row.reportingStatus)}>
                              {row.reportingStatus ?? '—'}
                            </StatusPill>
                            {row.lastSubmission && (
                              <div className="muted">{formatTime(row.lastSubmission)}</div>
                            )}
                          </td>
                          <td>
                            <strong>{row.totalAvailable} / {row.totalStaffed}</strong>
                            <div className="muted">{availPct}% available</div>
                          </td>
                          <td>
                            {row.onboardingState ? (
                              <StatusPill
                                tone={
                                  row.onboardingState === 'validated'
                                    ? 'green'
                                    : row.onboardingState === 'failed'
                                      ? 'red'
                                      : 'amber'
                                }
                              >
                                {row.onboardingState}
                              </StatusPill>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td>
                            {row.incidentSeverity ? (
                              <>
                                <StatusPill tone={getIncidentTone(row.incidentSeverity)}>
                                  {row.incidentSeverity}
                                </StatusPill>
                                <div className="muted">{row.incidentStatus}</div>
                              </>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Static fallback table */
            <div className="panel">
              <div className="section-head">
                <div>
                  <h3>
                    <Building2 size={18} />
                    Facility Operational View
                  </h3>
                  <p>Real-time staffed-bed availability, status, EMS pressure, and reporting health.</p>
                </div>
                <StatusPill tone="slate">{filteredHospitals.length} facilities in scope</StatusPill>
              </div>

              <div className="hospital-table-wrap">
                <table className="hospital-table">
                  <thead>
                    <tr>
                      <th>Facility</th>
                      <th>Status</th>
                      <th>Reporting</th>
                      <th>Available / Staffed</th>
                      <th>Boarding</th>
                      <th>EMS</th>
                      <th>Last refresh</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHospitals.map((hospital) => {
                      const relevantBeds =
                        bedType === 'All'
                          ? hospital.beds
                          : hospital.beds.filter((bed) => bed.type === bedType);
                      const staffed = relevantBeds.reduce((sum, bed) => sum + bed.staffed, 0);
                      const available = relevantBeds.reduce((sum, bed) => sum + bed.available, 0);
                      return (
                        <tr key={hospital.id}>
                          <td>
                            <div className="facility-title">{hospital.name}</div>
                            <div className="facility-sub">
                              {hospital.county} County · {hospital.region} · Trauma {hospital.traumaLevel}
                            </div>
                          </td>
                          <td>
                            <StatusPill tone={getStatusTone(hospital.status)}>{hospital.status}</StatusPill>
                          </td>
                          <td>
                            <div>{hospital.reportingMethod}</div>
                            <div className="muted">{hospital.ehr}</div>
                          </td>
                          <td>
                            <strong>{available} / {staffed}</strong>
                          </td>
                          <td>{hospital.boardingPatients}</td>
                          <td>
                            <div>{hospital.emsWallTimeMinutes} min</div>
                            <div className="muted">{hospital.ambulanceQueue} queued</div>
                          </td>
                          <td>
                            <div className="refresh-stamp">{formatClock(new Date(hospital.lastUpdated))}</div>
                            <div className="muted">auto-ingested</div>
                          </td>
                          <td className="notes-cell">{hospital.notes}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="chart-card">
            <div className="section-head">
              <div>
                <h3>
                  <BedDouble size={18} />
                  Capacity Trend Outlook
                </h3>
                <p>Illustrative availability trend across the current scenario.</p>
              </div>
              <div className="legend-group">
                <span><i className="legend-dot blue" />Available capacity</span>
                <span><i className="legend-dot amber" />Stress threshold</span>
              </div>
            </div>

            <svg
              className="chart-svg"
              viewBox="0 0 720 220"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Trend chart"
            >
              <line x1="40" y1="170" x2="680" y2="170" stroke="var(--line)" />
              <line x1="40" y1="40" x2="40" y2="170" stroke="var(--line)" />
              <line x1="40" y1="95" x2="680" y2="95" stroke="var(--amber)" strokeDasharray="6 6" opacity="0.7" />

              {chartPoints.map((point, index) => {
                const x = 40 + index * 106;
                const y = 170 - point;
                const next = chartPoints[index + 1];
                return (
                  <g key={index}>
                    {next !== undefined && (
                      <line x1={x} y1={y} x2={40 + (index + 1) * 106} y2={170 - next} stroke="var(--blue)" strokeWidth="4" strokeLinecap="round" />
                    )}
                    <circle cx={x} cy={y} r="5" fill="var(--blue)" />
                    <text x={x} y="192" textAnchor="middle" className="chart-label">H{index + 1}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="right-stack">
          <div className="panel">
            <div className="section-head compact">
              <div>
                <h3>
                  <Activity size={18} />
                  Live Alert Stream
                </h3>
                <p>Operational alerts generated from validated capacity, transport, and reporting signals.</p>
                <div className="architecture-link-row">
                  <span className="architecture-link-pill">Pipeline Stage 5</span>
                  <span className="architecture-link-copy">
                    {apiAlerts
                      ? `${apiAlerts.length} events from M.A.R.I.O. event stream`
                      : 'Derived from normalized statewide data after validation and monitoring checks.'}
                  </span>
                </div>
              </div>
            </div>

            <div className="alert-list">
              {effectiveAlerts.map((alert) => (
                <div key={alert.id} className={`alert-item ${alert.level}`}>
                  <div>
                    <div className="alert-title">{alert.title}</div>
                    <p>{alert.detail}</p>
                  </div>
                  <div className="right-align">
                    <StatusPill tone={getAlertTone(alert.level)}>{alert.level}</StatusPill>
                    <span className="alert-time">{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="section-head compact">
              <div>
                <h3>
                  <Ambulance size={18} />
                  EMS Metrics
                </h3>
                <p>EMS-facing indicators computed from the same validated operational feed used for statewide reporting.</p>
                <div className="architecture-link-row">
                  <span className="architecture-link-pill">Pipeline Stage 5</span>
                  <span className="architecture-link-copy">
                    Shows downstream transport pressure once source data has been normalized and quality-checked.
                  </span>
                </div>
              </div>
            </div>

            <div className="metric-list">
              {emsMetrics.map((item) => (
                <div className="metric-item" key={item.label}>
                  <div>
                    <div className="metric-label">{item.label}</div>
                    <div className="metric-value">{item.value}</div>
                    <span>{item.trend}</span>
                  </div>
                  <StatusPill tone={item.tone === 'good' ? 'green' : item.tone === 'warn' ? 'amber' : 'red'}>
                    {item.tone}
                  </StatusPill>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="section-head compact">
              <div>
                <h3>
                  <Building2 size={18} />
                  Alternate Care Sites
                </h3>
                <p>State coordination includes operational visibility into alternate care sites for routing and decompression decisions.</p>
              </div>
            </div>

            <div className="acs-list">
              {alternateCareSites.map((site) => (
                <div key={site.id} className="acs-item">
                  <div className="acs-item-head">
                    <strong>{site.name}</strong>
                    <StatusPill
                      tone={
                        site.status === 'Active'
                          ? 'green'
                          : site.status === 'Warm'
                            ? 'amber'
                            : 'slate'
                      }
                    >
                      {site.status}
                    </StatusPill>
                  </div>
                  <span>{site.region}</span>
                  <span>{site.mode}</span>
                  <span>{site.trigger}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="operational-intelligence">
        <div className="section-head">
          <div>
            <h3>
              <ShieldCheck size={18} />
              Care Capacity &amp; Placement
            </h3>
            <p>Operational routing and placement guidance for the current statewide posture.</p>
          </div>
        </div>

        <div className="intelligence-grid intelligence-grid-single">
          <IncidentCoordination scenario={scenario} />
        </div>
      </section>

      <div className="backup-tools">
        <ScenarioSimulation
          scenario={scenario}
          onChangeScenario={setScenario}
          dataset={dataset}
          onChangeDataset={setDataset}
          apiStatus={apiState.status}
        />
      </div>
    </div>
  );
}
