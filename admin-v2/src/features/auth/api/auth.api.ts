import { api, request } from "../../../shared/api/api";
import type { User } from "../../../shared/types/domain";
import type {
  BackendHealth,
  LoginResponse,
} from "../model/auth.types";

export function getCurrentUser() {
  return api.get<User>("/auth/me");
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
