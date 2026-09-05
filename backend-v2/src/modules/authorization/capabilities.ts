export const ROLE_CODES = ["STUDENT", "GUARDIAN", "ADVISOR", "TEACHER", "MENTOR", "CONTENT_MANAGER", "ORGANIZATION_ADMIN", "PLATFORM_ADMIN"] as const;
export type RoleCode = typeof ROLE_CODES[number];
