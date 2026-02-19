const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN";

export interface User {
  id: string;
  email: string;
  role: Role;
  approved: boolean;
  tenantId?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

async function refreshAccessToken(): Promise<string | null> {
  const ref = localStorage.getItem("refreshToken");
  if (!ref) return null;
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: ref }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  localStorage.setItem("accessToken", data.accessToken);
  return data.accessToken;
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getStoredToken();
  if (!token && path !== "/api/auth/login" && path !== "/api/auth/register" && path !== "/api/auth/tenants") {
    token = await refreshAccessToken();
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function setAuth(tokens: { accessToken: string; refreshToken: string }) {
  localStorage.setItem("accessToken", tokens.accessToken);
  localStorage.setItem("refreshToken", tokens.refreshToken);
}

export function clearAuth() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export { API_URL };
