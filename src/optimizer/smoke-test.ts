import {
  buildBaselineAssignment,
  computeObjective,
  isValidAssignment,
  optimizeWithAnnealingResult,
} from "./index";
import type { Hospital, Patient } from "./types";

const hospitals: Hospital[] = [
  {
    id: "hospitalA",
    staffedEdBeds: 2,
    staffedIcuBeds: 1,
    traumaCapable: true,
    divert: false,
  },
  {
    id: "hospitalB",
    staffedEdBeds: 4,
    staffedIcuBeds: 1,
    traumaCapable: false,
    divert: false,
  },
  {
    id: "hospitalC",
    staffedEdBeds: 3,
    staffedIcuBeds: 0,
    traumaCapable: false,
    divert: true,
  },
];

const patients: Patient[] = [
  { id: "p1", acuity: "moderate", maxTravelMinutes: 25 },
  { id: "p2", acuity: "trauma", maxTravelMinutes: 30 },
  { id: "p3", acuity: "icu", maxTravelMinutes: 35 },
  { id: "p4", acuity: "low", maxTravelMinutes: 20 },
];

const travelTimes: Record<string, number> = {
  "p1:hospitalA": 7,
  "p1:hospitalB": 15,
  "p1:hospitalC": 22,
  "p2:hospitalA": 18,
  "p2:hospitalB": 10,
  "p2:hospitalC": 12,
  "p3:hospitalA": 20,
  "p3:hospitalB": 14,
  "p3:hospitalC": 9,
  "p4:hospitalA": 20,
  "p4:hospitalB": 14,
  "p4:hospitalC": 9,
};

const baseline = buildBaselineAssignment(patients, hospitals);
const optimized = optimizeWithAnnealingResult({
  patients,
  hospitals,
  travelTimes,
  iterations: 1_000,
});

console.log("Baseline:", baseline);
console.log(
  "Baseline score:",
  computeObjective({ assignment: baseline, patients, hospitals, travelTimes }),
);
console.log("Baseline valid:", isValidAssignment(baseline, patients, hospitals));

console.log("Optimized:", optimized.assignment);
console.log("Optimized score:", optimized.score);
console.log(
  "Optimized valid:",
  isValidAssignment(optimized.assignment, patients, hospitals),
);
