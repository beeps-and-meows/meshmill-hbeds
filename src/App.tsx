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
} from 'lucide-react';

import { LoginScreen } from './components/LoginScreen';
import { StatusPill } from './components/StatusPill';
import { CaliforniaCapacityMap } from './components/CaliforniaCapacityMap';
import { IncidentCoordination } from './components/IncidentCoordination';
import { InteroperabilityFeedHealth } from './components/InteroperabilityFeedHealth';
import { ScenarioSimulation } from './components/ScenarioSimulation';

import { alerts, emsMetrics, hospitals, type BedType } from './lib/data';

type ThemeMode = 'dark' | 'light';
type ScenarioMode = 'normal' | 'surge' | 'degraded' | 'incident';
type OperationalState = 'CRITICAL' | 'SURGE' | 'WATCH' | 'NORMAL' | 'UNKNOWN';

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

function getStatusTone(status: string): 'green' | 'amber' | 'red' | 'slate' {
  if (status === 'Normal') return 'green';
  if (status === 'Surge') return 'amber';
  return 'red';
}

function getAlertTone(level: string): 'green' | 'amber' | 'red' | 'blue' | 'slate' {
  if (level === 'critical') return 'red';
  if (level === 'warning') return 'amber';
  if (level === 'info') return 'blue';
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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('hbeds-theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const [scenario, setScenario] = useState<ScenarioMode>('normal');
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
            return {
              ...bed,
              available: nextAvailable,
              occupied: bed.staffed - nextAvailable,
            };
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
          return {
            ...bed,
            available: nextAvailable,
            occupied: bed.staffed - nextAvailable,
          };
        }),
      };
    });
  }, [scenario, lastRefresh]);

  const filteredHospitals = useMemo(() => {
    return scenarioHospitals.filter((hospital) => region === 'All' || hospital.region === region);
  }, [scenarioHospitals, region]);

  const scenarioAlerts = useMemo(() => {
    const baseAlerts = [...alerts];

    if (scenario === 'surge') {
      return [
        {
          id: 'scenario-surge',
          level: 'warning' as const,
          title: 'Regional surge activated',
          detail:
            'ED boarding, ICU saturation, and ambulance queue times are elevated across multiple facilities.',
          time: 'Now',
        },
        ...baseAlerts,
      ];
    }

    if (scenario === 'degraded') {
      return [
        {
          id: 'scenario-degraded',
          level: 'critical' as const,
          title: 'Network degradation detected',
          detail:
            'One or more facility feeds are delayed. Fallback validation and transport coordination paths are active.',
          time: 'Now',
        },
        ...baseAlerts,
      ];
    }

    if (scenario === 'incident') {
      return [
        {
          id: 'scenario-incident',
          level: 'critical' as const,
          title: 'Incident mode active',
          detail:
            'Command posture elevated. Diversion and high-acuity routing should be coordinated centrally.',
          time: 'Now',
        },
        ...baseAlerts,
      ];
    }

    return baseAlerts;
  }, [scenario]);

  const statewideTotals = useMemo(() => {
    let staffed = 0;
    let available = 0;
    let occupied = 0;
    let ambulanceQueue = 0;
    let wallTimeTotal = 0;

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

    const avgWallTime = filteredHospitals.length
      ? Math.round(wallTimeTotal / filteredHospitals.length)
      : 0;

    const availablePct = staffed ? Math.round((available / staffed) * 100) : 0;
    const utilizationPct = staffed ? Math.round((occupied / staffed) * 100) : 0;

    return {
      staffed,
      available,
      occupied,
      availablePct,
      utilizationPct,
      ambulanceQueue,
      avgWallTime,
    };
  }, [filteredHospitals, bedType]);

  const facilityBuckets = useMemo(() => {
    return filteredHospitals.reduce(
      (acc, hospital) => {
        const relevantBeds =
          bedType === 'All'
            ? hospital.beds
            : hospital.beds.filter((bed) => bed.type === bedType);
        const staffed = relevantBeds.reduce((sum, bed) => sum + bed.staffed, 0);
        const available = relevantBeds.reduce((sum, bed) => sum + bed.available, 0);
        const availablePercent = staffed ? Math.round((available / staffed) * 100) : 0;
        acc[getFacilityChipBucket(availablePercent)] += 1;
        return acc;
      },
      { healthy: 0, watch: 0, strained: 0, critical: 0 }
    );
  }, [filteredHospitals, bedType]);

  const chartPoints = useMemo(() => {
    if (scenario === 'incident') return [88, 84, 79, 73, 68, 64, 61];
    if (scenario === 'surge') return [90, 87, 81, 76, 72, 69, 66];
    if (scenario === 'degraded') return [91, 89, 85, 83, 80, 78, 76];
    return [92, 90, 88, 86, 84, 83, 82];
  }, [scenario]);

  const ribbonInputs = useMemo(() => {
    const hospitalsTotal = filteredHospitals.length;
    const adultIcu = filteredHospitals.reduce(
      (totals, hospital) => {
        const icu = hospital.beds.find((bed) => bed.type === 'Adult ICU');
        totals.staffed += icu?.staffed ?? 0;
        totals.available += icu?.available ?? 0;
        return totals;
      },
      { staffed: 0, available: 0 }
    );

    const icuCapacityPercent = adultIcu.staffed
      ? Math.round((adultIcu.available / adultIcu.staffed) * 100)
      : null;

    const hospitalsOnDiversion = filteredHospitals.filter(
      (hospital) => hospital.status === 'Diversion' || hospital.status === 'Internal Disaster'
    ).length;

    const hospitalsReporting =
      scenario === 'degraded' && hospitalsTotal >= 4 ? hospitalsTotal - 1 : hospitalsTotal;

    return {
      icuCapacityPercent,
      hospitalsOnDiversion,
      hospitalsReporting,
      hospitalsTotal,
    };
  }, [filteredHospitals, scenario]);

  const ribbonStatus = useMemo(() => computeStatewideOperationalStatus(ribbonInputs), [ribbonInputs]);
  const latestUpdateLabel = formatClock(lastRefresh);
  const activeFeedHealth =
    scenario === 'degraded'
      ? 'Feed validation active on delayed facilities.'
      : 'Automated reporting is advancing continuously across the network.';

  const bedCensusStatus = getBedCensusStatus(statewideTotals.availablePct);
  const capacityStatus = getCapacityPressureStatus(statewideTotals.utilizationPct);

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
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
        </div>
      </section>

      <section className="topbar platform-header">
        <div className="header-stack">
          <div className="eyebrow operational">
            <ShieldCheck size={16} />
            Secure operational view
          </div>
          <h1>HBEDS Operational Platform</h1>
          <div className="header-powered">Powered by MeshMill&apos;s M.A.R.I.O. Interoperability Engine</div>
          <p className="subtitle header-tagline">
            Real-time staffed bed availability, multi-hospital coordination, and statewide
            operational intelligence across hospitals and EMS.
          </p>
        </div>

        <div className="topbar-actions">
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
                <StatusPill tone="green">{facilityBuckets.healthy} Healthy Facilities</StatusPill>
                <StatusPill tone="amber">{facilityBuckets.watch} Watch</StatusPill>
                <StatusPill tone="amber">{facilityBuckets.strained} Strained</StatusPill>
                <StatusPill tone="red">{facilityBuckets.critical} Critical</StatusPill>
              </div>
            </div>

            <div className="hero-metrics">
              <div className="stat-card tone-green">
                <div className="stat-topline">
                  <div className="stat-label">Bed Census</div>
                  <StatusPill tone={bedCensusStatus.tone}>{bedCensusStatus.label}</StatusPill>
                </div>
                <div className="stat-value">
                  {formatNumber(statewideTotals.occupied)} / {formatNumber(statewideTotals.available)} /{' '}
                  {formatNumber(statewideTotals.staffed)}
                </div>
                <div className="stat-helper">{statewideTotals.availablePct}% available across staffed beds</div>
              </div>

              <div className="stat-card tone-blue">
                <div className="stat-topline">
                  <div className="stat-label">Capacity Pressure</div>
                  <StatusPill tone={capacityStatus.tone}>{capacityStatus.label}</StatusPill>
                </div>
                <div className="stat-value">{statewideTotals.utilizationPct}%</div>
                <div className="stat-helper">System-wide staffed bed utilization</div>
              </div>

              <div className="stat-card tone-amber">
                <div className="stat-label">Ambulance Queue</div>
                <div className="stat-value">{formatNumber(statewideTotals.ambulanceQueue)}</div>
                <div className="stat-helper">Queued transports across selected facilities</div>
              </div>

              <div className="stat-card tone-red">
                <div className="stat-label">EMS Offload Time</div>
                <div className="stat-value">{statewideTotals.avgWallTime}m</div>
                <div className="stat-helper">Average time-to-offload under active conditions</div>
              </div>
            </div>
          </div>

          <InteroperabilityFeedHealth scenario={scenario} />
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
                <strong>{scenario === 'degraded' ? '35 live / 5 validating' : '40 live / 0 delayed'}</strong>
                <span>EHR integrations keep normalized operational objects moving in real time.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="support-card-grid">
        <div className="panel support-card">
          <div className="section-head compact">
            <div>
              <h3>
                <Clock3 size={18} />
                Reporting Status
              </h3>
              <p>Real-time reporting status and compliance with CDPH and CDC/NHSN requirements.</p>
            </div>
            <StatusPill tone={scenario === 'degraded' ? 'amber' : 'green'}>
              {scenario === 'degraded' ? 'At risk' : 'Compliant'}
            </StatusPill>
          </div>

          <div className="reporting-grid">
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
          </div>
        </div>

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
            <div className="security-item">
              <span>Authentication</span>
              <strong>SSO + MFA</strong>
            </div>
            <div className="security-item">
              <span>Access Control</span>
              <strong>RBAC enforced</strong>
            </div>
            <div className="security-item">
              <span>Audit Logging</span>
              <strong>Enabled</strong>
            </div>
            <div className="security-item">
              <span>Session Security</span>
              <strong>Encrypted (TLS 1.2+)</strong>
            </div>
            <div className="security-item">
              <span>User Scope</span>
              <strong>Role- and jurisdiction-based</strong>
            </div>
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

      <section className="main-grid">
        <div className="left-stack">
          <CaliforniaCapacityMap hospitals={filteredHospitals} selectedBedType={bedType} />

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
                          <strong>
                            {available} / {staffed}
                          </strong>
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
                <span>
                  <i className="legend-dot blue" />
                  Available capacity
                </span>
                <span>
                  <i className="legend-dot amber" />
                  Stress threshold
                </span>
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

              <line
                x1="40"
                y1="95"
                x2="680"
                y2="95"
                stroke="var(--amber)"
                strokeDasharray="6 6"
                opacity="0.7"
              />

              {chartPoints.map((point, index) => {
                const x = 40 + index * 106;
                const y = 170 - point;
                const next = chartPoints[index + 1];

                return (
                  <g key={index}>
                    {next !== undefined && (
                      <line
                        x1={x}
                        y1={y}
                        x2={40 + (index + 1) * 106}
                        y2={170 - next}
                        stroke="var(--blue)"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    )}
                    <circle cx={x} cy={y} r="5" fill="var(--blue)" />
                    <text x={x} y="192" textAnchor="middle" className="chart-label">
                      H{index + 1}
                    </text>
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
                <p>Critical, warning, and informational operational updates.</p>
              </div>
            </div>

            <div className="alert-list">
              {scenarioAlerts.map((alert) => (
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
                <p>Operational indicators relevant to patient movement and offload pressure.</p>
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

                  <StatusPill
                    tone={item.tone === 'good' ? 'green' : item.tone === 'warn' ? 'amber' : 'red'}
                  >
                    {item.tone}
                  </StatusPill>
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

      <ScenarioSimulation scenario={scenario} onChangeScenario={setScenario} />
    </div>
  );
}
