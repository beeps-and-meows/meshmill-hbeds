import { Database, FileJson } from 'lucide-react';

type ScenarioMode = 'normal' | 'surge' | 'degraded' | 'incident';

interface InteroperabilityFeedHealthProps {
  scenario: ScenarioMode;
}

export function InteroperabilityFeedHealth({
  scenario,
}: InteroperabilityFeedHealthProps) {
  const matrix = Array.from({ length: 40 }, (_, i) => {
    if (scenario === 'degraded') {
      if (i === 3 || i === 11 || i === 18) return { id: i + 1, status: 'red' };
      if (i === 7 || i === 24) return { id: i + 1, status: 'amber' };
    }

    if (scenario === 'incident') {
      if (i === 8 || i === 23) return { id: i + 1, status: 'amber' };
    }

    return { id: i + 1, status: 'green' };
  });

  const networkSummary =
    scenario === 'degraded'
      ? '3.8s · 18.5% loss'
      : scenario === 'incident'
        ? '1.9s · 6.1% loss'
        : scenario === 'surge'
          ? '1.7s · 4.2% loss'
          : '1.4s · 1.2% loss';

  return (
    <div className="panel interoperability-panel">
      <div className="section-head compact">
        <div>
          <h3>
            <Database size={18} />
            Interoperability & Feed Health
          </h3>
          <p>
            Network readiness, live facility connections, onboarding progress, and normalized data
            flow.
          </p>
        </div>
      </div>

      <div className="network-ribbon">
        <span className="network-label">Network</span>
        <span className="network-chip">Fiber</span>
        <span className="network-chip">LTE / FirstNet</span>
        <span className="network-chip">Satellite</span>
        <span className={`network-chip ${scenario === 'degraded' ? 'degraded' : ''}`}>
          {scenario === 'degraded' ? 'Degraded' : 'Healthy'}
        </span>
        <strong>{networkSummary}</strong>
      </div>

      <div className="interop-grid">
        <div className="connection-card">
          <div className="connection-head">
            <strong>M.A.R.I.O.™ Hospital Connection Matrix</strong>
            <span>
              {scenario === 'degraded' ? '35 / 40 live' : scenario === 'incident' ? '38 / 40 live' : '40 / 40 live'}
            </span>
          </div>

          <div className="connection-dots">
            {matrix.map((item) => (
              <span
                key={item.id}
                className={`connection-dot ${item.status}`}
                title={`Facility ${item.id}`}
              />
            ))}
          </div>

          <div className="connection-legend">
            <span>
              <i className="dot green" /> Live
            </span>
            <span>
              <i className="dot amber" /> Validating
            </span>
            <span>
              <i className="dot red" /> Feed failure
            </span>
          </div>
        </div>

        <div className="normalize-card">
          <div className="normalize-head">
            <FileJson size={16} />
            <strong>EHR Normalization Viewer</strong>
          </div>

          <div className="normalize-columns">
            <div className="code-card">
              <div className="code-title">Input (Epic EHR — Raw)</div>
              <pre>{`{
  "ICU_BEDS_AVAILABLE": 12,
  "ER_BEDS_AVAILABLE": 8,
  "staffedBeds": 340,
  "divert_status": "ACTIVE",
  "facilityCode": "SFR_001"
}`}</pre>
            </div>

            <div className="code-card">
              <div className="code-title">Normalized Operational Object</div>
              <pre>{`{
  "facilityId": "HOSP_SF_001",
  "bedType": "ICU",
  "available": 12,
  "staffed": 340,
  "diversion": true,
  "transport": ["ground", "air"],
  "region": "bay_area",
  "ehrSource": "Epic FHIR"
}`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
