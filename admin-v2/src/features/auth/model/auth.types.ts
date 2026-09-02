import type { User } from "../../../shared/types/domain";

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
};

export type LoginResponse = {
  user: User;
  csrfToken?: string;
};

export type BackendHealth = {
  status?: string;
  version?: string;
};
