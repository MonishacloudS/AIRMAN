"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

type Flag = { id: string; name: string; enabledRoles: string[] };

export default function FeatureFlagsPage() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [name, setName] = useState("");
  const [enabledRoles, setEnabledRoles] = useState<string[]>(["ADMIN"]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    api<Flag[]>("/api/feature-flags/all")
      .then(setFlags)
      .catch(() => setFlags([]));
  }, [user?.role]);

  const toggleRole = (role: string) => {
    setEnabledRoles((prev: string[]) =>
      prev.includes(role) ? prev.filter((r: string) => r !== role) : [...prev, role]
    );
  };

  const createFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      setError("Name must be snake_case (lowercase, start with letter)");
      return;
    }
    try {
      await api("/api/feature-flags", {
        method: "POST",
        body: JSON.stringify({ name, enabledRoles }),
      });
      setSuccess(`Flag "${name}" created.`);
      setName("");
      setEnabledRoles(["ADMIN"]);
      const list = await api<Flag[]>("/api/feature-flags/all");
      setFlags(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const updateRoles = async (id: string, roles: string[]) => {
    try {
      await api(`/api/feature-flags/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabledRoles: roles }),
      });
      setFlags((prev: Flag[]) => prev.map((f: Flag) => (f.id === id ? { ...f, enabledRoles: roles } : f)));
    } catch {}
  };

  const deleteFlag = async (id: string) => {
    try {
      await api(`/api/feature-flags/${id}`, { method: "DELETE" });
      setFlags((prev: Flag[]) => prev.filter((f: Flag) => f.id !== id));
    } catch {}
  };

  if (user?.role !== "ADMIN") return <p>Access denied.</p>;

  return (
    <div>
      <h1>Feature flags</h1>
      <p style={{ color: "#94a3b8", marginTop: "0.5rem" }}>
        Role-based flags control which features each role can see. Users get flags for their role via <code>GET /api/feature-flags</code>.
      </p>

      <div className="card" style={{ marginTop: "1rem", maxWidth: 480 }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Create flag</h2>
        <form onSubmit={createFlag}>
          <div className="form-group">
            <label>Name (snake_case)</label>
            <input
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="e.g. advanced_analytics"
              required
            />
          </div>
          <div className="form-group">
            <label>Enabled for roles</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {["STUDENT", "INSTRUCTOR", "ADMIN"].map((role: string) => (
                <label key={role} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <input
                    type="checkbox"
                    checked={enabledRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="error-message">{error}</p>}
          {success && <p style={{ color: "#4ade80" }}>{success}</p>}
          <button type="submit" className="btn btn-primary">Create</button>
        </form>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Current flags</h2>
        {flags.length === 0 ? (
          <p>No flags. Create one above or run seed.</p>
        ) : (
          <ul style={{ listStyle: "none" }}>
            {flags.map((f: Flag) => (
              <li key={f.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <strong>{f.name}</strong>
                <span style={{ color: "#64748b" }}>→ {f.enabledRoles.join(", ")}</span>
                <div style={{ display: "flex", gap: "0.25rem", marginLeft: "auto" }}>
                  {["STUDENT", "INSTRUCTOR", "ADMIN"].map((role: string) => (
                    <button
                      key={role}
                      type="button"
                      className={`btn ${f.enabledRoles.includes(role) ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem" }}
                      onClick={() => updateRoles(f.id, f.enabledRoles.includes(role) ? f.enabledRoles.filter((r: string) => r !== role) : [...f.enabledRoles, role])}
                    >
                      {role}
                    </button>
                  ))}
                  <button type="button" className="btn btn-danger" style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem" }} onClick={() => deleteFlag(f.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
