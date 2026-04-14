/**
 * Simulated annealing optimizer.
 *
 * Starts from the baseline assignment and iteratively perturbs it, accepting
 * improvements unconditionally and occasionally accepting worse solutions
 * (controlled by temperature) to escape local minima.
 *
 * Perturbation strategy
 * ─────────────────────
 * Each iteration picks a random patient and reassigns them to a random
 * eligible hospital.  Only feasibility-preserving moves are accepted
 * (i.e. the new hospital must pass isEligible).  Capacity violations are
 * not hard-blocked during search — the objective function's overload penalty
 * strongly discourages them — but hard eligibility (diversion, trauma,
 * ICU presence) is always enforced.
 *
 * Cooling schedule
 * ────────────────
 * Geometric cooling: T_k = T_0 * alpha^k
 *
 * Default parameters are tuned for a scenario with ~50 patients and 3-10
 * hospitals.  Adjust INITIAL_TEMP, COOLING_RATE, or MAX_ITERATIONS for
 * larger instances.
 */

import type { Patient, Hospital, Assignment, OptimizerResult } from "./types";
import { buildBaselineAssignment } from "./baseline";
import { computeCost } from "./objective";
import { isEligible } from "./constraints";

// ---------------------------------------------------------------------------
// Annealing parameters
// ---------------------------------------------------------------------------

const INITIAL_TEMP = 200;
const COOLING_RATE = 0.995; // alpha; closer to 1 = slower cooling
const MAX_ITERATIONS = 5_000;
const MIN_TEMP = 0.5; // stop early if temperature drops below this

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

/**
 * Returns a copy of `assignment` where `patientId` is reassigned to
 * `newHospitalId`.
 */
function reassign(
  assignment: Assignment,
  patientId: string,
  newHospitalId: string
): Assignment {
  return { ...assignment, [patientId]: newHospitalId };
}

/**
 * For `patient`, returns all hospitals that pass the hard eligibility check.
 */
function eligibleHospitals(patient: Patient, hospitals: Hospital[]): Hospital[] {
  return hospitals.filter((h) => isEligible(patient, h));
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function optimize(
  patients: Patient[],
  hospitals: Hospital[]
): OptimizerResult {
  if (patients.length === 0) {
    return { assignment: {}, totalCost: 0, iterations: 0 };
  }

  // Seed with baseline.
  let current = buildBaselineAssignment(patients, hospitals);
  let currentCost = computeCost(patients, hospitals, current);

  let best = current;
  let bestCost = currentCost;

  let temp = INITIAL_TEMP;
  let iter = 0;

  // Pre-compute eligible hospitals per patient to avoid rechecking each iter.
  const eligiblePerPatient = new Map<string, Hospital[]>(
    patients.map((p) => [p.id, eligibleHospitals(p, hospitals)])
  );

  while (iter < MAX_ITERATIONS && temp > MIN_TEMP) {
    // Pick a random patient.
    const patient = patients[randomInt(patients.length)];
    const choices = eligiblePerPatient.get(patient.id) ?? [];

    if (choices.length < 2) {
      // Only one (or zero) eligible hospital — nothing to swap to.
      iter++;
      temp *= COOLING_RATE;
      continue;
    }

    // Pick a random eligible hospital different from the current one.
    let newHospital: Hospital;
    let attempts = 0;
    do {
      newHospital = choices[randomInt(choices.length)];
      attempts++;
    } while (
      newHospital.id === current[patient.id] &&
      attempts < choices.length * 2
    );

    if (newHospital.id === current[patient.id]) {
      iter++;
      temp *= COOLING_RATE;
      continue;
    }

    const candidate = reassign(current, patient.id, newHospital.id);
    const candidateCost = computeCost(patients, hospitals, candidate);
    const delta = candidateCost - currentCost;

    // Accept if better, or probabilistically if worse.
    if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
      current = candidate;
      currentCost = candidateCost;

      if (currentCost < bestCost) {
        best = current;
        bestCost = currentCost;
      }
    }

    iter++;
    temp *= COOLING_RATE;
  }

  return {
    assignment: best,
    totalCost: bestCost,
    iterations: iter,
  };
}
