import axiosClient from "./axiosClient";

export async function fetchUsers(role) {
  const params = role ? { role } : {};
  const response = await axiosClient.get("/auth/users", { params });
  return response.data;
}
