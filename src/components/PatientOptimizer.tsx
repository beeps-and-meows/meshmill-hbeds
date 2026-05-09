import { useCallback, useEffect, useRef, useState } from 'react';
import { Cpu, Play, RotateCcw, Users } from 'lucide-react';
import { StatusPill } from './StatusPill';
import { optimizeWithAnnealingResult, buildBaselineAssignment, computeCost } from '../optimizer';
import type { Patient, Hospital, OptimizerResult } from '../optimizer';
import type { HospitalRecord } from '../lib/data';

type ScenarioMode = 'normal' | 'surge' | 'degraded' | 'incident';
type RunState = 'idle' | 'running' | 'done';

interface DisplayResult {
  result: OptimizerResult;
  baselineCost: number;
  patients: Patient[];
  optimizerHospitals: Hospital[];
  unassigned: number;
}

const TOTAL_ITERATIONS = 3000;
const ANIM_DURATION_MS = 2400;
const ANIM_STEPS = 48;

function generatePatients(count: number): Patient[] {
  const acuities: Patient['acuity'][] = ['low', 'moderate', 'icu', 'trauma'];
  const weights = [0.40, 0.35, 0.18, 0.07];
  return Array.from({ length: count }, (_, i) => {
    const r = Math.random();
    let cumulative = 0;
    let acuity: Patient['acuity'] = 'low';
    for (let j = 0; j < weights.length; j++) {
      cumulative += weights[j];
      if (r < cumulative) { acuity = acuities[j]; break; }
    }
    return {
      id: `P${String(i + 1).padStart(4, '0')}`,
      acuity,
      maxTravelMinutes: acuity === 'trauma' ? 30 : acuity === 'icu' ? 45 : 60,
    };
  });
}

function mapToOptimizerHospitals(records: HospitalRecord[], scenario: ScenarioMode): Hospital[] {
  const degraded = scenario === 'degraded' || scenario === 'incident';
  const multiplier = scenario === 'incident' ? 0.45 : scenario === 'surge' ? 0.55 : 1.0;
  return records.map((h) => {
    const ed = h.beds.find((b) => b.type === 'Emergency Department');
    const icu = h.beds.find((b) => b.type === 'Adult ICU');
    return {
      id: h.id,
      staffedEdBeds: Math.max(0, Math.floor((ed?.available ?? 0) * multiplier)),
      staffedIcuBeds: Math.max(0, Math.floor((icu?.available ?? 0) * multiplier)),
      traumaCapable: h.traumaLevel !== 'N/A',
      divert: h.status === 'Diversion' || h.status === 'Internal Disaster',
      degradedStaffing: degraded,
    };
  });
}

interface PatientOptimizerProps {
  hospitals: HospitalRecord[];
  scenario: ScenarioMode;
}

export function PatientOptimizer({ hospitals, scenario }: PatientOptimizerProps) {
  const [patientCount, setPatientCount] = useState(150);
  const [runState, setRunState] = useState<RunState>('idle');
  const [displayResult, setDisplayResult] = useState<DisplayResult | null>(null);
  const [animIter, setAnimIter] = useState(0);
  const [animCost, setAnimCost] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const runOptimizer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRunState('running');
    setDisplayResult(null);
    setAnimIter(0);
    setAnimCost(0);

    const patients = generatePatients(patientCount);
    const optimizerHospitals = mapToOptimizerHospitals(hospitals, scenario);

    const baseline = buildBaselineAssignment(patients, optimizerHospitals);
    const baselineCost = computeCost(patients, optimizerHospitals, baseline);

    const result = optimizeWithAnnealingResult({
      patients,
      hospitals: optimizerHospitals,
      travelTimes: {},
      iterations: TOTAL_ITERATIONS,
      initialTemperature: 100,
      coolingRate: 0.997,
    });

    const unassigned = patients.filter((p) => !result.assignment[p.id]).length;
    const costDelta = baselineCost - result.score;
    const stepMs = ANIM_DURATION_MS / ANIM_STEPS;

    let step = 0;
    const tick = () => {
      step++;
      const pct = 1 - Math.pow(1 - step / ANIM_STEPS, 2);
      setAnimIter(Math.min(TOTAL_ITERATIONS, Math.floor(pct * TOTAL_ITERATIONS)));
      setAnimCost(Math.round(baselineCost - costDelta * pct));

      if (step >= ANIM_STEPS) {
        setDisplayResult({ result, baselineCost, patients, optimizerHospitals, unassigned });
        setRunState('done');
      } else {
        timerRef.current = setTimeout(tick, stepMs);
      }
    };
    timerRef.current = setTimeout(tick, stepMs);
  }, [hospitals, scenario, patientCount]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRunState('idle');
    setDisplayResult(null);
  }, []);

  const hospitalRows = displayResult
    ? hospitals
        .map((h) => {
          const optH = displayResult.optimizerHospitals.find((oh) => oh.id === h.id);
          const assigned = displayResult.patients.filter(
            (p) => displayResult.result.assignment[p.id] === h.id,
          );
          const edAssigned = assigned.filter((p) => p.acuity !== 'icu').length;
          const icuAssigned = assigned.filter((p) => p.acuity === 'icu').length;
          return {
            id: h.id,
            name: h.name,
            region: h.region,
            total: assigned.length,
            edAssigned,
            icuAssigned,
            edCap: optH?.staffedEdBeds ?? 0,
            icuCap: optH?.staffedIcuBeds ?? 0,
            divert: optH?.divert ?? false,
          };
        })
        .filter((r) => r.total > 0)
        .sort((a, b) => b.total - a.total)
    : [];

  const acuityCounts = displayResult
    ? {
        low: displayResult.patients.filter((p) => p.acuity === 'low').length,
        moderate: displayResult.patients.filter((p) => p.acuity === 'moderate').length,
        icu: displayResult.patients.filter((p) => p.acuity === 'icu').length,
        trauma: displayResult.patients.filter((p) => p.acuity === 'trauma').length,
      }
    : null;

  const improvement =
    displayResult && displayResult.baselineCost > 0
      ? Math.round(
          ((displayResult.baselineCost - displayResult.result.score) / displayResult.baselineCost) * 100,
        )
      : 0;

  const assignedCount = displayResult ? patientCount - displayResult.unassigned : 0;

  return (
    <div className="panel">
      <div className="section-head compact">
        <div>
          <h3>
            <Cpu size={18} />
            Patient-to-Hospital Optimizer
          </h3>
          <p>
            Simulated annealing assigns patients across facilities, minimizing travel time, overload,
            and specialty mismatches simultaneously.
          </p>
        </div>
        {runState === 'done' && displayResult && (
          <StatusPill tone={displayResult.unassigned === 0 ? 'green' : 'amber'}>
            {displayResult.unassigned === 0
              ? 'All patients placed'
              : `${displayResult.unassigned} unplaced`}
          </StatusPill>
        )}
      </div>

      <div className="optimizer-controls">
        <div className="optimizer-count-row">
          <label className="optimizer-label" htmlFor="patient-count-slider">
            <Users size={14} />
            Patient count
          </label>
          <input
            id="patient-count-slider"
            type="range"
            min={50}
            max={400}
            step={10}
            value={patientCount}
            onChange={(e) => setPatientCount(Number(e.target.value))}
            disabled={runState === 'running'}
            className="optimizer-slider"
          />
          <span className="optimizer-count-badge">{patientCount}</span>
        </div>

        <div className="optimizer-btn-row">
          <button
            className="primary-btn"
            type="button"
            onClick={runOptimizer}
            disabled={runState === 'running'}
          >
            <Play size={14} />
            {runState === 'running' ? 'Optimizing…' : 'Run Optimizer'}
          </button>
          {runState === 'done' && (
            <button className="secondary-btn" type="button" onClick={reset}>
              <RotateCcw size={14} />
              Reset
            </button>
          )}
        </div>
      </div>

      {runState === 'running' && (
        <div className="optimizer-progress">
          <div className="optimizer-progress-header">
            <span>Iteration</span>
            <span className="optimizer-progress-val">
              {animIter.toLocaleString()} / {TOTAL_ITERATIONS.toLocaleString()}
            </span>
          </div>
          <div className="optimizer-progress-track">
            <div
              className="optimizer-progress-fill"
              style={{ width: `${Math.round((animIter / TOTAL_ITERATIONS) * 100)}%` }}
            />
          </div>
          <div className="optimizer-progress-header">
            <span>Objective cost</span>
            <span className="optimizer-progress-val">{animCost.toLocaleString()}</span>
          </div>
        </div>
      )}

      {runState === 'done' && displayResult && (
        <>
          <div className="optimizer-summary hero-metrics">
            <div className="stat-card tone-green">
              <div className="stat-topline">
                <div className="stat-label">Assigned</div>
              </div>
              <div className="stat-value">{assignedCount}</div>
              <div className="stat-helper">of {patientCount} patients placed</div>
            </div>
            <div className="stat-card tone-blue">
              <div className="stat-topline">
                <div className="stat-label">Final Score</div>
              </div>
              <div className="stat-value">{displayResult.result.score.toLocaleString()}</div>
              <div className="stat-helper">{improvement}% better than greedy baseline</div>
            </div>
            <div className="stat-card tone-amber">
              <div className="stat-topline">
                <div className="stat-label">Acuity Mix</div>
              </div>
              <div className="stat-value">{acuityCounts?.icu ?? 0} ICU</div>
              <div className="stat-helper">
                {acuityCounts?.trauma ?? 0} trauma · {acuityCounts?.moderate ?? 0} moderate ·{' '}
                {acuityCounts?.low ?? 0} low
              </div>
            </div>
          </div>

          <div className="hospital-table-wrap" style={{ marginTop: 18 }}>
            <table className="hospital-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Region</th>
                  <th>Patients</th>
                  <th>ED Load</th>
                  <th>ICU Load</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {hospitalRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.region}</td>
                    <td>
                      <strong>{r.total}</strong>
                    </td>
                    <td>{r.edCap > 0 ? `${r.edAssigned} / ${r.edCap}` : '—'}</td>
                    <td>{r.icuCap > 0 ? `${r.icuAssigned} / ${r.icuCap}` : '—'}</td>
                    <td>
                      <StatusPill tone={r.divert ? 'red' : 'green'}>
                        {r.divert ? 'Divert' : 'Active'}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
