"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Tenant } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "INSTRUCTOR" | "ADMIN">("STUDENT");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState("");
  const { register, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetch(`${API_URL}/api/auth/tenants`).then((r) => r.json()).then(setTenants).catch(() => {});
  }, []);

  if (user) {
    router.replace("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!tenantId) {
      setError("Select a school");
      return;
    }
    try {
      await register(email, password, role, tenantId);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: "3rem" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Register</h1>
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
          <label>Password (min 8 characters)</label>
          <input
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="form-group">
          <label>Role</label>
          <select value={role} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRole(e.target.value as "STUDENT" | "INSTRUCTOR" | "ADMIN")}>
            <option value="STUDENT">Student (requires admin approval)</option>
            <option value="INSTRUCTOR">Instructor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }}>
          Register
        </button>
      </form>
      <p style={{ marginTop: "1rem", color: "#94a3b8" }}>
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </div>
  );
}
