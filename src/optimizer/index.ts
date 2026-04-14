/**
 * Public API for the HBEDS patient-to-hospital optimizer.
 *
 * Import from here rather than individual files:
 *
 *   import { optimize, buildBaselineAssignment } from "@/optimizer";
 *   import type { Patient, Hospital, OptimizerResult } from "@/optimizer";
 */

export type {
  Patient,
  PatientCareType,
  Hospital,
  Assignment,
  OptimizerResult,
} from "./types";

export { travelTimes, getTravelTime, DEFAULT_TRAVEL_TIME } from "./travelTimes";

export {
  isEligible,
  hasCapacity,
  countAssigned,
  availableSlots,
  allPatientsAssigned,
  isFeasible,
} from "./constraints";

export {
  computeCost,
  travelCost,
  overloadCost,
  mismatchCost,
  imbalanceCost,
} from "./objective";

export { buildBaselineAssignment } from "./baseline";

export { optimize } from "./annealing";
