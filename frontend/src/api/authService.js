import axiosClient from "./axiosClient";
import { mockApi } from "./mockApi";

const useMock = import.meta.env.VITE_USE_MOCK_API === "true";

export async function login(email, password) {
  if (useMock) {
    return mockApi.login(email, password);
  }
  const response = await axiosClient.post("/auth/login", { email, password });
  return response.data;
}

export async function logout() {
  if (useMock) return;
  try {
    await axiosClient.post("/auth/logout");
  } catch {
    // ignore logout errors
  }
}
