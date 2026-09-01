import {
  BellRing,
  MessageSquare,
  Settings2,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  Button,
  Card,
} from "../../../shared/ui/ui";
import { useAdminNotifications } from "../hooks/useAdminNotifications";
import { ToggleButton } from "./ToggleButton";

export function NotificationsToolbar({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  const notifications =
    useAdminNotifications();

  return (
    <Card className="flex shrink-0 flex-wrap items-center gap-2 p-2 sm:gap-3">
      <div className="flex min-w-40 flex-1 items-center gap-2">
        <span className="grid size-9 place-items-center rounded-full bg-rose-50 text-rose-700">
          <BellRing size={18} />
        </span>

        <div>
          <strong className="block leading-5">
            {notifications.unread.toLocaleString(
              "fa-IR",
            )}
          </strong>

          <span className="text-[11px] text-slate-500">
            خوانده‌نشده
          </span>
        </div>
      </div>

      <ToggleButton
        active={
          notifications.soundEnabled
        }
        onClick={() => {
          const enabled =
            !notifications.soundEnabled;

          notifications.setSoundEnabled(
            enabled,
          );

          if (enabled) {
            notifications.testSound(
              false,
            );
          }
        }}
        icon={
          notifications.soundEnabled ? (
            <Volume2
              size={16}
            />
          ) : (
            <VolumeX
              size={16}
            />
          )
        }
        label="صدای اعلان"
      />

      <ToggleButton
        active={
          notifications.chatSoundEnabled
        }
        onClick={() => {
          const enabled =
            !notifications.chatSoundEnabled;

          notifications.setChatSoundEnabled(
            enabled,
          );

          if (enabled) {
            notifications.testSound(
              true,
            );
          }
        }}
        icon={
          <MessageSquare
            size={16}
          />
        }
        label="صدای پیام"
      />

      <Button
        variant="soft"
        onClick={
          onOpenSettings
        }
      >
        <Settings2 size={16} />
        تنظیمات دستگاه
      </Button>
    </Card>
  );
}
