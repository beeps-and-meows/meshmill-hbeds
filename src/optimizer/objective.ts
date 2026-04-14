/**
 * Objective function for the optimizer.
 *
 * Computes a scalar cost for a proposed assignment.  Lower is better.
 *
 * Cost components
 * ───────────────
 * 1. Travel time          — sum of patient travel times to assigned hospitals
 * 2. Overload penalty     — heavy penalty per bed over capacity at any hospital
 * 3. Specialty mismatch   — penalty when a hard constraint is technically
 *                           violated (used as a soft signal during annealing;
 *                           feasibility is still enforced separately)
 * 4. Imbalance penalty    — penalises lopsided load distribution across hospitals
 *
 * Weight rationale
 * ────────────────
 * OVERLOAD_PENALTY >> TRAVEL_WEIGHT so that the optimizer strongly prefers
 * staying within capacity even if it means a longer drive.
 */

import type { Patient, Hospital, Assignment } from "./types";
import { getTravelTime } from "./travelTimes";

// ---------------------------------------------------------------------------
// Weights — adjust here for v2 tuning
// ---------------------------------------------------------------------------

/** Cost per minute of travel time per patient. */
const TRAVEL_WEIGHT = 1;

/** Cost per bed that exceeds ED or ICU capacity at a hospital. */
const OVERLOAD_PENALTY = 500;

/**
 * Cost applied when a patient is assigned to a hospital that violates a
 * hard constraint (diversion, trauma mismatch, ICU mismatch).
 * Kept large so infeasible solutions are strongly discouraged.
 */
const MISMATCH_PENALTY = 1000;

/**
 * Weight applied to the standard deviation of load ratios across hospitals.
 * Encourages balanced utilisation.
 */
const IMBALANCE_WEIGHT = 50;

// ---------------------------------------------------------------------------
// Individual cost components (exported for unit testing)
// ---------------------------------------------------------------------------

export function travelCost(
  patients: Patient[],
  assignment: Assignment
): number {
  return patients.reduce((sum, p) => {
    const hospitalId = assignment[p.id];
    if (!hospitalId) return sum;
    return sum + getTravelTime(p.originZone, hospitalId) * TRAVEL_WEIGHT;
  }, 0);
}

export function overloadCost(
  hospitals: Hospital[],
  patients: Patient[],
  assignment: Assignment
): number {
  let cost = 0;

  for (const hospital of hospitals) {
    let edAssigned = 0;
    let icuAssigned = 0;

    for (const patient of patients) {
      if (assignment[patient.id] !== hospital.id) continue;
      if (patient.careType === "icu") icuAssigned++;
      else edAssigned++;
    }

    const edOver = Math.max(
      0,
      hospital.edOccupied + edAssigned - hospital.edCapacity
    );
    const icuOver = Math.max(
      0,
      hospital.icuOccupied + icuAssigned - hospital.icuCapacity
    );

    cost += (edOver + icuOver) * OVERLOAD_PENALTY;
  }

  return cost;
}

export function mismatchCost(
  patients: Patient[],
  hospitals: Hospital[],
  assignment: Assignment
): number {
  const hospitalMap = new Map(hospitals.map((h) => [h.id, h]));
  let cost = 0;

  for (const patient of patients) {
    const hospital = hospitalMap.get(assignment[patient.id]);
    if (!hospital) {
      cost += MISMATCH_PENALTY;
      continue;
    }
    if (hospital.isDiverted) cost += MISMATCH_PENALTY;
    if (patient.requiresTrauma && !hospital.isTraumaCapable)
      cost += MISMATCH_PENALTY;
    if (patient.careType === "icu" && hospital.icuCapacity === 0)
      cost += MISMATCH_PENALTY;
  }

  return cost;
}

/**
 * Imbalance cost: standard deviation of ED load ratios across hospitals,
 * scaled by IMBALANCE_WEIGHT.  Hospitals with no ED capacity are excluded.
 */
export function imbalanceCost(
  hospitals: Hospital[],
  patients: Patient[],
  assignment: Assignment
): number {
  const edHospitals = hospitals.filter((h) => h.edCapacity > 0);
  if (edHospitals.length < 2) return 0;

  const loadRatios = edHospitals.map((h) => {
    let edAssigned = 0;
    for (const patient of patients) {
      if (assignment[patient.id] === h.id && patient.careType === "ed")
        edAssigned++;
    }
    return (h.edOccupied + edAssigned) / h.edCapacity;
  });

  const mean = loadRatios.reduce((a, b) => a + b, 0) / loadRatios.length;
  const variance =
    loadRatios.reduce((sum, r) => sum + (r - mean) ** 2, 0) /
    loadRatios.length;
  const stdDev = Math.sqrt(variance);

  return stdDev * IMBALANCE_WEIGHT;
}

// ---------------------------------------------------------------------------
// Total cost
// ---------------------------------------------------------------------------

export function computeCost(
  patients: Patient[],
  hospitals: Hospital[],
  assignment: Assignment
): number {
  return (
    travelCost(patients, assignment) +
    overloadCost(hospitals, patients, assignment) +
    mismatchCost(patients, hospitals, assignment) +
    imbalanceCost(hospitals, patients, assignment)
  );
}
