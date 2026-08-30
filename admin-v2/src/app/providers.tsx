import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { AuthProvider } from "../features/auth/AuthProvider";
import { ToastProvider } from "../components/toast";
import { DevBackendSwitcher } from "../components/DevBackendSwitcher";
import { queryClient } from "./query-client";
import { ModalProvider } from "../components/modal";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ModalProvider>
          <AuthProvider>
            {children}
            <DevBackendSwitcher />
          </AuthProvider>
        </ModalProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
