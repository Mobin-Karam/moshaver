export type ErrorReport = {
  error: unknown;
  source: "react" | "router";
  componentStack?: string;
};

export type ErrorReporter = (report: ErrorReport) => void;

let productionReporter: ErrorReporter | null = null;

export function configureErrorReporter(reporter: ErrorReporter | null) {
  productionReporter = reporter;
}

export function reportAppError(report: ErrorReport) {
  if (import.meta.env.DEV) {
    console.error(`[admin-v2:${report.source}]`, report.error, report.componentStack || "");
    return;
  }
  productionReporter?.(report);
}
