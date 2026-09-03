import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAdminNotifications } from "../../features/notifications";
import { AdminCommandPalette } from "./AdminCommandPalette";
import { AdminContextSidebar } from "./AdminContextSidebar";
import { AdminHeader } from "./AdminHeader";
import { AdminMainSidebar } from "./AdminMainSidebar";
import { AdminMobileBottomNav, AdminMobileDrawer } from "./AdminMobileNavigation";
import { adminBreadcrumbs, adminNavigation, resolveAdminNavigation } from "./admin-navigation";
import { adminContentOffsetClass } from "./layout-geometry";
import { usePersistentCollapse } from "./layout-storage";

function readSelectedStudentId(search: string) {
  const urlValue = new URLSearchParams(search).get("studentId");
  if (urlValue) return urlValue;
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem("admin-selected-student-id") || "";
  } catch {
    return "";
  }
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"], [role="combobox"]',
    ),
  );
}

export function AdminLayout() {
  const notificationState = useAdminNotifications();
  const location = useLocation();
  const [mainCollapsed, setMainCollapsed] = usePersistentCollapse("admin-main-sidebar-collapsed");
  const [contextCollapsed, setContextCollapsed] = usePersistentCollapse("admin-context-sidebar-collapsed");
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const current = resolveAdminNavigation(location.pathname);
  const breadcrumbs = adminBreadcrumbs(location.pathname);
  const contextual = adminNavigation.find((group) => group.section === current.section)?.items || [];
  const showContextRail = contextual.length > 1;
  const selectedStudentId = readSelectedStudentId(location.search);
  const contentOffset = adminContentOffsetClass({ showContextRail, mainCollapsed, contextCollapsed });

  const openMobileNavigation = useCallback(() => setMobileNavigationOpen(true), []);
  const closeMobileNavigation = useCallback(() => setMobileNavigationOpen(false), []);
  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), []);

  useEffect(() => {
    setMobileNavigationOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isEditableTarget(event.target)) return;
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AdminMainSidebar
        collapsed={mainCollapsed}
        currentSection={current.section}
        currentPath={current.path}
        selectedStudentId={selectedStudentId}
        onToggle={() => setMainCollapsed((value) => !value)}
        onOpenSearch={openCommandPalette}
      />

      {showContextRail ? (
        <AdminContextSidebar
          collapsed={contextCollapsed}
          mainCollapsed={mainCollapsed}
          current={current}
          items={contextual}
          unreadNotifications={notificationState.unread}
          selectedStudentId={selectedStudentId}
          onToggle={() => setContextCollapsed((value) => !value)}
        />
      ) : null}

      <div className={`${contentOffset} min-h-screen min-w-0 transition-[margin] duration-200 motion-reduce:transition-none`}>
        <AdminHeader
          current={current}
          breadcrumbs={breadcrumbs}
          selectedStudentId={selectedStudentId}
          sticky={current.path !== "planner"}
          onOpenMobileNavigation={openMobileNavigation}
          onOpenSearch={openCommandPalette}
        />

        <main className="w-full min-w-0 p-2 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:p-3 sm:pb-[calc(4rem+env(safe-area-inset-bottom))] lg:p-3 lg:pb-3 xl:p-4">
          <Outlet />
        </main>
      </div>

      <AdminMobileBottomNav current={current} selectedStudentId={selectedStudentId} />
      <AdminMobileDrawer
        open={mobileNavigationOpen}
        current={current}
        selectedStudentId={selectedStudentId}
        unreadNotifications={notificationState.unread}
        onClose={closeMobileNavigation}
        onOpenSearch={openCommandPalette}
      />
      <AdminCommandPalette
        open={commandPaletteOpen}
        current={current}
        selectedStudentId={selectedStudentId}
        onClose={closeCommandPalette}
      />
    </div>
  );
}
