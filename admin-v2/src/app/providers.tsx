import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { AuthProvider } from "../features/auth/AuthProvider";
import { ToastProvider } from "../components/toast";
import { queryClient } from "./query-client";
import { ModalProvider } from "../components/modal";
import { LocaleProvider } from "../components/locale";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ToastProvider>
          <ModalProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ModalProvider>
        </ToastProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}
