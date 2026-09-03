import { api } from "../../../shared/api/api";
import type {
  AdminDashboardSummary,
  AttentionStudent,
} from "../model/dashboard.types";

export function getAdminDashboard() {
  return api.get<AdminDashboardSummary>("/admin/dashboard");
}

export function getAdminAttention(limit = 50) {
  const safeLimit = Math.min(100, Math.max(1, limit));
  return api.get<AttentionStudent[]>(
    `/admin/attention?limit=${safeLimit}`,
  );
}
