import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./app/providers";
import { queryClient } from "./app/query-client";
import { router } from "./app/router";
import "./styles/globals.css";
import { initializeTheme } from "./shared/theme/theme";
import { API_WORK_CONTEXT_EVENT } from "./shared/api/api";
import { AppErrorBoundary } from "./shared/errors";

document.documentElement.dir = "rtl";
document.documentElement.lang = "fa";
initializeTheme();
window.addEventListener(API_WORK_CONTEXT_EVENT, () => queryClient.clear());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <AppErrorBoundary>
        <RouterProvider router={router} />
      </AppErrorBoundary>
    </AppProviders>
  </React.StrictMode>,
);
