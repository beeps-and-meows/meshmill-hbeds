import type { Assignment, Hospital, HospitalId, Patient } from "./types";

export interface AssignmentLoad {
  ed: number;
  icu: number;
}

export function isIcuPatient(patient: Patient): boolean {
  return patient.acuity === "icu";
}

export function countsAgainstEd(patient: Patient): boolean {
  return patient.acuity !== "icu";
}

export function effectiveEdCapacity(hospital: Hospital): number {
  const staffedBeds = hospital.degradedStaffing
    ? Math.floor(hospital.staffedEdBeds * 0.8)
    : hospital.staffedEdBeds;

  return Math.max(0, staffedBeds);
}

export function effectiveIcuCapacity(hospital: Hospital): number {
  const staffedBeds = hospital.degradedStaffing
    ? Math.floor(hospital.staffedIcuBeds * 0.8)
    : hospital.staffedIcuBeds;

  return Math.max(0, staffedBeds);
}

export function isHospitalEligible(patient: Patient, hospital: Hospital): boolean {
  if (hospital.divert) return false;
  if (patient.acuity === "trauma" && !hospital.traumaCapable) return false;
  if (patient.acuity === "icu" && effectiveIcuCapacity(hospital) <= 0) {
    return false;
  }

  return true;
}

export function calculateAssignmentLoad(
  assignment: Assignment,
  patients: Patient[],
): Record<HospitalId, AssignmentLoad> {
  const load: Record<HospitalId, AssignmentLoad> = {};

  for (const patient of patients) {
    const hospitalId = assignment[patient.id];
    if (!hospitalId) continue;

    load[hospitalId] ??= { ed: 0, icu: 0 };

    if (isIcuPatient(patient)) {
      load[hospitalId].icu += 1;
    } else if (countsAgainstEd(patient)) {
      load[hospitalId].ed += 1;
    }
  }

  return load;
}

export function hasCapacity(
  hospital: Hospital,
  load: AssignmentLoad | undefined,
): boolean {
  const assigned = load ?? { ed: 0, icu: 0 };

  return (
    assigned.ed <= effectiveEdCapacity(hospital) &&
    assigned.icu <= effectiveIcuCapacity(hospital)
  );
}

export function isValidAssignment(
  assignment: Assignment,
  patients: Patient[],
  hospitals: Hospital[],
): boolean {
  const hospitalMap = new Map(hospitals.map((h) => [h.id, h]));

  for (const patient of patients) {
    const hospitalId = assignment[patient.id];
    if (!hospitalId) return false;

    const hospital = hospitalMap.get(hospitalId);
    if (!hospital) return false;
    if (!isHospitalEligible(patient, hospital)) return false;
  }

  const load = calculateAssignmentLoad(assignment, patients);

  for (const hospital of hospitals) {
    if (!hasCapacity(hospital, load[hospital.id])) return false;
  }

  return true;
}

export const isFeasible = (
  patients: Patient[],
  hospitals: Hospital[],
  assignment: Assignment,
): boolean => isValidAssignment(assignment, patients, hospitals);
