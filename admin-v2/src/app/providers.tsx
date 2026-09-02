import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { AuthProvider } from "../features/auth";
import { AppToaster } from "../shared/ui/notifications";
import { queryClient } from "./query-client";
import { ModalProvider } from "../shared/ui/modal";
import { LocaleProvider } from "../shared/ui/locale";
import { NotificationProvider } from "../features/notifications";
import { ThemeProvider } from "../shared/theme/theme";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <ModalProvider>
            <AuthProvider><NotificationProvider>{children}</NotificationProvider></AuthProvider>
            <AppToaster />
          </ModalProvider>
        </LocaleProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
