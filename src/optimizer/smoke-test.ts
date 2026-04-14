/**
 * Manual smoke test — run with:
 *   npx tsx src/optimizer/smoke-test.ts
 *
 * Delete this file once you're satisfied with the output.
 */

import { optimize, buildBaselineAssignment, isFeasible } from "./index";
import type { Patient, Hospital } from "./types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const hospitals: Hospital[] = [
  {
    id: "hospitalA",
    name: "Downtown General",
    edCapacity: 10, edOccupied: 8,   // nearly full ED
    icuCapacity: 5,  icuOccupied: 2,
    isTraumaCapable: true,
    isDiverted: false,
  },
  {
    id: "hospitalB",
    name: "North Regional",
    edCapacity: 15, edOccupied: 5,   // lots of ED room
    icuCapacity: 4,  icuOccupied: 3,
    isTraumaCapable: false,
    isDiverted: false,
  },
  {
    id: "hospitalC",
    name: "South Medical",
    edCapacity: 12, edOccupied: 2,
    icuCapacity: 0,  icuOccupied: 0, // no ICU
    isTraumaCapable: false,
    isDiverted: true,                // on diversion
  },
];

const patients: Patient[] = [
  // Should land on hospitalA or hospitalB (C is diverted)
  { id: "p1", careType: "ed",  requiresTrauma: false, originZone: "downtown" },
  // Trauma — only hospitalA is eligible
  { id: "p2", careType: "ed",  requiresTrauma: true,  originZone: "northZone" },
  // ICU — hospitalA or hospitalB (C has no ICU); C also diverted
  { id: "p3", careType: "icu", requiresTrauma: false, originZone: "southZone" },
  // ED from southZone — hospitalB cheapest after C is ruled out
  { id: "p4", careType: "ed",  requiresTrauma: false, originZone: "southZone" },
  // Another ED to stress balance
  { id: "p5", careType: "ed",  requiresTrauma: false, originZone: "northZone" },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log("=== Baseline ===");
const baseline = buildBaselineAssignment(patients, hospitals);
console.log("Assignment:", baseline);
console.log("Feasible:", isFeasible(patients, hospitals, baseline));

console.log("\n=== Optimizer ===");
const result = optimize(patients, hospitals);
console.log("Assignment:", result.assignment);
console.log("Total cost:", result.totalCost.toFixed(2));
console.log("Iterations:", result.iterations);
console.log("Feasible:", isFeasible(patients, hospitals, result.assignment));

// Spot-check hard constraints
const traumaHospital = result.assignment["p2"];
console.log(
  "\np2 (trauma) → ", traumaHospital,
  traumaHospital === "hospitalA" ? "✓ correct" : "✗ WRONG — must be hospitalA"
);

const icuHospital = result.assignment["p3"];
const icuOk = icuHospital === "hospitalA" || icuHospital === "hospitalB";
console.log(
  "p3 (ICU)    → ", icuHospital,
  icuOk ? "✓ correct" : "✗ WRONG — hospitalC has no ICU"
);

const p1Hospital = result.assignment["p1"];
console.log(
  "p1 (ED)     → ", p1Hospital,
  p1Hospital !== "hospitalC" ? "✓ not diverted" : "✗ WRONG — hospitalC is diverted"
);
