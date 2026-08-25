import axiosClient from "./axiosClient";
import { mockApi } from "./mockApi";

const useMock = import.meta.env.VITE_USE_MOCK_API === "true";

export async function fetchEvaluation(scriptId) {
  if (useMock) return mockApi.getEvaluation(scriptId);
  const response = await axiosClient.get(`/evaluations/${scriptId}`);
  return response.data;
}

export async function saveEvaluation(scriptId, marks) {
  if (useMock) return mockApi.saveEvaluation(scriptId, marks);
  const response = await axiosClient.put(`/evaluations/${scriptId}`, { marks });
  return response.data;
}

export async function submitEvaluation(scriptId, marks) {
  if (useMock) return mockApi.submitEvaluation(scriptId, marks);
  const response = await axiosClient.post(`/evaluations/${scriptId}/submit`, { marks });
  return response.data;
}

export function validateMarks(questions, marks) {
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

  return { errors, total, hasMissing, isValid: Object.keys(errors).length === 0 };
}

export function isComplete(questions, marks) {
  return questions.every((q) => {
    const raw = marks[q.id];
    return raw !== null && raw !== undefined && raw !== "";
  });
}
