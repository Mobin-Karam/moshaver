import { api } from "../../../shared/api/api";
import type {
  RecoveryRequest,
  RecoveryActionInput,
} from "../../notifications/model/notification.types";

export type ScopedRecoveryRequest = RecoveryRequest & {
  student?: { id: string; name?: string };
};

export const listRecoveryRequests = () => api.get<ScopedRecoveryRequest[]>("/recovery-requests");
export const moderateRecoveryRequest = ({ id, ...body }: RecoveryActionInput) =>
  api.patch<ScopedRecoveryRequest>(`/recovery-requests/${encodeURIComponent(id)}`, body);
