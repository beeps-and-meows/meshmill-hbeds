import { ArrowRight, Route, ShieldPlus } from 'lucide-react';
import { StatusPill } from './StatusPill';

type ScenarioMode = 'normal' | 'surge' | 'degraded' | 'incident';

interface IncidentCoordinationProps {
  scenario: ScenarioMode;
}

const capabilities = [
  { label: 'Trauma ICU', note: 'Major trauma / surgical ICU', tone: 'red' },
  { label: 'Psych Safe', note: 'Behavioral crisis / suicide risk', tone: 'slate' },
  { label: 'Pediatric / NICU', note: 'Infant and child specialty care', tone: 'blue' },
  { label: 'Toxicology', note: 'Poisoning / chemical ingestion', tone: 'amber' },
  { label: 'Medical Bed', note: 'General inpatient capacity', tone: 'green' },
] as const;

export function IncidentCoordination({ scenario }: IncidentCoordinationProps) {
  const priority =
    scenario === 'incident'
      ? 'Priority 1 · Critical'
      : scenario === 'surge'
        ? 'Priority 2 · Urgent'
        : scenario === 'degraded'
          ? 'Priority 2 · Watch'
          : 'Priority 3 · Stable';

  const destination =
    scenario === 'incident'
      ? 'LA Trauma Center'
      : scenario === 'surge'
        ? 'Central Valley Medical'
        : scenario === 'degraded'
          ? 'Fallback Regional Hub'
          : 'SF Regional';

  const mode =
    scenario === 'incident'
      ? 'Helicopter'
      : scenario === 'surge'
        ? 'ALS Ground'
        : scenario === 'degraded'
          ? 'Fallback Ground'
          : 'Standard EMS';

  const ttc =
    scenario === 'incident'
      ? '9 min'
      : scenario === 'surge'
        ? '14 min'
        : scenario === 'degraded'
          ? '18 min'
          : '11 min';

  const need =
    scenario === 'incident'
      ? 'Trauma ICU'
      : scenario === 'surge'
        ? 'Medical / ICU'
        : scenario === 'degraded'
          ? 'Validated Transfer'
          : 'General Acute';

  const tone =
    scenario === 'incident'
      ? 'red'
      : scenario === 'surge' || scenario === 'degraded'
        ? 'amber'
        : 'green';

  const blockedFacility =
    scenario === 'incident'
      ? 'Closest trauma site on diversion'
      : scenario === 'surge'
        ? 'Nearest ICU is saturated'
        : scenario === 'degraded'
          ? 'Primary facility feed unverified'
          : 'No immediate blockage';

  const rerouteReason =
    scenario === 'incident'
      ? 'High-acuity trauma patient rerouted to open specialty destination.'
      : scenario === 'surge'
        ? 'EMS identifies the nearest facility with staffed ICU headroom and acceptable offload time.'
        : scenario === 'degraded'
          ? 'Fallback validation confirms the safest receiving site before transport is committed.'
          : 'Standard routing confirms the closest appropriate destination in normal operations.';

  return (
    <div className="panel incident-coordination">
      <div className="section-head compact">
        <div>
          <h3>
            <Route size={18} />
            Incident Coordination
          </h3>
          <p>Recommended routing, destination priority, and transport guidance.</p>
        </div>
      </div>

      <div className="incident-grid">
        <div className="routing-card">
          <div className="routing-map">
            <div className="routing-node north">SF Regional</div>
            <div className="routing-node central">Central Valley Medical</div>
            <div className="routing-node south">LA Trauma Center</div>
            <div className="routing-node sd">San Diego Crisis Unit</div>

            <div className="route-arrow route-arrow-1" />
            <div className="route-arrow route-arrow-2" />

            <div className="route-callout">
              <strong>Recommended route</strong>
              <div>🚑 {destination} · TTC {ttc}</div>
            </div>
          </div>

          <div className="decision-flow">
            <div className="decision-step blocked">
              <span className="decision-label">Before</span>
              <strong>{blockedFacility}</strong>
              <p>
                EMS starts with the closest option, but available staffed capacity or feed confidence
                blocks immediate placement.
              </p>
            </div>
            <ArrowRight size={16} className="decision-arrow" />
            <div className="decision-step routed">
              <span className="decision-label">After</span>
              <strong>{destination}</strong>
              <p>{rerouteReason}</p>
            </div>
          </div>
        </div>

        <div className="priority-stack">
          <div className="priority-card">
            <div className="priority-top">
              <StatusPill tone={tone}>{priority}</StatusPill>
              <div className="priority-code">
                {scenario === 'incident'
                  ? 'P1'
                  : scenario === 'surge'
                    ? 'P2'
                    : scenario === 'degraded'
                      ? 'P2'
                      : 'P3'}
              </div>
            </div>

            <div className="priority-body">
              <div className="priority-row">
                <span>Need</span>
                <strong>{need}</strong>
              </div>
              <div className="priority-row">
                <span>Mode</span>
                <strong>{mode}</strong>
              </div>
              <div className="priority-row">
                <span>Destination</span>
                <strong>{destination}</strong>
              </div>
              <div className="priority-row">
                <span>Time-to-Care</span>
                <strong>{ttc}</strong>
              </div>
            </div>
          </div>

          <div className="capability-card">
            <div className="capability-title">
              <ShieldPlus size={16} />
              <strong>Capability Legend</strong>
            </div>

            <div className="capability-list">
              {capabilities.map((item) => (
                <div className="capability-item" key={item.label}>
                  <StatusPill tone={item.tone}>{item.label}</StatusPill>
                  <span>{item.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
