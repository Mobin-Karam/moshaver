import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth";
import { getAdminAttention, getAdminDashboard } from "../api/dashboard.api";

export function useDashboardData() {
  const auth=useAuth();
  const context=auth.activeRole||"default";
  const organization=auth.context?.activeOrganization?.id||"platform";
  const summary=useQuery({queryKey:["role-dashboard",context,organization],queryFn:getAdminDashboard,refetchInterval:30_000,staleTime:10_000});
  const attention=useQuery({queryKey:["admin-attention",context,organization],queryFn:()=>getAdminAttention(50),enabled:auth.can("student.live.read"),refetchInterval:45_000,staleTime:15_000});
  const refresh=async()=>{await Promise.all([summary.refetch(),...(auth.can("student.live.read")?[attention.refetch()]:[])]);};
  return {summary,attention,attentionStudents:attention.data??[],refresh,refreshing:summary.isFetching||attention.isFetching};
}
