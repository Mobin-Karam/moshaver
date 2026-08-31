import {
  AlertCircle,
  CheckCircle2,
  Info,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import { Toaster, toast, type ExternalToast } from "sonner";

export type NotificationTone = "success" | "error" | "warning" | "info" | "loading";

const defaults: ExternalToast = {
  duration: 4_500,
  classNames: {
    toast: "!rounded-xl !border-slate-200 !bg-white !font-sans !text-ink !shadow-xl",
    title: "!text-sm !font-bold !leading-6",
    description: "!text-xs !leading-5 !text-slate-500",
    actionButton: "!rounded-md !bg-brand !px-3 !text-white",
    cancelButton: "!rounded-md !bg-slate-100 !px-3 !text-slate-700",
    closeButton: "!border-slate-200 !bg-white !text-slate-500",
  },
};

export function AppToaster() {
  return (
    <Toaster
      dir="rtl"
      position="top-left"
      closeButton
      richColors
      expand
      visibleToasts={5}
      gap={10}
      offset={{ top: 16, left: 16, right: 16 }}
      mobileOffset={{ top: 12, left: 12, right: 12 }}
      toastOptions={defaults}
      icons={{
        success: <CheckCircle2 size={18} />,
        error: <AlertCircle size={18} />,
        warning: <TriangleAlert size={18} />,
        info: <Info size={18} />,
        loading: <LoaderCircle className="animate-spin" size={18} />,
      }}
    />
  );
}

export function notify(
  message: string,
  tone: NotificationTone = "success",
  duration = tone === "loading" ? Infinity : defaults.duration,
) {
  return toast[tone](message, { duration });
}

export const notifications = {
  success: (message: string, options?: ExternalToast) => toast.success(message, options),
  error: (message: string, options?: ExternalToast) => toast.error(message, options),
  warning: (message: string, options?: ExternalToast) => toast.warning(message, options),
  info: (message: string, options?: ExternalToast) => toast.info(message, options),
  loading: (message: string, options?: ExternalToast) => toast.loading(message, options),
  promise: toast.promise,
  update: (id: string | number, message: string, options?: ExternalToast) => toast(message, { ...options, id }),
  dismiss: toast.dismiss,
};
