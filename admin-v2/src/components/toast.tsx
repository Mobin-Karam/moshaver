import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type Toast = { id: string; text: string; tone: "success" | "error" | "info" };
const ToastContext = createContext<{ push: (text: string, tone?: Toast["tone"]) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const value = useMemo(() => ({
    push(text: string, tone: Toast["tone"] = "success") {
      const id = crypto.randomUUID();
      setItems((current) => [...current, { id, text, tone }]);
      window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 3600);
    },
  }), []);
  return <ToastContext.Provider value={value}>{children}<div className="fixed left-4 top-4 z-50 grid w-80 gap-2">{items.map((item) => <div key={item.id} className={`rounded-lg border bg-white p-3 text-sm shadow-lg ${item.tone === "error" ? "border-rose-200 text-rose-800" : "border-emerald-200 text-emerald-800"}`}>{item.text}</div>)}</div></ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
