export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://carservice-vn.up.railway.app/api"
).replace(/\/$/, "");

export const fetchApi = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = localStorage.getItem("token");

  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Accept", "application/json");

  if (token && token !== "session_authenticated") {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const response = await fetch(
    `${API_BASE_URL}${normalizedEndpoint}`,
    {
      ...options,
      headers,
      credentials: "include",
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = Object.assign(
      new Error(data?.message || "Something went wrong"),
      {
        status: response.status,
        data,
      }
    );

    throw error;
  }

  return data;
};