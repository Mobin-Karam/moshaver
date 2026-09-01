import {
  useState,
} from "react";
import { useStudents } from "../../../shared/hooks/useStudents";
import { useModal } from "../../../shared/ui/modal";
import { AdvisorInboxPanel } from "../components/AdvisorInboxPanel";
import { MobileNotificationTabs } from "../components/MobileNotificationTabs";
import { NotificationCenterPanel } from "../components/NotificationCenterPanel";
import { NotificationSettings } from "../components/NotificationSettings";
import { NotificationsToolbar } from "../components/NotificationsToolbar";
import { useAdminNotifications } from "../hooks/useAdminNotifications";
import { useAdvisorInbox } from "../hooks/useAdvisorInbox";
import { useFilteredNotifications } from "../hooks/useFilteredNotifications";

export function NotificationsPage() {
  const students =
    useStudents();

  const notifications =
    useAdminNotifications();

  const modal = useModal();

  const [
    filter,
    setFilter,
  ] =
    useState<
      "all" | "unread"
    >("all");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("all");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    mobilePanel,
    setMobilePanel,
  ] =
    useState<
      | "notifications"
      | "inbox"
    >("notifications");

  const advisor =
    useAdvisorInbox(
      students.studentId,
    );

  const items =
    useFilteredNotifications({
      items:
        notifications.items,
      filter,
      typeFilter,
      search,
    });

  return (
    <div className="grid h-[calc(100dvh-132px)] min-h-0 gap-3 overflow-hidden lg:h-[calc(100dvh-96px)]">
      <NotificationsToolbar
        onOpenSettings={() =>
          modal.open({
            title:
              "اعلان سیستمی و صدا",
            size: "lg",
            content: (
              <NotificationSettings />
            ),
          })
        }
      />

      <MobileNotificationTabs
        panel={mobilePanel}
        inboxCount={
          advisor.rows.length
        }
        onChange={
          setMobilePanel
        }
      />

      <section className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]">
        <NotificationCenterPanel
          mobilePanel={
            mobilePanel
          }
          filter={filter}
          setFilter={
            setFilter
          }
          typeFilter={
            typeFilter
          }
          setTypeFilter={
            setTypeFilter
          }
          search={search}
          setSearch={
            setSearch
          }
          items={items}
        />

        <AdvisorInboxPanel
          mobilePanel={
            mobilePanel
          }
          rows={advisor.rows}
          students={
            students.students
          }
          studentId={
            students.studentId
          }
          loading={
            advisor.inbox
              .isLoading
          }
          error={
            advisor.inbox
              .isError
          }
          onStudentChange={
            students.setStudentId
          }
          onRetry={() => {
            void advisor.inbox.refetch();
          }}
        />
      </section>
    </div>
  );
}
