import { api } from "../../../shared/api/api";

export type FollowUpItem = {
  id: string;
  type: "recovery" | "issue" | "comment";
  status?: string;
  studentId?: string;
  title?: string;
  description?: string;
};

export const getRecoveryRequests = () =>
  api.get("/admin/recovery-requests");

export const updateRecoveryRequest = (
  id: string,
  payload: Record<string, unknown>,
) =>
  api.patch(
    `/admin/recovery-requests/${id}`,
    payload,
  );

export const getTaskIssues = () =>
  api.get("/admin/task-issues");

export const updateTaskIssue = (
  id: string,
  payload: Record<string, unknown>,
) =>
  api.patch(
    `/admin/task-issues/${id}`,
    payload,
  );

export const getAdvisorComments = () =>
  api.get("/admin/comments");

export const createAdvisorComment = (
  payload: Record<string, unknown>,
) =>
  api.post("/admin/comments", payload);
