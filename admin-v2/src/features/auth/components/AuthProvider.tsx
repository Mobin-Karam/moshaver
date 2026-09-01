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
} from "../../../shared/api/api";
import type { User } from "../../../shared/types/domain";
import {
  getCurrentUser,
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

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [message, setMessage] = useState("در حال بررسی نشست امن…");
  const operation = useRef(0);
  const retryTimer = useRef<number>();
  const lastCheck = useRef(0);

  const finishLocalLogout = useCallback(
    (text: string, broadcast = true) => {
      operation.current += 1;
      api.setCsrf();
      setUser(null);
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

    setStatus((value) =>
      value === "authenticated" ? value : "checking",
    );

    setMessage("در حال بررسی نشست امن…");

    try {
      const me = normalizeUser(await getCurrentUser());

      if (current !== operation.current) return;

      if (me.role !== "admin") {
        try {
          await logoutRequest();
        } catch {
          sessionStorage.setItem(PENDING_LOGOUT_KEY, "1");
        }

        finishLocalLogout("این حساب مدیر نیست.");
        return;
      }

      lastCheck.current = Date.now();
      setUser(me);
      setStatus("authenticated");
      setMessage("");
    } catch (error) {
      if (current !== operation.current) return;

      if (error instanceof ApiError && error.status === 401) {
        finishLocalLogout("");
        return;
      }

      setStatus("checking");

      setMessage(
        "ارتباط با سرور موقتاً برقرار نیست؛ نشست حذف نشده و دوباره تلاش می‌کنیم…",
      );

      window.clearTimeout(retryTimer.current);

      retryTimer.current = window.setTimeout(
        () => void restore(),
        1800,
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

      async login(username, password) {
        const current = ++operation.current;
        setMessage("");

        const data = await loginRequest(username, password);

        if (current !== operation.current) return;

        const normalizedUser = normalizeUser(data.user);

        if (normalizedUser.role !== "admin") {
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
        setUser(normalizedUser);
        setStatus("authenticated");
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
        return user?.role === role;
      },
    }),
    [
      finishLocalLogout,
      message,
      restore,
      status,
      user,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
