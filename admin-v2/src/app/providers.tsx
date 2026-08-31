import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { AuthProvider } from "../features/auth/AuthProvider";
import { AppToaster } from "../shared/ui/notifications";
import { queryClient } from "./query-client";
import { ModalProvider } from "../shared/ui/modal";
import { LocaleProvider } from "../shared/ui/locale";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ModalProvider>
          <AuthProvider>{children}</AuthProvider>
          <AppToaster />
        </ModalProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}
