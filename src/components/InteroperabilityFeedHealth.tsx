import { Activity, CircleAlert, Database, Wifi } from 'lucide-react';
import { StatusPill } from './StatusPill';

type ScenarioMode = 'normal' | 'surge' | 'degraded' | 'incident';
type HealthStatus = 'Healthy' | 'Degraded' | 'Critical';

interface InteroperabilityFeedHealthProps {
  scenario: ScenarioMode;
}

function getTone(status: HealthStatus) {
  if (status === 'Healthy') return 'green' as const;
  if (status === 'Degraded') return 'amber' as const;
  return 'red' as const;
}

export function InteroperabilityFeedHealth({
  scenario,
}: InteroperabilityFeedHealthProps) {
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
      (item) => item.label === 'Critical'
    )
      ? 'Critical'
      : [liveFeeds, networkConnectivity, marioEngine, acsSites, dataLatency].some(
            (item) => item.label === 'Degraded'
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
