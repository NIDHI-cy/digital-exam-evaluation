export function parseMarksJson(marksJson) {
  try {
    return typeof marksJson === "string" ? JSON.parse(marksJson) : marksJson || {};
  } catch {
    return {};
  }
}

export function validateMarksAgainstQuestions(questions, marks) {
  const errors = {};
  let total = 0;
  let hasMissing = false;

  for (const q of questions) {
    const raw = marks[q.id];
    if (raw === null || raw === undefined || raw === "") {
      hasMissing = true;
      continue;
    }
    const value = Number(raw);
    if (Number.isNaN(value)) {
      errors[q.id] = "Enter a valid number";
      continue;
    }
    if (value < 0) {
      errors[q.id] = "Marks cannot be negative";
      continue;
    }
    if (value > q.maxMarks) {
      errors[q.id] = `Max ${q.maxMarks} marks`;
      continue;
    }
    total += value;
  }

  return {
    errors,
    total,
    hasMissing,
    isValid: Object.keys(errors).length === 0,
    isComplete: questions.length > 0 && !hasMissing && questions.every((q) => {
      const raw = marks[q.id];
      return raw !== null && raw !== undefined && raw !== "";
    }),
  };
}

export const ALLOWED_EVAL_TRANSITIONS = {
  NOT_STARTED: ["IN_PROGRESS", "COMPLETED"],
  IN_PROGRESS: ["COMPLETED", "SUBMITTED"],
  COMPLETED: ["IN_PROGRESS", "SUBMITTED"],
  SUBMITTED: ["REVIEWED"],
  REVIEWED: [],
};

export function canTransition(from, to) {
  if (from === to) return true;
  return (ALLOWED_EVAL_TRANSITIONS[from] || []).includes(to);
}
