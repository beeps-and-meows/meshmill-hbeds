import { Activity, CircleAlert, Database, Wifi } from 'lucide-react';
import { StatusPill } from './StatusPill';
import type { MonitoringStatus, ReportingStatus } from '../lib/api';

type ScenarioMode = 'normal' | 'surge' | 'degraded' | 'incident';
type HealthStatus = 'Healthy' | 'Degraded' | 'Critical';

interface InteroperabilityFeedHealthProps {
  scenario: ScenarioMode;
  monitoring?: MonitoringStatus[] | null;
  reporting?: ReportingStatus[] | null;
}

function getTone(status: HealthStatus) {
  if (status === 'Healthy') return 'green' as const;
  if (status === 'Degraded') return 'amber' as const;
  return 'red' as const;
}

function deriveFromLiveData(
  monitoring: MonitoringStatus[],
  reporting: ReportingStatus[],
) {
  const total = monitoring.length;
  const healthy = monitoring.filter((m) => m.heartbeatStatus === 'healthy').length;
  const delayed = monitoring.filter((m) => m.heartbeatStatus === 'delayed').length;
  const missing = monitoring.filter((m) => m.heartbeatStatus === 'missing').length;

  const connectionMethods = monitoring.map((m) => m.connectionMethod ?? 'Fiber');
  const hasCellular = connectionMethods.some((c) => c === 'Cellular');
  const hasSatellite = connectionMethods.some((c) => c === 'Satellite');

  const latencies = monitoring
    .map((m) => m.feedLatencyMs)
    .filter((v): v is number => v != null);
  const maxLatency = latencies.length ? Math.max(...latencies) : 0;
  const avgLatencyS = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length / 100) / 10
    : 0;

  const repSuccess = reporting.filter((r) => r.status === 'success').length;
  const repFailed = reporting.filter((r) => r.status === 'failed').length;

  // Live Feeds
  const feedLabel: HealthStatus =
    missing > 0 ? 'Critical' : delayed > 0 ? 'Degraded' : 'Healthy';
  const feedDetail = `${healthy} / ${total} healthy`;

  // Network Connectivity
  const connLabel: HealthStatus = hasSatellite
    ? 'Degraded'
    : hasCellular
      ? 'Degraded'
      : 'Healthy';
  const connDetail = hasSatellite
    ? 'Satellite fallback active'
    : hasCellular
      ? 'Cellular fallback active'
      : 'Fiber';

  // M.A.R.I.O. Engine
  const marioLabel: HealthStatus = missing > 1 ? 'Degraded' : 'Healthy';
  const marioDetail = marioLabel === 'Degraded' ? 'Performance reduced' : 'Active';

  // ACS Sites (Set 3 has ACS, indicated by region data — approximate from surge context)
  const surgeFacilities = monitoring.filter((m) =>
    m.facilityId?.startsWith('ACS'),
  ).length;
  const acsLabel: HealthStatus = 'Healthy';
  const acsDetail =
    surgeFacilities > 0 ? `${surgeFacilities} sites online` : '0 sites required';

  // Data Latency
  const latencyLabel: HealthStatus =
    maxLatency > 5000 ? 'Critical' : maxLatency > 1500 ? 'Degraded' : 'Healthy';
  const latencyDetail = `${avgLatencyS}s avg`;

  // Reporting
  const repLabel: HealthStatus =
    repFailed > 0 ? 'Critical' : reporting.some((r) => r.status === 'delayed') ? 'Degraded' : 'Healthy';
  const repDetail = `${repSuccess} / ${reporting.length} submitted`;

  return {
    liveFeeds: { label: feedLabel, detail: feedDetail },
    networkConnectivity: { label: connLabel, detail: connDetail },
    marioEngine: { label: marioLabel, detail: marioDetail },
    acsSites: { label: acsLabel, detail: acsDetail },
    dataLatency: { label: latencyLabel, detail: latencyDetail },
    reporting: { label: repLabel, detail: repDetail },
  };
}

export function InteroperabilityFeedHealth({
  scenario,
  monitoring,
  reporting,
}: InteroperabilityFeedHealthProps) {
  // Use live data when available
  if (monitoring && monitoring.length > 0) {
    const live = deriveFromLiveData(monitoring, reporting ?? []);

    const allItems = [
      live.liveFeeds,
      live.networkConnectivity,
      live.marioEngine,
      live.acsSites,
      live.dataLatency,
    ];
    const platformHealth: HealthStatus = allItems.some((i) => i.label === 'Critical')
      ? 'Critical'
      : allItems.some((i) => i.label === 'Degraded')
        ? 'Degraded'
        : 'Healthy';

    return (
      <div className="panel platform-health-panel">
        <div className="section-head compact">
          <div>
            <h3>
              <Database size={18} />
              Platform Health
            </h3>
            <p title="Indicates real-time platform health, data feed reliability, and system performance.">
              Real-time platform health, data feed reliability, and system performance.
            </p>
            <div className="architecture-link-row">
              <span className="architecture-link-pill">Pipeline Stage 3</span>
              <span className="architecture-link-copy">
                Live data from {monitoring.length} facility feeds via M.A.R.I.O.
              </span>
            </div>
          </div>
          <StatusPill tone={getTone(platformHealth)}>{platformHealth}</StatusPill>
        </div>

        <div className="platform-health-list">
          {[
            { icon: <Activity size={15} />, label: 'Live Feeds', item: live.liveFeeds },
            { icon: <Wifi size={15} />, label: 'Network Connectivity', item: live.networkConnectivity },
            { icon: <Database size={15} />, label: 'Interoperability Engine (M.A.R.I.O.)', item: live.marioEngine },
            { icon: <CircleAlert size={15} />, label: 'ACS Sites Online', item: live.acsSites },
            { icon: <Activity size={15} />, label: 'Data Latency', item: live.dataLatency },
            { icon: <Activity size={15} />, label: 'Reporting Pipeline', item: live.reporting },
          ].map(({ icon, label, item }) => (
            <div className="platform-health-row" key={label}>
              <div className="platform-health-label">
                {icon}
                <span>{label}</span>
              </div>
              <div className="platform-health-value">
                <StatusPill tone={getTone(item.label)}>{item.label}</StatusPill>
                <strong>{item.detail}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Fallback: scenario-based static values ────────────────────────────────
  const liveFeeds =
    scenario === 'degraded'
      ? ({ label: 'Critical', detail: '278 / 400 reporting' } as const)
      : scenario === 'incident'
        ? ({ label: 'Degraded', detail: '332 / 400 reporting' } as const)
        : ({
            label: 'Healthy',
            detail: scenario === 'surge' ? '356 / 400 reporting' : '370 / 400 reporting',
          } as const);

  const networkConnectivity =
    scenario === 'degraded'
      ? ({ label: 'Degraded', detail: 'Cellular fallback' } as const)
      : ({ label: 'Healthy', detail: 'Fiber' } as const);

  const marioEngine =
    scenario === 'degraded'
      ? ({ label: 'Degraded', detail: 'Performance reduced' } as const)
      : ({ label: 'Healthy', detail: 'Active' } as const);

  const acsSites =
    scenario === 'surge' || scenario === 'incident'
      ? ({ label: 'Healthy', detail: '12 sites online' } as const)
      : ({ label: 'Healthy', detail: '0 sites required' } as const);

  const dataLatency =
    scenario === 'degraded'
      ? ({ label: 'Critical', detail: '68s' } as const)
      : scenario === 'incident'
        ? ({ label: 'Degraded', detail: '41s' } as const)
        : ({ label: 'Healthy', detail: scenario === 'surge' ? '24s' : '18s' } as const);

  const platformHealth =
    [liveFeeds, networkConnectivity, marioEngine, acsSites, dataLatency].some(
      (item) => item.label === 'Critical',
    )
      ? 'Critical'
      : [liveFeeds, networkConnectivity, marioEngine, acsSites, dataLatency].some(
            (item) => item.label === 'Degraded',
          )
        ? 'Degraded'
        : 'Healthy';

  return (
    <div className="panel platform-health-panel">
      <div className="section-head compact">
        <div>
          <h3>
            <Database size={18} />
            Platform Health
          </h3>
          <p title="Indicates real-time platform health, data feed reliability, and system performance.">
            Real-time platform health, data feed reliability, and system performance.
          </p>
          <div className="architecture-link-row">
            <span className="architecture-link-pill">Pipeline Stage 3</span>
            <span className="architecture-link-copy">
              Derived from ingestion reliability, validation health, and reporting-readiness checks.
            </span>
          </div>
        </div>
        <StatusPill tone={getTone(platformHealth)}>{platformHealth}</StatusPill>
      </div>

      <div className="platform-health-list">
        <div className="platform-health-row">
          <div className="platform-health-label">
            <Activity size={15} />
            <span>Live Feeds</span>
          </div>
          <div className="platform-health-value">
            <StatusPill tone={getTone(liveFeeds.label)}>{liveFeeds.label}</StatusPill>
            <strong>{liveFeeds.detail}</strong>
          </div>
        </div>

        <div className="platform-health-row">
          <div className="platform-health-label">
            <Wifi size={15} />
            <span>Network Connectivity</span>
          </div>
          <div className="platform-health-value">
            <StatusPill tone={getTone(networkConnectivity.label)}>{networkConnectivity.label}</StatusPill>
            <strong>{networkConnectivity.detail}</strong>
          </div>
        </div>

        <div className="platform-health-row">
          <div className="platform-health-label">
            <Database size={15} />
            <span>Interoperability Engine (M.A.R.I.O.)</span>
          </div>
          <div className="platform-health-value">
            <StatusPill tone={getTone(marioEngine.label)}>{marioEngine.label}</StatusPill>
            <strong>{marioEngine.detail}</strong>
          </div>
        </div>

        <div className="platform-health-row">
          <div className="platform-health-label">
            <CircleAlert size={15} />
            <span>ACS Sites Online</span>
          </div>
          <div className="platform-health-value">
            <StatusPill tone={getTone(acsSites.label)}>{acsSites.label}</StatusPill>
            <strong>{acsSites.detail}</strong>
          </div>
        </div>

        <div className="platform-health-row">
          <div className="platform-health-label">
            <Activity size={15} />
            <span>Data Latency</span>
          </div>
          <div className="platform-health-value">
            <StatusPill tone={getTone(dataLatency.label)}>{dataLatency.label}</StatusPill>
            <strong>{dataLatency.detail}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
