/**
 * Core types for the patient-to-hospital assignment optimizer.
 *
 * Designed to align with the existing HospitalRecord / CanonicalFacility
 * shapes in src/lib/data.ts and src/lib/api.ts without modifying them.
 * Callers are expected to map those types into these leaner optimizer types
 * before invoking the optimizer.
 */

// ---------------------------------------------------------------------------
// Patient
// ---------------------------------------------------------------------------

/**
 * The two capacity tracks the optimizer manages independently.
 * - "ed"  → counts against ED capacity
 * - "icu" → counts against ICU capacity; hospital must have ICU beds
 */
export type PatientCareType = "ed" | "icu";

export interface Patient {
  /** Unique patient identifier (e.g. incident or case ID). */
  id: string;

  /** Whether the patient needs an ICU bed vs. an ED bed. */
  careType: PatientCareType;

  /**
   * Whether the patient is a trauma case.
   * If true, only hospitals with `isTraumaCapable = true` are eligible.
   */
  requiresTrauma: boolean;

  /**
   * Geographic zone the patient is being dispatched from.
   * Used to look up travel time via travelTimes.ts.
   * Must match a key in the `travelTimes` record (e.g. "downtown").
   */
  originZone: string;

  /** Triage priority (1 = most critical). Informational; not used in v1 cost. */
  priority?: 1 | 2 | 3 | 4 | 5;
}

// ---------------------------------------------------------------------------
// Hospital
// ---------------------------------------------------------------------------

export interface Hospital {
  /** Stable identifier; must match a key in the travelTimes inner records. */
  id: string;

  name: string;

  /** Total staffed ED beds. */
  edCapacity: number;

  /** Current number of patients already occupying ED beds. */
  edOccupied: number;

  /** Total staffed ICU beds (0 means no ICU at this facility). */
  icuCapacity: number;

  /** Current number of patients already occupying ICU beds. */
  icuOccupied: number;

  /** Whether the facility can accept trauma patients. */
  isTraumaCapable: boolean;

  /**
   * Hard diversion flag.  When true the hospital is ineligible for any new
   * assignment — treated as a hard constraint.
   */
  isDiverted: boolean;
}

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

/** Maps every patientId to the hospitalId it has been assigned to. */
export type Assignment = Record<string, string>;

// ---------------------------------------------------------------------------
// Optimizer result
// ---------------------------------------------------------------------------

export interface OptimizerResult {
  assignment: Assignment;
  /** Total cost of the returned assignment according to the objective fn. */
  totalCost: number;
  /** Number of annealing iterations executed. */
  iterations: number;
}
