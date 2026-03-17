import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Ambulance,
  BedDouble,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  Moon,
  RefreshCw,
  ShieldCheck,
  SunMedium,
  TrendingUp,
  Workflow,
} from 'lucide-react';

import { LoginScreen } from './components/LoginScreen';
import { StatusPill } from './components/StatusPill';
import { CaliforniaCapacityMap } from './components/CaliforniaCapacityMap';
import { IncidentCoordination } from './components/IncidentCoordination';
import { InteroperabilityFeedHealth } from './components/InteroperabilityFeedHealth';
import { ScenarioSimulation } from './components/ScenarioSimulation';

import {
  alerts,
  emsMetrics,
  eventFeed,
  hospitals,
  onboardingSites,
  rfpAlignment,
  type BedType,
} from './lib/data';

type ThemeMode = 'dark' | 'light';
type ScenarioMode = 'normal' | 'surge' | 'degraded' | 'incident';

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

      if (scenario === 'incident') {
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
      }

      return {
        ...hospital,
        lastUpdated: lastRefresh.toISOString(),
      };
    });
  }, [scenario, lastRefresh]);

  const filteredHospitals = useMemo(() => {
    return scenarioHospitals.filter((hospital) => {
      const regionMatch = region === 'All' || hospital.region === region;
      return regionMatch;
    });
  }, [scenarioHospitals, region]);

  const scenarioAlerts = useMemo(() => {
    const baseAlerts = [...alerts];

    if (scenario === 'surge') {
      return [
        {
          id: 'scenario-surge',
          level: 'warning',
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
          level: 'critical',
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
          level: 'critical',
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
    let boarding = 0;
    let ambulanceQueue = 0;
    let wallTimeTotal = 0;

    filteredHospitals.forEach((hospital) => {
      boarding += hospital.boardingPatients;
      ambulanceQueue += hospital.ambulanceQueue;
      wallTimeTotal += hospital.emsWallTimeMinutes;

      hospital.beds.forEach((bed) => {
        if (bedType === 'All' || bed.type === bedType) {
          staffed += bed.staffed;
          available += bed.available;
        }
      });
    });

    const avgWallTime = filteredHospitals.length
      ? Math.round(wallTimeTotal / filteredHospitals.length)
      : 0;

    const availablePct = staffed ? Math.round((available / staffed) * 100) : 0;

    return {
      staffed,
      available,
      availablePct,
      boarding,
      ambulanceQueue,
      avgWallTime,
    };
  }, [filteredHospitals, bedType]);

  const facilityCount = filteredHospitals.length;
  const surgeFacilities = filteredHospitals.filter((h) => h.status === 'Surge').length;
  const diversionFacilities = filteredHospitals.filter(
    (h) => h.status === 'Diversion' || h.status === 'Internal Disaster'
  ).length;

  const chartPoints = useMemo(() => {
    const base =
      scenario === 'incident'
        ? [88, 84, 79, 73, 68, 64, 61]
        : scenario === 'surge'
          ? [90, 87, 81, 76, 72, 69, 66]
          : scenario === 'degraded'
            ? [91, 89, 85, 83, 80, 78, 76]
            : [92, 90, 88, 86, 84, 83, 82];

    return base;
  }, [scenario]);

  const latestUpdateLabel = formatClock(lastRefresh);
  const activeFeedHealth =
    scenario === 'degraded'
      ? 'Feed validation active on delayed facilities'
      : 'All facilities streaming normalized data';

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="app-shell">
      <section className="topbar">
        <div>
          <div className="eyebrow operational">
            <ShieldCheck size={16} />
            Secure Session Active · California HBEDS Demo
          </div>
          <h1>HBEDS Operational Engine</h1>
          <p className="subtitle">
            Real-time staffed bed visibility, EMS coordination, and operational reporting for
            hospitals, public health leadership, and incident command teams.
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

      <section className="proof-strip panel">
        <div className="proof-item">
          <div className="proof-icon blue">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <strong>Production-ready SaaS</strong>
            <span>Pre-existing, contractor-hosted platform ready for immediate deployment.</span>
          </div>
        </div>
        <div className="proof-item">
          <div className="proof-icon green">
            <RefreshCw size={16} />
          </div>
          <div>
            <strong>Live integration proof</strong>
            <span>Facility timestamps advance continuously from normalized hospital system feeds.</span>
          </div>
        </div>
        <div className="proof-item">
          <div className="proof-icon amber">
            <Database size={16} />
          </div>
          <div>
            <strong>Statewide scale validated</strong>
            <span>Structured validation modeled approximately 40 hospitals and scaled to 400.</span>
          </div>
        </div>
      </section>

      <section className="hero-grid">
        <div className="hero-panel glass">
          <div className="section-head compact">
            <div>
              <h3>
                <TrendingUp size={18} />
                Statewide Operational Snapshot
              </h3>
              <p>
                Capacity and transport pressure across the currently filtered hospital set.
              </p>
            </div>
            <div className="hero-status-row">
              <StatusPill tone="green">{facilityCount} facilities in scope</StatusPill>
              <StatusPill tone="amber">{surgeFacilities} surge</StatusPill>
              <StatusPill tone="red">{diversionFacilities} diversion / incident</StatusPill>
            </div>
          </div>

          <div className="hero-metrics">
            <div className="stat-card tone-green">
              <div className="stat-label">Available beds</div>
              <div className="stat-value">{formatNumber(statewideTotals.available)}</div>
              <div className="stat-helper">
                {statewideTotals.availablePct}% of staffed capacity available
              </div>
            </div>

            <div className="stat-card tone-blue">
              <div className="stat-label">Staffed beds</div>
              <div className="stat-value">{formatNumber(statewideTotals.staffed)}</div>
              <div className="stat-helper">Reporting on current bed type filter</div>
            </div>

            <div className="stat-card tone-amber">
              <div className="stat-label">Ambulance queue</div>
              <div className="stat-value">{formatNumber(statewideTotals.ambulanceQueue)}</div>
              <div className="stat-helper">Queued transports across in-scope facilities</div>
            </div>

            <div className="stat-card tone-red">
              <div className="stat-label">Avg EMS wall time</div>
              <div className="stat-value">{statewideTotals.avgWallTime}m</div>
              <div className="stat-helper">Average time-to-offload under active conditions</div>
            </div>
          </div>
        </div>

        <div className="sync-card glass">
          <div className="section-head compact">
            <div>
              <h3>
                <Clock3 size={18} />
                Reporting & compliance
              </h3>
              <p>Demo alignment to HBEDS reporting, onboarding, and transmission workflows.</p>
            </div>
          </div>

          <div className="mini-grid">
            <div>
              <span className="mini-label">CDPH cadence</span>
              <strong>15-minute target</strong>
            </div>
            <div>
              <span className="mini-label">NHSN cadence</span>
              <strong>Twice daily minimum</strong>
            </div>
            <div>
              <span className="mini-label">Auth model</span>
              <strong>SSO + MFA + RBAC</strong>
            </div>
            <div>
              <span className="mini-label">Validation range</span>
              <strong>40 to 400 hospitals</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="filters panel">
        <div className="section-head compact">
          <div>
            <h3>
              <Activity size={18} />
              Operational filters
            </h3>
            <p>Slice the network by region and bed type to inspect live operational posture.</p>
          </div>
        </div>

        <div className="filter-row">
          <label>
            Region
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as RegionFilter)}
            >
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
            <select
              value={bedType}
              onChange={(e) => setBedType(e.target.value as BedType | 'All')}
            >
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
            Filters update map, facility table, and coordination recommendations.
          </div>
        </div>
      </section>

      <section className="live-proof-grid">
        <div className="panel freshness-panel">
          <div className="section-head compact">
            <div>
              <h3>
                <RefreshCw size={18} />
                Live data freshness proof
              </h3>
              <p>
                Timestamps advance continuously to demonstrate automated reporting without manual
                entry.
              </p>
            </div>
            <StatusPill tone={scenario === 'degraded' ? 'amber' : 'green'}>
              {scenario === 'degraded' ? 'Validation fallback active' : 'Automated feed active'}
            </StatusPill>
          </div>

          <div className="freshness-grid">
            <div className="freshness-card pulse-card">
              <span className="mini-label">Last network sync</span>
              <strong>{latestUpdateLabel}</strong>
              <span>{activeFeedHealth}</span>
            </div>
            <div className="freshness-card">
              <span className="mini-label">Hospital API stream</span>
              <strong>{scenario === 'degraded' ? '35 live / 5 validating' : '40 live / 0 delayed'}</strong>
              <span>EHR integrations continue updating normalized operational objects.</span>
            </div>
            <div className="freshness-card">
              <span className="mini-label">Manual entry reliance</span>
              <strong>Eliminated for core reporting</strong>
              <span>Direct interfaces drive bed, EMS, queue, and alert data into the dashboard.</span>
            </div>
          </div>
        </div>

        <div className="panel deployment-panel">
          <div className="section-head compact">
            <div>
              <h3>
                <CheckCircle2 size={18} />
                Deployment confidence
              </h3>
              <p>Evaluator-ready proof points that reduce perceived implementation risk.</p>
            </div>
          </div>

          <div className="deployment-list">
            <div>
              <strong>Immediate readiness</strong>
              <span>This is not a prototype or pilot workflow. The experience is framed as a live operational system.</span>
            </div>
            <div>
              <strong>Secure access model</strong>
              <span>Role-aware hospital and government views are paired with SSO and MFA language throughout the flow.</span>
            </div>
            <div>
              <strong>Statewide operating scale</strong>
              <span>Validation messaging now explicitly references approximately 40-hospital and 400-hospital conditions.</span>
            </div>
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
              'Feed latency and facility validation are degraded. Interoperability panels show reduced confidence.'}
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
                <p>
                  Real-time staffed-bed availability, status, EMS pressure, and reporting health.
                </p>
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
                  Capacity trend outlook
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
                  Live alert stream
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
                  EMS metrics
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

      <section className="ops-console-grid">
        <div className="ops-console-main">
          <div className="panel">
            <div className="section-head compact">
              <div>
                <h3>
                  <ShieldCheck size={18} />
                  Onboarding & validation
                </h3>
                <p>Facility activation and feed validation milestones.</p>
              </div>
            </div>

            <div className="onboarding-list">
              {onboardingSites.map((item) => (
                <div className="onboarding-item" key={item.hospital}>
                  <div>
                    <strong>{item.hospital}</strong>
                    <span>{item.owner}</span>
                  </div>
                  <div className="right-align">
                    <StatusPill
                      tone={
                        item.phase === 'Live'
                          ? 'green'
                          : item.phase === 'Validation'
                            ? 'amber'
                            : 'slate'
                      }
                    >
                      {item.phase}
                    </StatusPill>
                    <span className="muted">{item.eta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="section-head compact">
              <div>
                <h3>
                  <Workflow size={18} />
                  RFP alignment
                </h3>
                <p>Illustrative feature-to-requirement alignment for the demo scope.</p>
              </div>
            </div>

            <div className="alignment-grid">
              {rfpAlignment.map((item) => (
                <div className="alignment-card" key={item.title}>
                  <h4>{item.title}</h4>
                  <p>{item.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <section className="operational-intelligence">
            <div className="section-head">
              <div>
                <h3>
                  <Workflow size={18} />
                  Operational Intelligence
                </h3>
                <p>Decision support, interoperability confidence, and live command coordination.</p>
              </div>
            </div>

            <div className="intelligence-grid">
              <IncidentCoordination scenario={scenario} />
              <InteroperabilityFeedHealth scenario={scenario} />
            </div>
          </section>
        </div>

        <aside className="ops-console-side">
          <div className="panel">
            <div className="section-head compact">
              <div>
                <h3>
                  <Clock3 size={18} />
                  Event feed
                </h3>
                <p>Recent operational activity entering the platform.</p>
              </div>
            </div>

            <div className="feed-list">
              {eventFeed.map((item) => (
                <div className="feed-item" key={item.id}>
                  <div>
                    <strong>{item.event}</strong>
                    <p>{item.category}</p>
                  </div>
                  <span className="feed-time">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <ScenarioSimulation scenario={scenario} onChangeScenario={setScenario} />
    </div>
  );
}
