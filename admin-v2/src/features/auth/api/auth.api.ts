import { api, request } from "../../../shared/api/api";
import type { User } from "../../../shared/types/domain";
import type {
  BackendHealth,
  LoginResponse,
} from "../model/auth.types";

export function getCurrentUser() {
  return request<User>("GET", "/auth/me", undefined, {
    timeoutMs: 7_000,
    suppressAuthFailure: true,
  });
}

export function loginRequest(
  username: string,
  password: string,
) {
  return api.post<LoginResponse>("/auth/login", {
    username,
    password,
  });
}

export function logoutRequest() {
  return api.post("/auth/logout", {});
}

export function checkBackendHealth() {
  return request<BackendHealth>(
    "GET",
    "/health",
    undefined,
    {
      suppressAuthFailure: true,
    },
  );
}
