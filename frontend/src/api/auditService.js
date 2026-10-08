import axiosClient from "./axiosClient";

export async function fetchAuditLogs(limit = 50) {
  const response = await axiosClient.get("/audit", { params: { limit } });
  return response.data;
}
