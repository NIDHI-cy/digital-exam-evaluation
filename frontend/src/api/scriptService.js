import axiosClient from "./axiosClient";
import { mockApi } from "./mockApi";

const useMock = import.meta.env.VITE_USE_MOCK_API === "true";

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
