import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { AuthProvider } from "../features/auth/AuthProvider";
import { ToastProvider } from "../components/toast";
import { DevBackendSwitcher } from "../components/DevBackendSwitcher";
import { queryClient } from "./query-client";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          {children}
          <DevBackendSwitcher />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
