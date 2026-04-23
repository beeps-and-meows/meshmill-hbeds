import type { Assignment, Hospital, Patient } from "./types";
import {
  calculateAssignmentLoad,
  effectiveEdCapacity,
  effectiveIcuCapacity,
  isHospitalEligible,
} from "./constraints";

function remainingCapacity(patient: Patient, hospital: Hospital, assignment: Assignment, patients: Patient[]): number {
  const load = calculateAssignmentLoad(assignment, patients)[hospital.id] ?? {
    ed: 0,
    icu: 0,
  };

  if (patient.acuity === "icu") {
    return effectiveIcuCapacity(hospital) - load.icu;
  }

  return effectiveEdCapacity(hospital) - load.ed;
}

export function buildBaselineAssignment(
  patients: Patient[],
  hospitals: Hospital[],
): Assignment {
  const assignment: Assignment = {};

  for (const patient of patients) {
    const eligible = hospitals.filter((hospital) =>
      isHospitalEligible(patient, hospital),
    );

    if (eligible.length === 0) continue;

    const [best] = eligible.sort((left, right) => {
      const rightCapacity = remainingCapacity(patient, right, assignment, patients);
      const leftCapacity = remainingCapacity(patient, left, assignment, patients);

      return rightCapacity - leftCapacity;
    });

    assignment[patient.id] = best.id;
  }

  return assignment;
}
