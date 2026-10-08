import axiosClient from "./axiosClient";

export async function fetchExams() {
  const response = await axiosClient.get("/exams");
  return response.data;
}

export async function fetchExam(id) {
  const response = await axiosClient.get(`/exams/${id}`);
  return response.data;
}

export async function createExam(data) {
  const response = await axiosClient.post("/exams", data);
  return response.data;
}

export async function updateExam(id, data) {
  const response = await axiosClient.put(`/exams/${id}`, data);
  return response.data;
}

export async function addExamQuestions(examId, questions) {
  const response = await axiosClient.post(`/exams/${examId}/questions`, questions);
  return response.data;
}

export async function uploadScript(formData) {
  const response = await axiosClient.post("/scripts/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function fetchScriptFileUrl(scriptId) {
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  return `${base}/scripts/${scriptId}/file`;
}
