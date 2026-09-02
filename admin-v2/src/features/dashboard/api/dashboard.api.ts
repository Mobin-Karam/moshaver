import { api } from "../../../shared/api/api";
import type { Conversation } from "../../../shared/types/domain";
import type {
  AdvisorInbox,
  DashboardOverview,
} from "../model/dashboard.types";

export function getDashboardOverview(
  studentId: string,
) {
  return api.get<DashboardOverview>(
    `/admin/students/${studentId}/overview`,
  );
}

export function getAdvisorInbox(
  studentId: string,
) {
  return api.get<AdvisorInbox>(
    `/admin/advisor-inbox?studentId=${encodeURIComponent(studentId)}`,
  );
}

export function getDashboardChatConversations() {
  return api.get<Conversation[]>(
    "/admin/chat/conversations",
  );
}
