import axios from "axios";
import type { AxiosError, AxiosRequestConfig } from "axios";
import { apiErrorKind, apiErrorMessage, type ApiErrorBody, type ApiErrorKind } from "./apiError";

// Vite proxy serves /api locally. The production nginx also proxies /api to Laravel.
// For a distinct deployment, set VITE_API_BASE_URL to an HTTPS API origin ending in /api.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export type { ApiErrorBody };
/** Khoá chống gửi trùng (header Idempotency-Key) — server trả lại kết quả cũ nếu gửi lại cùng khoá + cùng nội dung. */
export function newIdempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Cờ (sessionStorage) báo trang Đăng nhập rằng phiên trước đã hết hạn. */
export const SESSION_EXPIRED_KEY = "carservice_session_expired";
export class ApiClientError extends Error {
  readonly status: number;
  readonly data: ApiErrorBody | null;
  /** Loại lỗi đã phân biệt: mất mạng, hết thời gian, 401, 403, 404, 409, 422, 429, 5xx... */
  readonly kind: ApiErrorKind;
  constructor(message: string, status: number, data: ApiErrorBody | null, kind: ApiErrorKind = apiErrorKind(status)) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
    this.kind = kind;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20000,
  headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token && token !== "session_authenticated") config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0;
    // Proxy/gateway có thể trả HTML: chỉ đọc nội dung khi là JSON object.
    const body: unknown = error.response?.data;
    const data = body && typeof body === "object" ? body as ApiErrorBody : null;
    const kind = apiErrorKind(status, error.code);
    const message = apiErrorMessage(kind, data);
    // Backend enforces role/ownership; 401 invalidates the cached session.
    if (status === 401) {
      // Đang có phiên mà bị 401 = token hết hạn (24 giờ) / bị thu hồi → trang Đăng nhập báo cho người dùng.
      if (localStorage.getItem("token")) sessionStorage.setItem(SESSION_EXPIRED_KEY, "1");
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("isLoggedIn");
      window.dispatchEvent(new Event("user-updated"));
    }
    return Promise.reject(new ApiClientError(message, status, data, kind));
  },
);

/** Compatible adapter for existing modules using fetchApi(endpoint, RequestInit). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Chữ ký tương thích với các module cũ chưa khai báo DTO.
export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const method = options.method || "GET";
  let data: unknown = options.body;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { /* Allow ordinary text payloads. */ }
  }
  const headers: Record<string, string> = {};
  new Headers(options.headers).forEach((value, key) => { headers[key] = value; });
  const config: AxiosRequestConfig = { url: path, method, data, headers, signal: options.signal ?? undefined };
  const response = await apiClient.request<T>(config);
  return response.data;
}
