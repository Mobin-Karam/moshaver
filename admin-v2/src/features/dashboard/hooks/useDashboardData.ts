import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getAdminAttention,
  getAdminDashboard,
} from "../api/dashboard.api";
import type { FollowUpMetric } from "../model/dashboard.types";

export function useDashboardData() {
  const summary = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: getAdminDashboard,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const attention = useQuery({
    queryKey: ["admin-attention"],
    queryFn: () => getAdminAttention(50),
    refetchInterval: 45_000,
    staleTime: 15_000,
  });

  const attentionStudents = attention.data ?? [];

  const criticalCount = useMemo(
    () => attentionStudents.filter((student) => student.severity === "red").length,
    [attentionStudents],
  );

  const warningCount = useMemo(
    () => attentionStudents.filter((student) => student.severity === "yellow").length,
    [attentionStudents],
  );

  const followUp = useMemo<FollowUpMetric[]>(() => {
    const data = summary.data;
    return [
      {
        key: "recoveries",
        label: "درخواست ریکاوری",
        value: Number(data?.pendingRecoveries || 0),
        description: "درخواست‌های در انتظار تصمیم مشاور",
        href: "/admin/notifications",
        tone: "blue",
      },
      {
        key: "missed",
        label: "فعالیت انجام‌نشده",
        value: Number(data?.missedTasks || 0),
        description: "فعالیت‌های امروز که زمانشان گذشته است",
        href: "/admin/notifications",
        tone: "amber",
      },
      {
        key: "chat",
        label: "پیام خوانده‌نشده",
        value: Number(data?.unreadChat || 0),
        description: "پیام‌های دانش‌آموزان که هنوز خوانده نشده‌اند",
        href: "/admin/chat",
        tone: "red",
      },
      {
        key: "attention",
        label: "دانش‌آموز نیازمند توجه",
        value: attentionStudents.length,
        description: `${criticalCount.toLocaleString("fa-IR")} بحرانی · ${warningCount.toLocaleString("fa-IR")} هشدار`,
        href: "#attention-queue",
        tone: criticalCount ? "red" : warningCount ? "amber" : "neutral",
      },
    ];
  }, [attentionStudents.length, criticalCount, summary.data, warningCount]);

  const refresh = async () => {
    await Promise.all([summary.refetch(), attention.refetch()]);
  };

  return {
    summary,
    attention,
    attentionStudents,
    criticalCount,
    warningCount,
    followUp,
    refresh,
    refreshing: summary.isFetching || attention.isFetching,
  };
}
