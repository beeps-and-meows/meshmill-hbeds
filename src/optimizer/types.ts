export type PatientId = string;
export type HospitalId = string;

export type PatientAcuity = "low" | "moderate" | "icu" | "trauma";

export interface Patient {
  id: PatientId;
  acuity: PatientAcuity;
  maxTravelMinutes?: number;
}

export interface Hospital {
  id: HospitalId;
  staffedEdBeds: number;
  staffedIcuBeds: number;
  traumaCapable: boolean;
  divert: boolean;
  degradedStaffing?: boolean;
}

export type Assignment = Record<PatientId, HospitalId>;

export interface OptimizerResult {
  assignment: Assignment;
  score: number;
  iterations: number;
}
