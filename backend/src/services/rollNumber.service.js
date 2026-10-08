const SC_BRANCHES = new Set(["CSE", "AIE", "CYS"]);
const EN_BRANCHES = new Set(["CCE", "ECE", "RAI", "AID", "MEC"]);
const ALL_BRANCHES = new Set([...SC_BRANCHES, ...EN_BRANCHES]);

const ROLL_REGEX = /^CH\.(SC|EN)\.U4([A-Z]{3})(\d{2})(\d{3})$/;

export function getBranchCategory(branch) {
  const code = branch.toUpperCase();
  if (SC_BRANCHES.has(code)) return "SC";
  if (EN_BRANCHES.has(code)) return "EN";
  return null;
}

export function isValidBranch(branch) {
  return ALL_BRANCHES.has(branch.toUpperCase());
}

export function generateRollNumber({ branch, joiningYear, rollNumber }) {
  const branchCode = branch.toUpperCase();
  const category = getBranchCategory(branchCode);
  if (!category) {
    throw new Error(`Invalid branch: ${branch}. Must be one of ${[...ALL_BRANCHES].join(", ")}`);
  }

  const year = Number(joiningYear);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("joiningYear must be a valid year");
  }

  const roll = Number(rollNumber);
  if (!Number.isInteger(roll) || roll < 1 || roll > 999) {
    throw new Error("rollNumber must be an integer between 1 and 999");
  }

  const yy = String(year).slice(-2);
  const padded = String(roll).padStart(3, "0");
  return `CH.${category}.U4${branchCode}${yy}${padded}`;
}

export function parseRollNumber(rollNumber) {
  const match = ROLL_REGEX.exec(rollNumber.toUpperCase());
  if (!match) {
    return { valid: false, error: "Invalid roll number format" };
  }

  const [, category, branch, yy, rollStr] = match;
  const expectedCategory = getBranchCategory(branch);
  if (expectedCategory !== category) {
    return {
      valid: false,
      error: `Branch ${branch} belongs to category ${expectedCategory}, not ${category}`,
    };
  }

  const joiningYear = 2000 + Number(yy);
  const rollNumberInt = Number(rollStr);

  return {
    valid: true,
    rollNumber: rollNumber.toUpperCase(),
    category,
    branch,
    joiningYear,
    rollNumberInt,
  };
}

export function validateRollNumber(rollNumber) {
  return parseRollNumber(rollNumber);
}
