import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ambulance,
  Building2,
  Clock3,
  Download,
  Filter,
  HeartPulse,
  LogOut,
  MapPinned,
  RefreshCcw,
  Shield,
  Siren,
  Workflow,
  Moon, 
  SunMedium,
} from 'lucide-react';
import { LoginScreen } from './components/LoginScreen';
import { StatusPill } from './components/StatusPill';
import { StatCard } from './components/StatCard';
import { TrendChart } from './components/TrendChart';
import { CaliforniaCapacityMap } from './components/CaliforniaCapacityMap';

import {
  alerts,
  bedTypes,
  emsMetrics,
  eventFeed,
  historicalTrend,
  hospitals,
  onboardingSites,
  rfpAlignment,
  summarizeHospitals,
  type BedType,
  type HospitalRecord,
  type RegionKey,
} from './lib/data';

type RegionFilter = 'All' | RegionKey;

type StatusFilter = 'All' | HospitalRecord['status'];

function formatPercent(available: number, staffed: number) {
  return `${Math.round((available / staffed) * 100)}%`;
}

function totalByType(record: HospitalRecord, bedType: BedType) {
  const item = record.beds.find((bed) => bed.type === bedType);
  return item?.available ?? 0;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [region, setRegion] = useState<RegionFilter>('All');
  const [bedType, setBedType] = useState<BedType | 'All'>('All');
  const [status, setStatus] = useState<StatusFilter>('All');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
  const saved = localStorage.getItem('hbeds-theme');
  return saved === 'light' ? 'light' : 'dark';
});

  useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('hbeds-theme', theme);
}, [theme]);

  const filteredHospitals = useMemo(() => {
    return hospitals.filter((hospital) => {
      const regionPass = region === 'All' || hospital.region === region;
      const statusPass = status === 'All' || hospital.status === status;
      const bedPass = bedType === 'All' || totalByType(hospital, bedType) >= 0;
      return regionPass && statusPass && bedPass;
    });
  }, [region, status, bedType]);

  const summary = summarizeHospitals(filteredHospitals);

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow operational">
            <Shield size={16} />
            Operational Engine · Secure Demo Session
          </div>
          <h1>Hospital Bed and Emergency Medical Services Data System</h1>
          <p className="subtitle">
            Enterprise-grade command visibility for hospital operators, CDPH administrators, and EMS incident leaders.
          </p>
        </div>
        <div className="topbar-actions">
          <button className="ghost-btn"><RefreshCcw size={16} /> Sync now</button>
          <button className="ghost-btn"><Download size={16} /> Export historical data</button>
          <button className="ghost-btn" onClick={() => setAuthenticated(false)}><LogOut size={16} /> Logout</button>
          <button  className="theme-toggle" onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
  aria-label="Toggle color mode"
  type="button"
>
  {theme === 'dark' ? <SunMedium size={16} /> : <Moon size={16} />}
  <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
</button>
        </div>
      </header>

      <section className="hero-grid">
        <div className="hero-panel glass">
          <div className="hero-status-row">
            <StatusPill tone="green">24/7 real-time dashboard</StatusPill>
            <StatusPill tone="amber">15-minute CDPH cadence</StatusPill>
            <StatusPill tone="slate">NHSN sync aware</StatusPill>
          </div>
          <div className="hero-metrics">
            <StatCard label="Available staffed beds" value={String(summary.totalAvailableBeds)} helper={`${summary.totalStaffedBeds} staffed beds in filtered view`} tone="green" />
            <StatCard label="Occupied beds" value={String(summary.totalOccupiedBeds)} helper="Operational utilization across all tracked bed types" tone="blue" />
            <StatCard label="Median EMS wall time" value={`${summary.medianWallTime} min`} helper="Helps incident command spot transfer pressure" tone="amber" />
            <StatCard label="Diversion / surge sites" value={`${summary.hospitalsInDiversion} / ${summary.hospitalsInSurge}`} helper="Diversion first, surge second" tone="red" />
          </div>
        </div>

        <div className="sync-card panel">
          <div className="section-head compact">
            <div>
              <h3>Compliance Snapshot</h3>
              <p>Modeled directly from the uploaded RFP requirements.</p>
            </div>
          </div>
          <div className="mini-grid">
            <div>
              <span className="mini-label">SSO + MFA</span>
              <strong>Simulated</strong>
            </div>
            <div>
              <span className="mini-label">CDC/NHSN feed</span>
              <strong>12:00 / pending 24:00</strong>
            </div>
            <div>
              <span className="mini-label">CDPH API push</span>
              <strong>Every 15 minutes</strong>
            </div>
            <div>
              <span className="mini-label">Access provisioning</span>
              <strong>&lt; 24 hours</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="filters panel">
        <div className="section-head compact">
          <div>
            <h3><Filter size={18} /> Operational Filters</h3>
            <p>Hospital, region, bed type, and operational status filtering aligned with the RFP.</p>
          </div>
        </div>
        <div className="filter-row">
          <label>
            Region
            <select value={region} onChange={(e) => setRegion(e.target.value as RegionFilter)}>
              <option>All</option>
              <option>Northern</option>
              <option>Bay Area</option>
              <option>Central</option>
              <option>Los Angeles</option>
              <option>Inland Empire</option>
              <option>San Diego</option>
            </select>
          </label>
          <label>
            Bed type
            <select value={bedType} onChange={(e) => setBedType(e.target.value as BedType | 'All')}>
              <option>All</option>
              {bedTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>
            Hospital status
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
              <option>All</option>
              <option>Normal</option>
              <option>Surge</option>
              <option>Diversion</option>
              <option>Internal Disaster</option>
            </select>
          </label>
          <div className="filter-note">
            <Clock3 size={16} /> Last statewide refresh: 13:47 PT
          </div>
        </div>
      </section>

      <section className="main-grid">
        <div className="left-stack">
        <CaliforniaCapacityMap hospitals={filteredHospitals} selectedBedType={bedType}/>
          <div className="panel">
            <div className="section-head">
              <div>
                <h3><Building2 size={18} /> Facility Operational View</h3>
                <p>Real-time staffed-bed availability, status, EMS pressure, and reporting health.</p>
              </div>
              <StatusPill tone="slate">{filteredHospitals.length} facilities in scope</StatusPill>
            </div>
            <div className="hospital-table-wrap">
              <table className="hospital-table">
                <thead>
                  <tr>
                    <th>Facility</th>
                    <th>Region</th>
                    <th>Status</th>
                    <th>Available / Staffed</th>
                    <th>EMS</th>
                    <th>Integration</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHospitals.map((hospital) => {
                    const staffed = hospital.beds.reduce((sum, bed) => sum + bed.staffed, 0);
                    const available = hospital.beds.reduce((sum, bed) => sum + bed.available, 0);
                    const tone = hospital.status === 'Diversion' || hospital.status === 'Internal Disaster'
                      ? 'red'
                      : hospital.status === 'Surge'
                        ? 'amber'
                        : 'green';
                    return (
                      <tr key={hospital.id}>
                        <td>
                          <div className="facility-title">{hospital.name}</div>
                          <div className="facility-sub">{hospital.county} County · Trauma {hospital.traumaLevel}</div>
                        </td>
                        <td>{hospital.region}</td>
                        <td><StatusPill tone={tone}>{hospital.status}</StatusPill></td>
                        <td>
                          <strong>{available}</strong>
                          <span className="muted"> / {staffed} · {formatPercent(available, staffed)}</span>
                        </td>
                        <td>
                          <div>{hospital.emsWallTimeMinutes} min wall time</div>
                          <span className="muted">{hospital.ambulanceQueue} units queued</span>
                        </td>
                        <td>
                          <div>{hospital.reportingMethod}</div>
                          <span className="muted">{hospital.ehr}</span>
                        </td>
                        <td className="notes-cell">{hospital.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <TrendChart data={historicalTrend} />

          <div className="panel">
            <div className="section-head">
              <div>
                <h3><Workflow size={18} /> RFP-to-Product Alignment</h3>
                <p>What this demo visibly covers from the uploaded solicitation.</p>
              </div>
            </div>
            <div className="alignment-grid">
              {rfpAlignment.map((item) => (
                <article className="alignment-card" key={item.title}>
                  <h4>{item.title}</h4>
                  <p>{item.summary}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="right-stack">
          <div className="panel alert-panel">
            <div className="section-head compact">
              <div>
                <h3><Siren size={18} /> Live Alert Ribbon</h3>
                <p>Operational color language for high-stress environments.</p>
              </div>
            </div>
            <div className="alert-list">
              {alerts.map((alert) => (
                <div className={`alert-item ${alert.level}`} key={alert.id}>
                  <div>
                    <div className="alert-title">{alert.title}</div>
                    <p>{alert.detail}</p>
                  </div>
                  <span className="alert-time">{alert.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="section-head compact">
              <div>
                <h3><Ambulance size={18} /> EMS Metrics</h3>
                <p>Designed for field operations and county coordination.</p>
              </div>
            </div>
            <div className="metric-list">
              {emsMetrics.map((metric) => (
                <div className="metric-item" key={metric.label}>
                  <div>
                    <span className="metric-label">{metric.label}</span>
                    <strong className="metric-value">{metric.value}</strong>
                  </div>
                  <StatusPill tone={metric.tone === 'good' ? 'green' : metric.tone === 'warn' ? 'amber' : 'red'}>
                    {metric.trend}
                  </StatusPill>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="section-head compact">
              <div>
                <h3><HeartPulse size={18} /> Bed Type Distribution</h3>
                <p>Modeled from the mandatory bed-visibility requirement.</p>
              </div>
            </div>
            <div className="bed-breakdown">
              {bedTypes.map((type) => {
                const staffed = filteredHospitals.reduce((sum, hospital) => sum + (hospital.beds.find((bed) => bed.type === type)?.staffed ?? 0), 0);
                const available = filteredHospitals.reduce((sum, hospital) => sum + (hospital.beds.find((bed) => bed.type === type)?.available ?? 0), 0);
                const pct = staffed ? Math.round((available / staffed) * 100) : 0;
                return (
                  <div className="bed-row" key={type}>
                    <div>
                      <strong>{type}</strong>
                      <span>{available} available of {staffed} staffed</span>
                    </div>
                    <div className="bar-shell">
                      <div className="bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <div className="section-head compact">
              <div>
                <h3><MapPinned size={18} /> Activation & Onboarding</h3>
                <p>Participation agreements, build milestones, validation, and go-live.</p>
              </div>
            </div>
            <div className="onboarding-list">
              {onboardingSites.map((site) => (
                <div className="onboarding-item" key={site.hospital}>
                  <div>
                    <strong>{site.hospital}</strong>
                    <span>{site.owner}</span>
                  </div>
                  <div className="right-align">
                    <StatusPill tone={site.phase === 'Live' ? 'green' : site.phase === 'Validation' ? 'amber' : 'slate'}>{site.phase}</StatusPill>
                    <span className="muted">ETA: {site.eta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="section-head compact">
              <div>
                <h3><AlertTriangle size={18} /> Event Stream</h3>
                <p>Fast scan operational log for command staff.</p>
              </div>
            </div>
            <div className="feed-list">
              {eventFeed.map((item) => (
                <div className="feed-item" key={item.id}>
                  <span className="feed-time">{item.time}</span>
                  <div>
                    <strong>{item.category}</strong>
                    <p>{item.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
