import { ShieldCheck, LockKeyhole, ArrowRight, Activity } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <div className="login-shell">
      <div className="login-panel glass">
        <div className="eyebrow">
          <ShieldCheck size={16} />
          California CDPH · Mission-Critical Demo
        </div>
        <h1>HBEDS Operational Engine</h1>
        <p className="login-copy">
          Secure hospital bed visibility, EMS coordination, and real-time operational reporting in a single command dashboard.
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
              <span>Demo simulates SSO, privileged MFA, and role-aware operational views.</span>
            </div>
          </div>
        </div>

        <div className="demo-creds">
          <div>
            <span>Demo user</span>
            <strong>admin</strong>
          </div>
          <div>
            <span>Password</span>
            <strong>admin</strong>
          </div>
        </div>

        <div className="login-actions">
          <button type="button" className="primary-btn" onClick={onLogin}>
            Demo Login
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
