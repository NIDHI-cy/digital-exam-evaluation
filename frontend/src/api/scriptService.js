import axiosClient from "./axiosClient";
import { mockApi } from "./mockApi";

const useMock = import.meta.env.VITE_USE_MOCK_API === "true";

export async function fetchScripts() {
  if (useMock) return mockApi.getScripts();
  const response = await axiosClient.get("/scripts");
  return response.data;
}

export async function fetchAssignedScripts() {
  if (useMock) return mockApi.getScripts();
  const response = await axiosClient.get("/scripts");
  return response.data;
}

export async function fetchScript(id) {
  if (useMock) return mockApi.getScript(id);
  const response = await axiosClient.get(`/scripts/${id}`);
  return response.data;
}

export async function fetchQuestions(examId) {
  if (useMock) return mockApi.getQuestions(examId);
  const response = await axiosClient.get(`/exams/${examId}/questions`);
  return response.data;
}

export async function fetchQuestionPageMappings(scriptId) {
  if (useMock) return [];
  const response = await axiosClient.get(`/scripts/${scriptId}/question-pages`);
  return response.data;
}

export async function fetchScriptQuestionPaper(scriptId) {
  if (useMock) return null;
  const response = await axiosClient.get(`/scripts/${scriptId}/question-paper`);
  return response.data;
}

export async function assignScriptEvaluator(scriptId, assignedToId) {
  if (useMock) return { scriptId, assignedToId };
  const response = await axiosClient.put(`/scripts/${scriptId}/assign`, { assignedToId });
  return response.data;
}
