import { Flame, RotateCcw, ShieldAlert, WifiOff } from 'lucide-react';

type ScenarioMode = 'normal' | 'surge' | 'degraded' | 'incident';
type DatasetId = 1 | 2 | 3 | 4;

const DATASET_LABELS: Record<DatasetId, string> = {
  1: 'Set 1 — Small Internal Stress (10 facilities)',
  2: 'Set 2 — Large Scale Internal (~500 pattern)',
  3: 'Set 3 — Emergency Scenarios (wildfire · earthquake · flood)',
  4: 'Set 4 — Full Integrated Stress',
};

// Each scenario button also switches to the most representative dataset
const SCENARIO_DATASET: Record<ScenarioMode, DatasetId> = {
  normal: 1,
  degraded: 2,
  surge: 3,
  incident: 4,
};

interface ScenarioSimulationProps {
  scenario: ScenarioMode;
  onChangeScenario: (scenario: ScenarioMode) => void;
  dataset: DatasetId;
  onChangeDataset: (dataset: DatasetId) => void;
  apiStatus: 'loading' | 'ready' | 'error';
}

export function ScenarioSimulation({
  scenario,
  onChangeScenario,
  dataset,
  onChangeDataset,
  apiStatus,
}: ScenarioSimulationProps) {
  function handleScenario(s: ScenarioMode) {
    onChangeScenario(s);
    onChangeDataset(SCENARIO_DATASET[s]);
  }

  return (
    <section className="panel scenario-simulation">
      <div className="section-head compact">
        <div>
          <h3>
            <ShieldAlert size={18} />
            Scenario Simulation
          </h3>
          <p>Switch test datasets and apply scenario overlays for demo purposes.</p>
        </div>
        <div
          className={`api-status-badge api-status-${apiStatus}`}
          title={
            apiStatus === 'ready'
              ? 'Live data from mock API server'
              : apiStatus === 'loading'
                ? 'Fetching from API server…'
                : 'Cannot reach API server — run: npm run server'
          }
        >
          {apiStatus === 'ready' ? 'API Live' : apiStatus === 'loading' ? 'Loading…' : 'API Offline'}
        </div>
      </div>

      <div className="scenario-dataset-row">
        <label className="scenario-dataset-label">
          Test Dataset
          <select
            value={dataset}
            onChange={(e) => onChangeDataset(Number(e.target.value) as DatasetId)}
          >
            {([1, 2, 3, 4] as DatasetId[]).map((id) => (
              <option key={id} value={id}>
                {DATASET_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="scenario-actions">
        <button
          type="button"
          className={`ghost-btn scenario-success ${scenario === 'normal' ? 'is-active' : ''}`}
          onClick={() => handleScenario('normal')}
        >
          <RotateCcw size={16} />
          Normal operations
        </button>

        <button
          type="button"
          className={`ghost-btn scenario-danger ${scenario === 'degraded' ? 'is-active' : ''}`}
          onClick={() => handleScenario('degraded')}
        >
          <WifiOff size={16} />
          Degrade network
        </button>

        <button
          type="button"
          className={`ghost-btn scenario-warning ${scenario === 'surge' ? 'is-active' : ''}`}
          onClick={() => handleScenario('surge')}
        >
          <Flame size={16} />
          Emergency surge
        </button>

        <button
          type="button"
          className={`ghost-btn scenario-alert ${scenario === 'incident' ? 'is-active' : ''}`}
          onClick={() => handleScenario('incident')}
        >
          <ShieldAlert size={16} />
          Incident mode
        </button>
      </div>

      <div className="scenario-note">
        Dataset: <strong>{DATASET_LABELS[dataset]}</strong>
        {' · '}
        Overlay: <strong>{scenario}</strong>
      </div>
    </section>
  );
}
