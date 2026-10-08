import axiosClient from "./axiosClient";

export async function fetchStudents(params = {}) {
  const response = await axiosClient.get("/students", { params });
  return response.data;
}

export async function fetchStudent(id) {
  const response = await axiosClient.get(`/students/${id}`);
  return response.data;
}

export async function createStudent(data) {
  const response = await axiosClient.post("/students", data);
  return response.data;
}

export async function updateStudent(id, data) {
  const response = await axiosClient.put(`/students/${id}`, data);
  return response.data;
}

export async function deactivateStudent(id) {
  const response = await axiosClient.delete(`/students/${id}`);
  return response.data;
}

export async function generateRollNumber(data) {
  const response = await axiosClient.post("/students/generate-roll", data);
  return response.data;
}

export async function validateRollNumber(rollNumber) {
  const response = await axiosClient.post("/students/validate-roll", { rollNumber });
  return response.data;
}
