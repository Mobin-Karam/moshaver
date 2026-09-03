import type { adminBreadcrumbs, resolveAdminNavigation } from "./admin-navigation";

export type AdminCurrentNavigation = ReturnType<typeof resolveAdminNavigation>;
export type AdminBreadcrumb = ReturnType<typeof adminBreadcrumbs>[number];
