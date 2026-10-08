import { generateRollNumber, validateRollNumber } from "../src/services/rollNumber.service.js";

const cases = [
  { branch: "AIE", joiningYear: 2024, rollNumber: 61, expected: "CH.SC.U4AIE24061" },
  { branch: "AIE", joiningYear: 2026, rollNumber: 34, expected: "CH.SC.U4AIE26034" },
  { branch: "ECE", joiningYear: 2024, rollNumber: 61, expected: "CH.EN.U4ECE24061" },
];

let failed = 0;
for (const c of cases) {
  const roll = generateRollNumber(c);
  const ok = roll === c.expected;
  console.log(`${ok ? "PASS" : "FAIL"} ${c.branch} ${c.joiningYear} ${c.rollNumber} => ${roll}`);
  if (!ok) failed++;
  const v = validateRollNumber(roll);
  if (!v.valid) {
    console.log("  validation failed", v);
    failed++;
  }
}

process.exit(failed ? 1 : 0);
