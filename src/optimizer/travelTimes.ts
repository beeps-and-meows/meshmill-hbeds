/**
 * Static zone-to-hospital travel time lookup (minutes).
 *
 * Keys are originZone values from Patient.originZone.
 * Inner keys are hospital IDs that match Hospital.id.
 *
 * No external routing system is used. Update this table as the deployment
 * region changes.
 */
export const travelTimes: Record<string, Record<string, number>> = {
  downtown: {
    hospitalA: 7,
    hospitalB: 15,
    hospitalC: 22,
  },
  northZone: {
    hospitalA: 18,
    hospitalB: 10,
    hospitalC: 12,
  },
  southZone: {
    hospitalA: 20,
    hospitalB: 14,
    hospitalC: 9,
  },
};

/**
 * Look up travel time from a zone to a specific hospital.
 * Returns a high default penalty when the pair is not in the table so that
 * unknown routes are strongly discouraged rather than silently accepted.
 */
export const DEFAULT_TRAVEL_TIME = 30; // minutes

export function getTravelTime(originZone: string, hospitalId: string): number {
  return travelTimes[originZone]?.[hospitalId] ?? DEFAULT_TRAVEL_TIME;
}
