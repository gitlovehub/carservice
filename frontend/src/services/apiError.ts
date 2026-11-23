/** Phân loại và diễn đạt lỗi API tại một chỗ: mọi màn hình chỉ nhận thông báo tiếng Việt an toàn. */
export type ApiErrorKind = "network" | "offline" | "timeout" | "canceled" | "unauthenticated" | "forbidden" | "not_found"
  | "conflict" | "validation" | "rate_limited" | "server" | "unavailable" | "request";

export type ApiErrorBody = { success?: boolean; code?: string; message?: string; errors?: Record<string, string[]>; reference?: string };

const GENERIC_MESSAGE = "Đã xảy ra lỗi. Vui lòng thử lại.";

const KIND_MESSAGES: Record<ApiErrorKind, string> = {
  network: "Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng rồi thử lại.",
  offline: "Bạn đang mất kết nối mạng. Vui lòng kiểm tra mạng rồi thử lại.",
  timeout: "Máy chủ phản hồi quá lâu. Vui lòng thử lại.",
  canceled: "Yêu cầu đã được hủy.",
  unauthenticated: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  not_found: "Không tìm thấy dữ liệu. Dữ liệu có thể đã bị xóa hoặc đường dẫn không đúng.",
  conflict: "Dữ liệu vừa được thay đổi. Vui lòng tải lại rồi thử lại.",
  validation: "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.",
  rate_limited: "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
  server: "Hệ thống gặp sự cố. Vui lòng thử lại sau ít phút.",
  unavailable: "Hệ thống đang tạm gián đoạn. Vui lòng thử lại sau ít phút.",
  request: "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại và thử lại.",
};

const TECHNICAL = /SQLSTATE|stack trace|\bselect\b[\s\S]+\bfrom\b|Unauthenticated|This action is unauthorized|No query results|Too Many Attempts|Server Error|Network Error|Request failed with status|timeout of \d+ms|[A-Za-z]:[\\/][\w.-]+[\\/]|\/(?:var|usr|home)\/|vendor[\\/]|App\\|Illuminate\\|Undefined (?:variable|array key|property)|Call to (?:undefined|a member)|Class ".*" not found/i;

export const isTechnicalMessage = (message: string) => TECHNICAL.test(message);

export function apiErrorKind(status: number, transportCode?: string): ApiErrorKind {
  if (status === 0) {
    if (transportCode === "ERR_CANCELED") return "canceled";
    if (transportCode === "ECONNABORTED" || transportCode === "ETIMEDOUT") return "timeout";
    return typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "network";
  }
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation";
  if (status === 429) return "rate_limited";
  if (status === 502 || status === 503 || status === 504) return "unavailable";
  return status >= 500 ? "server" : "request";
}

/** Lỗi 5xx luôn dùng câu chung (kèm mã tra cứu nếu có); lỗi 4xx giữ thông báo nghiệp vụ của Backend khi an toàn. */
export function apiErrorMessage(kind: ApiErrorKind, data: ApiErrorBody | null) {
  if (kind === "server") return data?.reference ? `${KIND_MESSAGES.server} Mã tra cứu: ${data.reference}.` : KIND_MESSAGES.server;
  if (kind === "unavailable" || kind === "network" || kind === "offline" || kind === "timeout" || kind === "canceled") return KIND_MESSAGES[kind];
  const validation = data?.errors ? Object.values(data.errors).flat()[0] : undefined;
  const message = validation || data?.message;
  return message && !isTechnicalMessage(message) ? message : KIND_MESSAGES[kind];
}

/** Thông báo hiển thị cho người dùng từ một lỗi bất kỳ; lỗi lập trình JS không được in ra giao diện. */
export function userErrorMessage(error: unknown, fallback = GENERIC_MESSAGE) {
  if (!(error instanceof Error) || !error.message) return fallback;
  if (error instanceof TypeError || error instanceof ReferenceError || error instanceof SyntaxError || error instanceof RangeError) {
    console.error(error);
    return fallback;
  }
  return isTechnicalMessage(error.message) ? fallback : error.message;
}
