"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { api, setAuth, clearAuth, User } from "@/lib/api";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, tenantId: string) => Promise<void>;
  register: (email: string, password: string, role: string, tenantId: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const u = await api<User>("/api/auth/me");
      setUser(u);
    } catch {
      setUser(null);
      clearAuth();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string, tenantId: string) => {
    const data = await api<{ user: User; accessToken: string; refreshToken: string }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password, tenantId }) }
    );
    setAuth({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUser(data.user);
  };

  const register = async (email: string, password: string, role: string, tenantId: string) => {
    const data = await api<{ user: User; accessToken: string; refreshToken: string }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify({ email, password, role, tenantId }) }
    );
    setAuth({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUser(data.user);
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
