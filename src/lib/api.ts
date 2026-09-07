import axios from "axios";

const BASE_URL = import.meta.env["VITE_API_URL"] ?? "/api/v1";

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cd_admin_token");
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

export function etbDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
