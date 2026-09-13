import { useState } from "react";
import { useStudentSelection } from "../../../shared/hooks/useStudentSelection";
import { useModal } from "../../../shared/ui/modal";
import { AdvisorInboxPanel } from "../components/AdvisorInboxPanel";
import { MobileNotificationTabs } from "../components/MobileNotificationTabs";
import { NotificationCenterPanel } from "../components/NotificationCenterPanel";
import { NotificationSettings } from "../components/NotificationSettings";
import { NotificationsToolbar } from "../components/NotificationsToolbar";
import { useAdminNotifications } from "../hooks/useAdminNotifications";
import { useAdvisorInbox } from "../hooks/useAdvisorInbox";
import { useFilteredNotifications } from "../hooks/useFilteredNotifications";
import { useAuth } from "../../auth";

export function notificationAccess(capabilities: readonly string[]) {
  const has = (capability: string) => capabilities.includes(capability);
  const advisorInbox = has("students.read") && has("recovery_requests.read");

  return {
    advisorInbox,
    manageRecovery: advisorInbox && has("recovery_requests.manage"),
    manageIssues: advisorInbox && has("tasks.update"),
  };
}

export function NotificationsPage() {
  const auth = useAuth();
  const access = notificationAccess(auth.capabilities);
  const students = useStudentSelection({ enabled: access.advisorInbox });
  const notifications = useAdminNotifications();
  const modal = useModal();

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"notifications" | "inbox">("notifications");

  const advisor = useAdvisorInbox(students.studentId, {
    enabled: access.advisorInbox,
    scopeKey: `${auth.activeRole || "none"}:${auth.context?.activeOrganization?.id || "global"}`,
  });
  const items = useFilteredNotifications({
    items: notifications.items,
    filter,
    typeFilter,
    search,
  });

  return (
    <div className="grid h-[calc(100dvh-132px)] min-h-0 gap-3 overflow-hidden lg:h-[calc(100dvh-96px)]">
      <NotificationsToolbar
        onOpenSettings={() =>
          modal.open({
            title: "اعلان سیستمی و صدا",
            size: "lg",
            // Important: global modal providers may render outside NotificationProvider.
            // Passing the controller avoids a context crash in modal content.
            content: <NotificationSettings notifications={notifications} />,
          })
        }
      />

      {access.advisorInbox ? (
        <MobileNotificationTabs
          panel={mobilePanel}
          inboxCount={advisor.rows.length}
          onChange={setMobilePanel}
        />
      ) : null}

      <section
        className={
          access.advisorInbox
            ? "grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]"
            : "grid min-h-0 flex-1"
        }
      >
        <NotificationCenterPanel
          mobilePanel={access.advisorInbox ? mobilePanel : "notifications"}
          filter={filter}
          setFilter={setFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          search={search}
          setSearch={setSearch}
          items={items}
        />

        {access.advisorInbox ? (
          <AdvisorInboxPanel
            mobilePanel={mobilePanel}
            rows={advisor.rows}
            students={students.students}
            studentId={students.studentId}
            loading={advisor.inbox.isLoading}
            error={advisor.inbox.isError}
            onStudentChange={students.selectStudent}
            recoveryPendingId={advisor.recoveryPendingId}
            issuePendingId={advisor.issuePendingId}
            onRecovery={advisor.updateRecovery}
            onIssue={advisor.updateIssue}
            canManageRecovery={access.manageRecovery}
            canManageIssues={access.manageIssues}
            onRetry={() => {
              void advisor.inbox.refetch();
            }}
          />
        ) : null}
      </section>
    </div>
  );
}
