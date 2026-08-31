import {
  AlertCircle,
  CheckCircle2,
  Info,
  LoaderCircle,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ToastTone = "success" | "error" | "warning" | "info" | "loading";
type Toast = { id: string; text: string; tone: ToastTone; duration: number };
type Listener = (toast: Toast) => void;
const listeners = new Set<Listener>();

export function notify(
  text: string,
  tone: ToastTone = "success",
  duration = tone === "loading" ? 0 : 4200,
) {
  const toast = { id: crypto.randomUUID(), text, tone, duration };
  listeners.forEach((listener) => listener(toast));
  return toast.id;
}
const ToastContext = createContext<{
  push: typeof notify;
  success: (text: string) => string;
  error: (text: string) => string;
  warning: (text: string) => string;
  info: (text: string) => string;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const receive: Listener = (toast) => {
      setItems((current) => [...current.slice(-4), toast]);
      if (toast.duration)
        window.setTimeout(
          () =>
            setItems((current) =>
              current.filter((item) => item.id !== toast.id),
            ),
          toast.duration,
        );
    };
    listeners.add(receive);
    return () => {
      listeners.delete(receive);
    };
  }, []);
  const remove = (id: string) =>
    setItems((current) => current.filter((item) => item.id !== id));
  const value = useMemo(
    () => ({
      push: notify,
      success: (text: string) => notify(text, "success"),
      error: (text: string) => notify(text, "error"),
      warning: (text: string) => notify(text, "warning"),
      info: (text: string) => notify(text, "info"),
    }),
    [],
  );
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed left-4 top-4 z-[120] grid w-[min(360px,calc(100vw-2rem))] gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.tone === "error" ? "alert" : "status"}
            className={`flex items-start gap-3 rounded-xl border bg-white p-3 text-sm shadow-xl ${colors[item.tone]}`}
          >
            {icon(item.tone)}
            <span className="min-w-0 flex-1 leading-6">{item.text}</span>
            <button
              aria-label="بستن اعلان"
              onClick={() => remove(item.id)}
              className="rounded p-1 hover:bg-black/5"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
const colors: Record<ToastTone, string> = {
  success: "border-emerald-200 text-emerald-800",
  error: "border-rose-200 text-rose-800",
  warning: "border-amber-200 text-amber-800",
  info: "border-sky-200 text-sky-800",
  loading: "border-slate-200 text-slate-700",
};
function icon(tone: ToastTone) {
  const props = { size: 19, className: "mt-0.5 shrink-0" };
  return tone === "success" ? (
    <CheckCircle2 {...props} />
  ) : tone === "error" ? (
    <AlertCircle {...props} />
  ) : tone === "warning" ? (
    <TriangleAlert {...props} />
  ) : tone === "loading" ? (
    <LoaderCircle {...props} className="mt-0.5 shrink-0 animate-spin" />
  ) : (
    <Info {...props} />
  );
}
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
