import type { HospitalId, PatientId } from "./types";

export const DEFAULT_TRAVEL_TIME = 9_999;

export type TravelTimes = Record<`${PatientId}:${HospitalId}`, number>;

export const travelTimes: TravelTimes = {};

export function getTravelTime(
  patientId: PatientId,
  hospitalId: HospitalId,
  times: Record<string, number> = travelTimes,
): number {
  return times[`${patientId}:${hospitalId}`] ?? DEFAULT_TRAVEL_TIME;
}
