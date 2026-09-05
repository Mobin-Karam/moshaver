import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  api,
  ApiError,
  onAuthFailure,
  setApiWorkContext,
} from "../../../shared/api/api";
import type { AccountContext, OrganizationSummary, User } from "../../../shared/types/domain";
import {
  getCurrentUser,
  getAccountContext,
  loginRequest,
  logoutRequest,
} from "../api/auth.api";
import {
  AUTH_SIGNAL_KEY,
  normalizeUser,
  PENDING_LOGOUT_KEY,
  signalAuthEvent,
} from "../lib/auth-session";
import type {
  AuthState,
  AuthStatus,
} from "../model/auth.types";

export const AuthContext = createContext<AuthState | null>(null);

const MAX_RESTORE_ATTEMPTS = 3;
const RESTORE_RETRY_DELAY_MS = 1_800;

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [accountContext, setAccountContext] = useState<AccountContext | null>(null);
  const [activeRole, setActiveRoleState] = useState<AccountContext["roles"][number] | null>(null);
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [message, setMessage] = useState("در حال بررسی نشست امن…");
  const operation = useRef(0);
  const retryTimer = useRef<number>();
  const restoreAttempts = useRef(0);
  const lastCheck = useRef(0);

  const finishLocalLogout = useCallback(
    (text: string, broadcast = true) => {
      operation.current += 1;
      api.setCsrf();
      setUser(null);
      setAccountContext(null);
      setActiveRoleState(null);
      setApiWorkContext();
      setStatus("anonymous");
      setMessage(text);

      if (broadcast) {
        signalAuthEvent("logout");
      }
    },
    [],
  );

  const restore = useCallback(async () => {
    const current = ++operation.current;
    window.clearTimeout(retryTimer.current);

    setStatus((value) =>
      value === "authenticated" ? value : "checking",
    );

    setMessage("در حال بررسی نشست امن…");

    try {
      const raw = await getCurrentUser();
      const context = await getAccountContext().catch(() => null);
      const me = normalizeUser(context ? { ...context.user, role: context.roles[0] ?? raw.role } : raw);

      if (current !== operation.current) return;

      const nonStudent = context ? context.roles.some((role) => role !== "STUDENT") : me.role === "admin";
      if (!nonStudent) {
        try {
          await logoutRequest();
        } catch {
          sessionStorage.setItem(PENDING_LOGOUT_KEY, "1");
        }

        finishLocalLogout("این حساب مدیر نیست.");
        return;
      }

      lastCheck.current = Date.now();
      restoreAttempts.current = 0;
      setUser(me);
      setAccountContext(context);
      const role = context?.roles.find((item) => item !== "STUDENT") ?? null;
      setActiveRoleState(role);
      setApiWorkContext(role ?? undefined, context?.activeOrganization?.id);
      setStatus("authenticated");
      setMessage("");
    } catch (error) {
      if (current !== operation.current) return;

      if (error instanceof ApiError && error.status === 401) {
        restoreAttempts.current = 0;
        finishLocalLogout("");
        return;
      }

      restoreAttempts.current += 1;

      if (restoreAttempts.current >= MAX_RESTORE_ATTEMPTS) {
        finishLocalLogout(
          "پس از ۳ تلاش، سرور پاسخ نداد. می‌توانید دوباره تلاش کنید یا وارد حساب شوید.",
          false,
        );
        return;
      }

      setStatus("checking");

      setMessage(
        `ارتباط با سرور برقرار نشد؛ تلاش ${restoreAttempts.current} از ${MAX_RESTORE_ATTEMPTS} انجام شد و دوباره تلاش می‌کنیم…`,
      );

      retryTimer.current = window.setTimeout(
        () => void restore(),
        RESTORE_RETRY_DELAY_MS,
      );
    }
  }, [finishLocalLogout]);

  useEffect(() => {
    if (
      sessionStorage.getItem(PENDING_LOGOUT_KEY) === "1"
    ) {
      setStatus("logging-out");

      logoutRequest()
        .then(() => {
          sessionStorage.removeItem(PENDING_LOGOUT_KEY);
          finishLocalLogout("خروج قبلی تکمیل شد.");
        })
        .catch(() =>
          finishLocalLogout(
            "خروج قبلی هنوز منتظر اتصال اینترنت است.",
            false,
          ),
        );
    } else {
      void restore();
    }

    const stopAuthFailure = onAuthFailure((error) =>
      finishLocalLogout(
        error.message ||
          "نشست پایان یافته است. دوباره وارد شوید.",
      ),
    );

    const sync = () => {
      if (
        !document.hidden &&
        Date.now() - lastCheck.current > 15_000
      ) {
        void restore();
      }
    };

    const online = () => {
      if (
        sessionStorage.getItem(PENDING_LOGOUT_KEY) === "1"
      ) {
        void logoutRequest().then(() => {
          sessionStorage.removeItem(PENDING_LOGOUT_KEY);
          finishLocalLogout("خروج سرور هم تکمیل شد.");
        });
      } else {
        sync();
      }
    };

    const storage = (event: StorageEvent) => {
      if (
        event.key !== AUTH_SIGNAL_KEY ||
        !event.newValue
      ) {
        return;
      }

      try {
        const data = JSON.parse(event.newValue) as {
          kind?: string;
        };

        if (data.kind === "logout") {
          finishLocalLogout(
            "نشست در تب دیگری خارج شد.",
            false,
          );
        } else if (data.kind === "login") {
          void restore();
        }
      } catch {
        /* Ignore malformed cross-tab signals. */
      }
    };

    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pageshow", sync);
    window.addEventListener("online", online);
    window.addEventListener("storage", storage);

    return () => {
      stopAuthFailure();
      window.clearTimeout(retryTimer.current);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("online", online);
      window.removeEventListener("storage", storage);
    };
  }, [finishLocalLogout, restore]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      status,
      message,
      restore,
      stopRestore() {
        window.clearTimeout(retryTimer.current);
        restoreAttempts.current = 0;
        finishLocalLogout(
          "بازیابی نشست متوقف شد. برای ادامه وارد حساب شوید.",
          false,
        );
      },

      async login(username, password) {
        const current = ++operation.current;
        setMessage("");

        const data = await loginRequest(username, password);

        if (current !== operation.current) return;

        const normalizedUser = normalizeUser(data.user);
        const context = await getAccountContext().catch(() => null);
        const contextUser = context ? normalizeUser({ ...context.user, role: context.roles[0] ?? normalizedUser.role }) : normalizedUser;
        const nonStudent = context ? context.roles.some((role) => role !== "STUDENT") : normalizedUser.role === "admin";
        if (!nonStudent) {
          try {
            await logoutRequest();
          } catch {
            sessionStorage.setItem(PENDING_LOGOUT_KEY, "1");
          }

          finishLocalLogout("این حساب مدیر نیست.");
          throw new Error("این حساب مدیر نیست.");
        }

        sessionStorage.removeItem(PENDING_LOGOUT_KEY);
        api.setCsrf(data.csrfToken);
        setUser(contextUser);
        setAccountContext(context);
        const role = context?.roles.find((item) => item !== "STUDENT") ?? null;
        setActiveRoleState(role);
        setApiWorkContext(role ?? undefined, context?.activeOrganization?.id);
        setStatus("authenticated");
        restoreAttempts.current = 0;
        lastCheck.current = Date.now();
        signalAuthEvent("login");
      },

      async logout() {
        operation.current += 1;
        setStatus("logging-out");
        sessionStorage.setItem(PENDING_LOGOUT_KEY, "1");

        try {
          await logoutRequest();
          sessionStorage.removeItem(PENDING_LOGOUT_KEY);
          finishLocalLogout("با موفقیت خارج شدید.");
        } catch (error) {
          finishLocalLogout(
            error instanceof ApiError && error.status === 0
              ? "خروج محلی انجام شد؛ خروج سرور پس از اتصال تکمیل می‌شود."
              : "با موفقیت خارج شدید.",
          );
        }
      },

      hasRole(role) {
        return accountContext?.roles.some((item) => item.toLowerCase() === String(role).toLowerCase()) ?? user?.role === role;
      },
      context: accountContext,
      can(capability) {
        const scoped = accountContext?.workContexts?.find((item) => item.role === activeRole);
        return (scoped?.capabilities ?? accountContext?.capabilities ?? []).includes(capability);
      },
      activeRole,
      capabilities: accountContext?.workContexts?.find((item) => item.role === activeRole)?.capabilities ?? accountContext?.capabilities ?? [],
      setActiveRole(role) {
        if (!accountContext?.roles.includes(role)) return;
        setActiveRoleState(role);
        setApiWorkContext(role, accountContext.activeOrganization?.id);
      },
      setActiveOrganization(organization: OrganizationSummary | null) {
        setAccountContext((current) => current ? { ...current, activeOrganization: organization } : current);
        setApiWorkContext(activeRole ?? undefined, organization?.id);
      },
    }),
    [
      finishLocalLogout,
      message,
      restore,
      status,
      user,
      accountContext,
      activeRole,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
