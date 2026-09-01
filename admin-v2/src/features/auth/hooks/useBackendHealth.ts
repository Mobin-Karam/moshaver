import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { checkBackendHealth } from "../api/auth.api";
import type { BackendHealth } from "../model/auth.types";

type BackendHealthState = {
  loading: boolean;
  data?: BackendHealth;
  error?: string;
};

export function useBackendHealth() {
  const [health, setHealth] =
    useState<BackendHealthState>({
      loading: true,
    });

  const checkHealth = useCallback(async () => {
    setHealth({ loading: true });

    try {
      setHealth({
        loading: false,
        data: await checkBackendHealth(),
      });
    } catch {
      setHealth({
        loading: false,
        error: "این بک‌اند در دسترس نیست.",
      });
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  return {
    health,
    checkHealth,
  };
}
