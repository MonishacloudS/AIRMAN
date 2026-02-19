"use client";

import * as React from "react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function InstructorsPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (user?.role !== "ADMIN") return <p>Access denied.</p>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api("/api/users/instructors", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSuccess(`Instructor ${email} created.`);
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div>
      <h1>Create instructor</h1>
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 400, marginTop: "1rem" }}>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password (min 8)</label>
          <input type="password" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} required minLength={8} />
        </div>
        {error && <p className="error-message">{error}</p>}
        {success && <p style={{ color: "#4ade80" }}>{success}</p>}
        <button type="submit" className="btn btn-primary">Create instructor</button>
      </form>
    </div>
  );
}
