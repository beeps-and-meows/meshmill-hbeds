/**
 * Public API for the HBEDS patient-to-hospital optimizer.
 *
 * Import from here rather than individual files:
 *
 *   import { optimize, buildBaselineAssignment } from "@/optimizer";
 *   import type { Patient, Hospital, OptimizerResult } from "@/optimizer";
 */

export type {
  PatientId,
  HospitalId,
  PatientAcuity,
  Patient,
  Hospital,
  Assignment,
  OptimizerResult,
} from "./types";

export { travelTimes, getTravelTime, DEFAULT_TRAVEL_TIME } from "./travelTimes";

export {
  isIcuPatient,
  countsAgainstEd,
  effectiveEdCapacity,
  effectiveIcuCapacity,
  isHospitalEligible,
  hasCapacity,
  calculateAssignmentLoad,
  isValidAssignment,
  isFeasible,
} from "./constraints";

export {
  computeObjective,
  computeCost,
} from "./objective";

export { buildBaselineAssignment } from "./baseline";

export {
  optimize,
  optimizeWithAnnealing,
  optimizeWithAnnealingResult,
} from "./annealing";
