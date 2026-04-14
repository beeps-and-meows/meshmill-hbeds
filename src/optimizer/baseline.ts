/**
 * Baseline assignment — simple rule-based "first eligible hospital" strategy.
 *
 * This seeds the simulated annealer with a valid (feasible) starting point.
 * It does not optimise; it only guarantees that every patient gets assigned
 * to some eligible hospital when one exists.
 *
 * Algorithm
 * ─────────
 * For each patient (in input order):
 *   1. Filter hospitals to those that are eligible (no diversion, trauma &
 *      ICU requirements met).
 *   2. Among eligible hospitals, pick the one with the most remaining
 *      capacity of the relevant type.  Ties are broken by the order in
 *      which hospitals appear in the input array.
 *   3. If no eligible hospital has remaining capacity, assign to the eligible
 *      hospital with the smallest overload (graceful degradation — the
 *      annealer will try to fix this).
 *   4. If no eligible hospital exists at all, the patient is left unassigned
 *      and a warning is emitted.
 */

import type { Patient, Hospital, Assignment } from "./types";
import { isEligible, availableSlots } from "./constraints";

export function buildBaselineAssignment(
  patients: Patient[],
  hospitals: Hospital[]
): Assignment {
  const assignment: Assignment = {};

  // Mutable occupancy counters so each baseline assignment takes already-
  // assigned patients into account.
  const extraEd: Record<string, number> = {};
  const extraIcu: Record<string, number> = {};
  for (const h of hospitals) {
    extraEd[h.id] = 0;
    extraIcu[h.id] = 0;
  }

  for (const patient of patients) {
    const eligible = hospitals.filter((h) => isEligible(patient, h));

    if (eligible.length === 0) {
      console.warn(
        `[baseline] No eligible hospital for patient ${patient.id} ` +
          `(careType=${patient.careType}, trauma=${patient.requiresTrauma}). ` +
          `Patient left unassigned.`
      );
      continue;
    }

    // Score each eligible hospital by remaining capacity (higher = better).
    // We use the live running totals (extraEd / extraIcu) rather than the
    // snapshot in `assignment` to avoid re-scanning the whole assignment map.
    const scored = eligible.map((h) => {
      const edAvail = h.edCapacity - h.edOccupied - extraEd[h.id];
      const icuAvail = h.icuCapacity - h.icuOccupied - extraIcu[h.id];
      const relevant = patient.careType === "icu" ? icuAvail : edAvail;
      return { hospital: h, relevant };
    });

    // Pick the hospital with the highest remaining capacity (or least overload).
    scored.sort((a, b) => b.relevant - a.relevant);
    const chosen = scored[0].hospital;

    assignment[patient.id] = chosen.id;

    if (patient.careType === "icu") {
      extraIcu[chosen.id]++;
    } else {
      extraEd[chosen.id]++;
    }
  }

  return assignment;
}
