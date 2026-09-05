import {
  AlertCircle,
  CheckCircle2,
  Info,
  LoaderCircle,
  TriangleAlert,
  Undo2,
} from "lucide-react";

import { Toaster, toast, type ExternalToast } from "sonner";

import { useEffect, useState } from "react";

export type NotificationTone =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "loading";

const baseClass = `
!rounded-2xl
!border
!bg-white
!font-sans
!text-ink
!shadow-xl
!backdrop-blur
`;

const defaults: ExternalToast = {
  duration: 4500,

  classNames: {
    toast: `
  ${baseClass}
  !border-slate-200
  `,

    title: `
  !text-sm
  !font-black
  !leading-6
  `,

    description: `
  !mt-1
  !text-xs
  !leading-5
  !text-slate-500
  `,

    actionButton: `
  !rounded-lg
  !bg-brand
  !px-4
  !py-2
  !font-bold
  !text-white
  `,

    cancelButton: `
  !rounded-lg
  !bg-slate-100
  !px-4
  !py-2
  !font-bold
  !text-slate-700
  `,

    closeButton: `
  !rounded-full
  !border-slate-200
  !bg-white
  !text-slate-500
  `,
  },
};

function mergeClasses(options?: ExternalToast) {
  return {
    ...defaults.classNames,

    ...options?.classNames,
  };
}

export function AppToaster() {
  return (
    <Toaster
      dir="rtl"
      position="top-left"
      closeButton
      richColors
      expand
      visibleToasts={5}
      gap={12}
      offset={{
        top: 20,
        left: 20,
        right: 20,
      }}
      mobileOffset={{
        top: 12,
        left: 12,
        right: 12,
      }}
      toastOptions={defaults}
      icons={{
        success: <CheckCircle2 size={20} />,

        error: <AlertCircle size={20} />,

        warning: <TriangleAlert size={20} />,

        info: <Info size={20} />,

        loading: <LoaderCircle size={20} className="animate-spin" />,
      }}
    />
  );
}

export function notify(
  message: string,

  tone: NotificationTone = "success",

  duration = tone === "loading" ? Infinity : defaults.duration,
) {
  return toast[tone](message, {
    duration,
  });
}

function toPersianNumber(value: number) {
  const numbers = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

  return String(value).replace(/\d/g, (d) => numbers[Number(d)]);
}

function UndoCountdown({
  seconds,

  total,
}: {
  seconds: number;

  total: number;
}) {
  const progress = Math.max(0, (seconds / total) * 100);

  return (
    <div
      className="
 grid
 gap-2
 "
    >
      <div
        className="
 text-xs
 font-medium
 text-slate-500
 "
      >
        بازگردانی تا <b>{toPersianNumber(seconds)}</b> ثانیه
      </div>

      <div
        className="
 h-1.5
 overflow-hidden
 rounded-full
 bg-amber-100
 "
      >
        <div
          className="
 h-full
 rounded-full
 bg-amber-500
 transition-all
 duration-1000
 "
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  );
}

export const notifications = {
  success(message: string, options?: ExternalToast) {
    return toast.success(message, {
      ...options,

      classNames: mergeClasses(options),
    });
  },

  error(message: string, options?: ExternalToast) {
    return toast.error(message, {
      duration: options?.duration ?? 6000,

      ...options,

      classNames: mergeClasses(options),
    });
  },

  warning(message: string, options?: ExternalToast) {
    return toast.warning(message, {
      ...options,

      classNames: mergeClasses(options),
    });
  },

  info(message: string, options?: ExternalToast) {
    return toast.info(message, {
      ...options,

      classNames: mergeClasses(options),
    });
  },

  loading(message: string, options?: ExternalToast) {
    return toast.loading(message, {
      duration: Infinity,

      ...options,

      icon: <LoaderCircle size={18} className="animate-spin" />,

      classNames: mergeClasses(options),
    });
  },

  undo(
    message: string,

    onUndo: () => void,

    options?: ExternalToast,

    duration = 10000,
  ) {
    const totalSeconds = Math.ceil(duration / 1000);

    let seconds = totalSeconds;

    let interval: ReturnType<typeof setInterval>;

    const id = toast(
      message,

      {
        duration,

        icon: <Undo2 size={20} />,

        description: <UndoCountdown seconds={seconds} total={totalSeconds} />,

        action: {
          label: "بازگردانی",

          onClick() {
            clearInterval(interval);

            onUndo();
          },
        },

        classNames: {
          ...defaults.classNames,

          toast: `
   ${baseClass}
   !border-amber-300
   !bg-amber-50
   `,

          actionButton: `
   !rounded-lg
   !bg-amber-500
   !px-4
   !py-2
   !font-bold
   !text-white
   `,

          ...options?.classNames,
        },

        ...options,
      },
    );

    interval = setInterval(() => {
      seconds--;

      toast(
        message,

        {
          id,

          description: (
            <UndoCountdown
              seconds={Math.max(seconds, 0)}
              total={totalSeconds}
            />
          ),
        },
      );

      if (seconds <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return id;
  },

  promise: toast.promise,

  undoCountdown(
    message: string,

    seconds: number,

    onUndo: () => void,

    options?: ExternalToast,
  ) {
    let remaining = seconds;

    const id = toast(
      message,

      {
        duration: seconds * 1000,

        icon: <Undo2 size={20} />,

        description: `حذف خودکار تا ${remaining} ثانیه دیگر`,

        action: {
          label: "لغو حذف",

          onClick() {
            onUndo();

            toast.dismiss(id);
          },
        },

        ...options,
      },
    );

    const timer = window.setInterval(() => {
      remaining--;

      toast.message(
        message,

        {
          id,

          description: `حذف خودکار تا ${remaining} ثانیه دیگر`,
        },
      );

      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return id;
  },

  update(
    id: string | number,

    message: string,

    options?: ExternalToast,
  ) {
    return toast(message, {
      id,

      ...options,
    });
  },

  dismiss: toast.dismiss,
};
