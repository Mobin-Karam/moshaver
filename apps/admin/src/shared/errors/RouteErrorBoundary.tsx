import { useEffect } from "react";
import { useRouteError } from "react-router-dom";
import { useAuth } from "../../features/auth";
import { ErrorFallback } from "./ErrorFallback";
import { classifyAppError } from "./error-utils";
import { reportAppError } from "./errorReporter";

export function RouteErrorBoundary() {
  const error = useRouteError();
  const details = classifyAppError(error);
  const auth = useAuth();

  useEffect(() => {
    reportAppError({ error, source: "router" });
    if (details.kind === "unauthorized" && auth.status === "authenticated") {
      void auth.logout();
    }
  }, [auth, details.kind, error]);

  return <ErrorFallback details={details} onRetry={() => window.location.reload()} />;
}
