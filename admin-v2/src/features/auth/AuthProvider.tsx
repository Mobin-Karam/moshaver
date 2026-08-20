import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import type { User } from "../../types/domain";

type AuthState = { user: User | null; status: "checking" | "authenticated" | "anonymous"; login: (username: string, password: string) => Promise<void>; logout: () => Promise<void>; hasRole: (role: User["role"]) => boolean };
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("checking");

  const restore = useCallback(async () => {
    setStatus("checking");
    try {
      const me = await api.get<User>("/auth/me");
      if (me.role !== "admin") throw new Error("این حساب مدیر نیست.");
      setUser(me);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    void restore();
  }, [restore]);

  const value = useMemo<AuthState>(() => ({
    user,
    status,
    async login(username, password) {
      const data = await api.post<{ user: User; csrfToken?: string }>("/auth/login", { username, password });
      if (data.user.role !== "admin") {
        await api.post("/auth/logout", {});
        throw new Error("این حساب مدیر نیست.");
      }
      api.setCsrf(data.csrfToken);
      setUser(data.user);
      setStatus("authenticated");
    },
    async logout() {
      try {
        await api.post("/auth/logout", {});
      } finally {
        api.setCsrf();
        setUser(null);
        setStatus("anonymous");
      }
    },
    hasRole(role) {
      return user?.role === role;
    },
  }), [status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
