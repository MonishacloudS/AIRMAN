"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Tenant } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState("");
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const url = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/auth/tenants";
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTenants(Array.isArray(data) ? data : []))
      .catch(() => setTenants([]));
  }, []);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!tenantId) {
      setError("Select a school");
      return;
    }
    try {
      await login(email, password, tenantId);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: "3rem" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Sign in</h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>School</label>
          <select value={tenantId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTenantId(e.target.value)} required>
            <option value="">— Select school —</option>
            {tenants.map((t: Tenant) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }}>
          Sign in
        </button>
      </form>
      <p style={{ marginTop: "1rem", color: "#94a3b8" }}>
        No account? <a href="/register">Register</a>
      </p>
    </div>
  );
}
