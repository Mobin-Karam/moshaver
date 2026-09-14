import { LoaderCircle, Undo2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  GooeyToaster,
  gooeyToast,
  type GooeyPromiseData,
  type GooeyToastOptions,
} from "goey-toast";

export type NotificationTone = "success" | "error" | "warning" | "info" | "loading";
type NotificationOptions = GooeyToastOptions & { description?: ReactNode };
const duration = 4500;

function notificationId(tone: Exclude<NotificationTone, "loading">, message: string) {
  return `admin:${tone}:${message}`;
}

export function AppToaster() {
  return (
    <GooeyToaster
      dir="rtl"
      position="top-left"
      closeButton="top-right"
      closeOnEscape
      richColors
      expand
      visibleToasts={5}
      maxQueue={8}
      queueOverflow="drop-oldest"
      gap={12}
      offset={16}
      duration={duration}
      preset="snappy"
      bounce={0.32}
      showProgress
      swipeToDismiss
    />
  );
}

export function notify(
  message: string,
  tone: NotificationTone = "success",
  displayDuration = tone === "loading" ? Infinity : duration,
) {
  if (tone === "loading")
    return gooeyToast(message, {
      duration: displayDuration,
      icon: <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />,
      showProgress: false,
    });
  return gooeyToast[tone](message, {
    id: notificationId(tone, message),
    duration: displayDuration,
  });
}

function countdownDescription(seconds: number) {
  return `حذف خودکار تا ${Math.max(0, seconds).toLocaleString("fa-IR")} ثانیه دیگر`;
}

function typedToast(
  tone: Exclude<NotificationTone, "loading">,
  message: string,
  options?: NotificationOptions,
) {
  return gooeyToast[tone](message, {
    id: options?.id ?? notificationId(tone, message),
    duration: tone === "error" ? (options?.duration ?? 6000) : (options?.duration ?? duration),
    preset: "snappy",
    showProgress: true,
    ...options,
  });
}

export const notifications = {
  success: (message: string, options?: NotificationOptions) =>
    typedToast("success", message, options),
  error: (message: string, options?: NotificationOptions) => typedToast("error", message, options),
  warning: (message: string, options?: NotificationOptions) =>
    typedToast("warning", message, options),
  info: (message: string, options?: NotificationOptions) => typedToast("info", message, options),
  loading(message: string, options?: NotificationOptions) {
    return gooeyToast(message, {
      duration: Infinity,
      icon: <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />,
      showProgress: false,
      ...options,
    });
  },
  undo(message: string, onUndo: () => void, options?: NotificationOptions, undoDuration = 10000) {
    return gooeyToast.warning(message, {
      duration: undoDuration,
      description: "برای بازگردانی، دکمه زیر را انتخاب کنید.",
      icon: <Undo2 size={18} aria-hidden="true" />,
      showProgress: true,
      action: { label: "بازگردانی", successLabel: "بازگردانده شد", onClick: onUndo },
      ...options,
    });
  },
  promise<T>(promise: Promise<T>, data: GooeyPromiseData<T>) {
    return gooeyToast.promise(promise, data);
  },
  undoCountdown(
    message: string,
    seconds: number,
    onUndo: () => void,
    options?: NotificationOptions,
  ) {
    let remaining = seconds;
    let timer = 0;
    const id = gooeyToast.warning(message, {
      duration: seconds * 1000,
      description: countdownDescription(remaining),
      icon: <Undo2 size={18} aria-hidden="true" />,
      showProgress: true,
      action: {
        label: "لغو حذف",
        successLabel: "حذف لغو شد",
        onClick() {
          window.clearInterval(timer);
          onUndo();
        },
      },
      ...options,
    });
    timer = window.setInterval(() => {
      remaining -= 1;
      gooeyToast.update(id, { description: countdownDescription(remaining) });
      if (remaining <= 0) window.clearInterval(timer);
    }, 1000);
    return id;
  },
  update(id: string | number, message: string, options?: NotificationOptions) {
    gooeyToast.update(id, { title: message, description: options?.description });
    return id;
  },
  dismiss: gooeyToast.dismiss,
};
