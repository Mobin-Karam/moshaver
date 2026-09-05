import type { AccountContext, OrganizationSummary, User } from "../../../shared/types/domain";

export type AuthStatus =
  | "checking"
  | "authenticated"
  | "anonymous"
  | "logging-out";

export type AuthState = {
  user: User | null;
  status: AuthStatus;
  message: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  stopRestore: () => void;
  hasRole: (role: User["role"]) => boolean;
  context: AccountContext | null;
  can: (capability: string) => boolean;
  activeRole: AccountContext["roles"][number] | null;
  capabilities: string[];
  setActiveRole: (role: AccountContext["roles"][number]) => void;
  setActiveOrganization: (organization: OrganizationSummary | null) => void;
};

export type LoginResponse = {
  user: User;
  csrfToken?: string;
};

export type BackendHealth = {
  status?: string;
  version?: string;
};
