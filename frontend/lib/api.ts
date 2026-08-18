const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "/api"
    : "http://localhost:8009/api");

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  success?: boolean;
}

class ApiClient {
  private getAuthHeader(): HeadersInit {
    const headers: HeadersInit = {
      Accept: "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("cpms_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private handleUnauthorized() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("cpms_token");
      localStorage.removeItem("cpms_refresh_token");
      localStorage.removeItem("cpms_user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=1";
      }
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const headers = {
      ...this.getAuthHeader(),
      ...(options.headers || {}),
    };

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = res.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");
      const data = isJson ? await res.json() : null;

      if (!res.ok) {
        const isAuthEndpoint = endpoint.includes("/auth/login") || endpoint.includes("/auth/refresh");

        if (res.status === 401 && !isAuthEndpoint) {
          this.handleUnauthorized();
          throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
        }

        const serverError = data?.message || data?.error || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์";
        throw new Error(serverError);
      }

      return (data || (await res.text())) as T;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดไม่ทราบสาเหตุ";
      throw new Error(errorMsg);
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }
    return this.request<T>(url, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  async uploadFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const headers: HeadersInit = {
      Accept: "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("cpms_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    const contentType = res.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    const data = isJson ? await res.json() : null;

    if (!res.ok) {
      if (res.status === 401) {
        this.handleUnauthorized();
        throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
      }
      throw new Error(data?.message || data?.error || "อัปโหลดไฟล์ล้มเหลว");
    }

    return (data || (await res.text())) as T;
  }

  getDownloadUrl(filePath: string): string {
    const token = typeof window !== "undefined" ? localStorage.getItem("cpms_token") || "" : ""
    return `${API_BASE_URL}/files/download?path=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`
  }

  getFileUrl(pathOrUrl?: string): string {
    if (!pathOrUrl) return ""
    if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://") || pathOrUrl.startsWith("data:")) {
      return pathOrUrl
    }
    const cleanPath = pathOrUrl.startsWith("/api/") ? pathOrUrl.substring(4) : pathOrUrl
    if (cleanPath.startsWith("/")) {
      return `${API_BASE_URL}${cleanPath}`
    }
    return `${API_BASE_URL}/files/download?path=${encodeURIComponent(pathOrUrl)}`
  }

  getExportUrl(endpoint: string): string {
    const token = typeof window !== "undefined" ? localStorage.getItem("cpms_token") || "" : ""
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
    const separator = cleanEndpoint.includes("?") ? "&" : "?"
    return `${API_BASE_URL}${cleanEndpoint}${separator}token=${encodeURIComponent(token)}`
  }
}

export const api = new ApiClient()
