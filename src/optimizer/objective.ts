import type { Assignment, Hospital, Patient } from "./types";
import {
  calculateAssignmentLoad,
  effectiveEdCapacity,
  effectiveIcuCapacity,
} from "./constraints";
import { getTravelTime } from "./travelTimes";

export interface ObjectiveInput {
  assignment: Assignment;
  patients: Patient[];
  hospitals: Hospital[];
  travelTimes: Record<string, number>;
}

const UNASSIGNED_PATIENT_PENALTY = 1_000_000;
const OVERLOAD_PENALTY = 1_000;
const DIVERSION_PENALTY = 250_000;
const SPECIALTY_MISMATCH_PENALTY = 100_000;
const TRAVEL_LIMIT_PENALTY = 5_000;
const STAFFING_DEGRADATION_PENALTY = 50;
const IMBALANCE_PENALTY = 250;

function capacityRatio(assigned: number, capacity: number): number {
  if (capacity <= 0) return assigned > 0 ? 1 : 0;
  return assigned / capacity;
}

function imbalancePenalty(
  hospitals: Hospital[],
  load: ReturnType<typeof calculateAssignmentLoad>,
): number {
  const ratios = hospitals
    .filter((hospital) => !hospital.divert)
    .map((hospital) => {
      const assigned = load[hospital.id] ?? { ed: 0, icu: 0 };
      const edRatio = capacityRatio(assigned.ed, effectiveEdCapacity(hospital));
      const icuRatio = capacityRatio(assigned.icu, effectiveIcuCapacity(hospital));
      return (edRatio + icuRatio) / 2;
    });

  if (ratios.length < 2) return 0;

  const mean = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  const variance =
    ratios.reduce((sum, ratio) => sum + (ratio - mean) ** 2, 0) / ratios.length;

  return Math.sqrt(variance) * IMBALANCE_PENALTY;
}

export function computeObjective(input: ObjectiveInput): number {
  const { assignment, patients, hospitals, travelTimes } = input;
  const hospitalMap = new Map(hospitals.map((h) => [h.id, h]));

  let score = 0;
  const load = calculateAssignmentLoad(assignment, patients);

  for (const patient of patients) {
    const hospitalId = assignment[patient.id];
    const hospital = hospitalMap.get(hospitalId);

    if (!hospital) {
      score += UNASSIGNED_PATIENT_PENALTY;
      continue;
    }

    const travelMinutes = getTravelTime(patient.id, hospital.id, travelTimes);
    score += travelMinutes;

    if (
      patient.maxTravelMinutes !== undefined &&
      travelMinutes > patient.maxTravelMinutes
    ) {
      score += (travelMinutes - patient.maxTravelMinutes) * TRAVEL_LIMIT_PENALTY;
    }

    if (hospital.divert) score += DIVERSION_PENALTY;
    if (hospital.degradedStaffing) score += STAFFING_DEGRADATION_PENALTY;

    if (patient.acuity === "trauma" && !hospital.traumaCapable) {
      score += SPECIALTY_MISMATCH_PENALTY;
    }

    if (patient.acuity === "icu" && effectiveIcuCapacity(hospital) <= 0) {
      score += SPECIALTY_MISMATCH_PENALTY;
    }
  }

  for (const hospital of hospitals) {
    const assigned = load[hospital.id] ?? { ed: 0, icu: 0 };
    const edOverload = Math.max(0, assigned.ed - effectiveEdCapacity(hospital));
    const icuOverload = Math.max(0, assigned.icu - effectiveIcuCapacity(hospital));

    score += (edOverload + icuOverload) * OVERLOAD_PENALTY;
  }

  return score + imbalancePenalty(hospitals, load);
}

export const computeCost = (
  patients: Patient[],
  hospitals: Hospital[],
  assignment: Assignment,
  travelTimes: Record<string, number> = {},
): number => computeObjective({ assignment, patients, hospitals, travelTimes });
