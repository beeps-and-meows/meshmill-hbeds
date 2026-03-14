import { Flame, RotateCcw, ShieldAlert, WifiOff } from 'lucide-react';

type ScenarioMode = 'normal' | 'surge' | 'degraded' | 'incident';

interface ScenarioSimulationProps {
  scenario: ScenarioMode;
  onChangeScenario: (scenario: ScenarioMode) => void;
}

export function ScenarioSimulation({
  scenario,
  onChangeScenario,
}: ScenarioSimulationProps) {
  return (
    <section className="panel scenario-simulation">
      <div className="section-head compact">
        <div>
          <h3>
            <ShieldAlert size={18} />
            Scenario Simulation
          </h3>
          <p>Demo-only controls for surge, degraded feeds, and incident posture.</p>
        </div>
      </div>

      <div className="scenario-actions">
        <button
          type="button"
          className={`ghost-btn scenario-warning ${scenario === 'surge' ? 'is-active' : ''}`}
          onClick={() => onChangeScenario('surge')}
        >
          <Flame size={16} />
          Simulate surge
        </button>

        <button
          type="button"
          className={`ghost-btn scenario-danger ${scenario === 'degraded' ? 'is-active' : ''}`}
          onClick={() => onChangeScenario('degraded')}
        >
          <WifiOff size={16} />
          Degrade network
        </button>

        <button
          type="button"
          className={`ghost-btn scenario-success ${scenario === 'normal' ? 'is-active' : ''}`}
          onClick={() => onChangeScenario('normal')}
        >
          <RotateCcw size={16} />
          Restore feeds
        </button>

        <button
          type="button"
          className={`ghost-btn scenario-alert ${scenario === 'incident' ? 'is-active' : ''}`}
          onClick={() => onChangeScenario('incident')}
        >
          <ShieldAlert size={16} />
          Incident mode
        </button>
      </div>

      <div className="scenario-note">
        Current scenario: <strong>{scenario}</strong>
      </div>
    </section>
  );
}
