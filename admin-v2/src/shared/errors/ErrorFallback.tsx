import { LogIn, LayoutDashboard, RefreshCw, ShieldAlert } from "lucide-react";
import type { AppErrorDetails } from "./error-utils";
import { Button, Card } from "../ui/ui";

export function ErrorFallback({
  details,
  onRetry,
}: {
  details: AppErrorDetails;
  onRetry: () => void;
}) {
  const loginRequired = details.kind === "unauthorized";

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-paper p-4 text-ink">
      <Card
        role="alert"
        className="w-full max-w-lg text-center dark:border-slate-800 dark:bg-slate-900"
      >
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <ShieldAlert aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-black">{details.title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          {details.description}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {!loginRequired ? (
            <Button onClick={onRetry}>
              <RefreshCw size={16} /> تلاش دوباره
            </Button>
          ) : null}
          <a
            href="/admin"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <LayoutDashboard size={16} /> بازگشت به داشبورد
          </a>
          {loginRequired ? (
            <a
              href="/login"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
            >
              <LogIn size={16} /> ورود دوباره
            </a>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
