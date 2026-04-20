import { useState } from 'react';
import { ShieldCheck, LockKeyhole, ArrowRight, Activity, Building2, RadioTower } from 'lucide-react';

type LoginRole = 'facility' | 'state';

interface LoginScreenProps {
  facilities: Array<{ id: string; name: string; region: string }>;
  onLogin: (payload: { role: LoginRole; facilityId: string }) => void;
}

export function LoginScreen({ facilities, onLogin }: LoginScreenProps) {
  const [role, setRole] = useState<LoginRole>('facility');
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? '');

  return (
    <div className="login-shell">
      <div className="login-panel glass">
        <div className="eyebrow">
          <ShieldCheck size={16} />
          California CDPH · Mission-Critical Demo
        </div>
        <h1>HBEDS Operational Engine</h1>
        <p className="login-copy">
          Secure hospital bed visibility, EMS coordination, and real-time operational reporting
          through role-aware operational views.
        </p>

        <div className="feature-grid">
          <div className="feature-card">
            <Activity size={18} />
            <div>
              <strong>Real-time capacity</strong>
              <span>Staffed bed inventory by type, refreshed on a 15-minute operating cadence.</span>
            </div>
          </div>
          <div className="feature-card">
            <LockKeyhole size={18} />
            <div>
              <strong>Secure access model</strong>
              <span>Demo simulates SSO, privileged MFA, RBAC, and jurisdiction-based visibility.</span>
            </div>
          </div>
        </div>

        <div className="login-role-section">
          <div className="login-role-head">
            <strong>Login as</strong>
            <span>Pick the operational lens that matches the workflow you want to demonstrate.</span>
          </div>

          <div className="login-role-grid">
            <button
              type="button"
              className={`role-card ${role === 'facility' ? 'is-active' : ''}`}
              onClick={() => setRole('facility')}
            >
              <Building2 size={18} />
              <div>
                <strong>Facility Operations</strong>
                <span>Own-hospital detail with limited cross-facility placement visibility.</span>
              </div>
            </button>

            <button
              type="button"
              className={`role-card ${role === 'state' ? 'is-active' : ''}`}
              onClick={() => setRole('state')}
            >
              <RadioTower size={18} />
              <div>
                <strong>State Coordination</strong>
                <span>Aggregated statewide coordination, EMS routing, and alternate care site visibility.</span>
              </div>
            </button>
          </div>
        </div>

        <label className="login-select">
          Demo facility context
          <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
            {facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.name} ({facility.region})
              </option>
            ))}
          </select>
        </label>

        <div className="demo-creds">
          <div>
            <span>Authentication</span>
            <strong>SSO + MFA (simulated)</strong>
          </div>
          <div>
            <span>Access posture</span>
            <strong>{role === 'facility' ? 'Facility-scoped RBAC' : 'Statewide coordination RBAC'}</strong>
          </div>
        </div>

        <div className="login-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={() => onLogin({ role, facilityId })}
          >
            Enter {role === 'facility' ? 'Facility Operations' : 'State Coordination'}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
