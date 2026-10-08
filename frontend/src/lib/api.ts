const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");
const API_ORIGIN = API_BASE_URL.startsWith("/")
  ? ""
  : new URL(API_BASE_URL).origin;

type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function initializeCsrfCookie(): Promise<void> {
  const response = await fetch(`${API_ORIGIN}/sanctum/csrf-cookie`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new ApiError("Không thể khởi tạo phiên bảo mật. Vui lòng thử lại.", response.status);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("authToken");
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  const method = (options.method ?? "GET").toUpperCase();

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const xsrfToken = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length);
    if (xsrfToken) {
      headers.set("X-XSRF-TOKEN", decodeURIComponent(xsrfToken));
    }
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;
    const validationMessage = errorPayload?.errors
      ? Object.values(errorPayload.errors).flat()[0]
      : undefined;
    throw new ApiError(
      validationMessage ?? errorPayload?.message ?? "Không thể kết nối máy chủ. Vui lòng thử lại.",
      response.status,
    );
  }

  return payload as T;
}

export function getApiErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
}
