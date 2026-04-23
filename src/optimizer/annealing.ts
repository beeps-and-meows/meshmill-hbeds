import type { Assignment, Hospital, OptimizerResult, Patient } from "./types";
import { buildBaselineAssignment } from "./baseline";
import { isHospitalEligible } from "./constraints";
import { computeObjective } from "./objective";

export interface AnnealingInput {
  patients: Patient[];
  hospitals: Hospital[];
  travelTimes: Record<string, number>;
  iterations?: number;
  initialTemperature?: number;
  coolingRate?: number;
}

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

function buildCandidate(
  current: Assignment,
  patients: Patient[],
  hospitals: Hospital[],
): Assignment {
  if (patients.length === 0 || hospitals.length === 0) return { ...current };

  const patient = patients[randomIndex(patients.length)];
  const eligibleHospitals = hospitals.filter((hospital) =>
    isHospitalEligible(patient, hospital),
  );

  if (eligibleHospitals.length === 0) return { ...current };

  const hospital = eligibleHospitals[randomIndex(eligibleHospitals.length)];

  return {
    ...current,
    [patient.id]: hospital.id,
  };
}

export function optimizeWithAnnealing(input: AnnealingInput): Assignment {
  const result = optimizeWithAnnealingResult(input);
  return result.assignment;
}

export function optimizeWithAnnealingResult(input: AnnealingInput): OptimizerResult {
  const {
    patients,
    hospitals,
    travelTimes,
    iterations = 500,
    initialTemperature = 100,
    coolingRate = 0.99,
  } = input;

  let current = buildBaselineAssignment(patients, hospitals);
  let currentScore = computeObjective({
    assignment: current,
    patients,
    hospitals,
    travelTimes,
  });

  let best = { ...current };
  let bestScore = currentScore;
  let temperature = initialTemperature;

  for (let i = 0; i < iterations; i += 1) {
    const candidate = buildCandidate(current, patients, hospitals);
    const candidateScore = computeObjective({
      assignment: candidate,
      patients,
      hospitals,
      travelTimes,
    });

    const delta = candidateScore - currentScore;
    const accept =
      delta < 0 || Math.random() < Math.exp(-delta / Math.max(temperature, 0.01));

    if (accept) {
      current = candidate;
      currentScore = candidateScore;
    }

    if (candidateScore < bestScore) {
      best = { ...candidate };
      bestScore = candidateScore;
    }

    temperature *= coolingRate;
  }

  return {
    assignment: best,
    score: bestScore,
    iterations,
  };
}

export const optimize = (
  patients: Patient[],
  hospitals: Hospital[],
  travelTimes: Record<string, number> = {},
): OptimizerResult =>
  optimizeWithAnnealingResult({ patients, hospitals, travelTimes });
