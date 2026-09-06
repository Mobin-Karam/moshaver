import { describe, expect, it } from "vitest";
import { roleDashboardMetrics } from "./components/RoleDashboard";
import type { RoleDashboardData } from "./model/dashboard.types";

describe("role dashboard metrics",()=>{
  it.each(["GUARDIAN","ADVISOR","TEACHER","MENTOR","CONTENT_MANAGER","ORGANIZATION_ADMIN","PLATFORM_ADMIN"])("builds useful cards for %s",context=>{
    const cards=roleDashboardMetrics({context,generatedAt:"2026-01-01",assignedStudents:2,unreadConversations:1,children:1,subjects:context==="TEACHER"?[]:2} as RoleDashboardData);
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards.every(card=>card.label&&card.hint&&card.value!==undefined)).toBe(true);
  });
});
