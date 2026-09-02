import { api } from "../../../shared/api/api";
import type { LiveSnapshot } from "../model/live.types";

export function getLiveStudentsSnapshot() {
  return api.get<LiveSnapshot>(
    "/admin/realtime/students?limit=100",
  );
}
