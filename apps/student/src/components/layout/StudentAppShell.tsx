import React from "react";
import {
  Bell,
  CalendarDays,
  GraduationCap,
  Home,
  Menu,
  MessageCircleIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import type { PortalAccess } from "../../app/portal-access";
import { ActivityIsland } from "./ActivityIsland";

type Theme = "light" | "dark" | "system";

export function StudentAppShell({
  children,
  access,
  unread,
  syncLabel,
  theme,
  onThemeChange,
  guardianSelector,
}: {
  children: React.ReactNode;
  access: PortalAccess | null;
  unread: number;
  syncLabel: string;
  theme: Theme;
  onThemeChange: () => void;
  guardianSelector?: React.ReactNode;
}) {
  return (
    <div className="app-shell" dir="rtl">
      {access?.mode === "student" ? (
        <ActivityIsland syncLabel={syncLabel} />
      ) : null}
      <main className="page-container">
        {guardianSelector}
        {children}
      </main>
      <nav className="bottom-nav" aria-label="ناوبری اصلی">
        <div
          className="bottom-nav__inner"
          style={{
            gridTemplateColumns: `repeat(${access?.navigation.length || 1}, minmax(0, 1fr))`,
          }}
        >
          {access?.navigation.includes("today") ? (
            <Tab to="/" icon={<Home />} label="خانه" />
          ) : null}
          {access?.navigation.includes("plan") ? (
            <Tab to="/plan" icon={<CalendarDays />} label="برنامه" />
          ) : null}
          {access?.navigation.includes("exams") ? (
            <Tab to="/exam" icon={<GraduationCap />} label="آزمون‌ها" />
          ) : null}
          {access?.navigation.includes("chat") ? (
            <Tab
              to="/chat"
              icon={<MessageCircleIcon />}
              label="گفتگو"
              badge={unread}
            />
          ) : null}
          {access?.navigation.includes("more") ? (
            <Tab to="/more" icon={<Menu />} label="بیشتر" />
          ) : null}
        </div>
      </nav>
      {access?.mode === "guardian" ? (
        <span className="sr-only">پرتال خانواده، فقط خواندنی</span>
      ) : null}
    </div>
  );
}

function Tab({
  to,
  icon,
  label,
  badge = 0,
}: {
  to: string;
  icon: React.ReactElement;
  label: string;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      aria-label={
        badge ? `${label}، ${badge.toLocaleString("fa-IR")} خوانده‌نشده` : label
      }
      className={({ isActive }) =>
        `bottom-nav__item ${isActive ? "is-active" : ""}`
      }
    >
      <span>
        {React.cloneElement(icon, { size: 21, strokeWidth: 2 })}
        {badge ? <i>{Math.min(badge, 99).toLocaleString("fa-IR")}</i> : null}
      </span>
      <em>{label}</em>
    </NavLink>
  );
}
