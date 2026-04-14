/**
 * Hard-constraint checks for the optimizer.
 *
 * Every function returns `true` when the constraint is satisfied and `false`
 * when it is violated.  The optimizer will never accept an assignment that
 * violates any hard constraint.
 */

import type { Patient, Hospital, Assignment } from "./types";

// ---------------------------------------------------------------------------
// Per-patient eligibility
// ---------------------------------------------------------------------------

/**
 * A hospital is eligible for a patient when ALL of the following hold:
 *  1. The hospital is NOT on diversion.
 *  2. If the patient requires trauma care, the hospital must be trauma-capable.
 *  3. If the patient needs ICU, the hospital must have ICU beds (icuCapacity > 0).
 */
export function isEligible(patient: Patient, hospital: Hospital): boolean {
  if (hospital.isDiverted) return false;
  if (patient.requiresTrauma && !hospital.isTraumaCapable) return false;
  if (patient.careType === "icu" && hospital.icuCapacity === 0) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Capacity tracking
// ---------------------------------------------------------------------------

/**
 * Count how many patients in `assignment` are routed to `hospitalId`
 * for each care type.
 */
export function countAssigned(
  hospitalId: string,
  assignment: Assignment,
  patients: Patient[]
): { ed: number; icu: number } {
  let ed = 0;
  let icu = 0;
  for (const patient of patients) {
    if (assignment[patient.id] === hospitalId) {
      if (patient.careType === "icu") icu++;
      else ed++;
    }
  }
  return { ed, icu };
}

/**
 * Returns available slots for a hospital given the current baseline occupancy
 * plus already-assigned patients in the optimizer's proposed assignment.
 */
export function availableSlots(
  hospital: Hospital,
  assignment: Assignment,
  patients: Patient[]
): { ed: number; icu: number } {
  const { ed, icu } = countAssigned(hospital.id, assignment, patients);
  return {
    ed: hospital.edCapacity - hospital.edOccupied - ed,
    icu: hospital.icuCapacity - hospital.icuOccupied - icu,
  };
}

/**
 * True when adding `patient` to `hospital` does not exceed capacity.
 * (Does not mutate assignment — purely a check.)
 */
export function hasCapacity(
  patient: Patient,
  hospital: Hospital,
  assignment: Assignment,
  patients: Patient[]
): boolean {
  const slots = availableSlots(hospital, assignment, patients);
  if (patient.careType === "icu") return slots.icu > 0;
  return slots.ed > 0;
}

// ---------------------------------------------------------------------------
// Full-assignment validity
// ---------------------------------------------------------------------------

/**
 * Validates that every patient in `patients` is assigned to exactly one
 * hospital in `assignment`.
 */
export function allPatientsAssigned(
  patients: Patient[],
  assignment: Assignment
): boolean {
  return patients.every((p) => typeof assignment[p.id] === "string");
}

/**
 * Full hard-constraint check over an entire proposed assignment.
 * Returns true only when every constraint is satisfied for every patient.
 */
export function isFeasible(
  patients: Patient[],
  hospitals: Hospital[],
  assignment: Assignment
): boolean {
  if (!allPatientsAssigned(patients, assignment)) return false;

  const hospitalMap = new Map(hospitals.map((h) => [h.id, h]));

  for (const patient of patients) {
    const hospitalId = assignment[patient.id];
    const hospital = hospitalMap.get(hospitalId);
    if (!hospital) return false;
    if (!isEligible(patient, hospital)) return false;
    // Capacity is checked cumulatively after iterating; shortcut here catches
    // obvious single-patient violations.
  }

  // Capacity check: for each hospital, ensure assigned counts don't exceed capacity.
  for (const hospital of hospitals) {
    const { ed, icu } = countAssigned(hospital.id, assignment, patients);
    if (hospital.edOccupied + ed > hospital.edCapacity) return false;
    if (hospital.icuOccupied + icu > hospital.icuCapacity) return false;
  }

  return true;
}
