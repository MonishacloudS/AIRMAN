"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

type Slot = { id: string; dayOfWeek: number; startTime: string; endTime: string };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AvailabilityPage() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.role !== "INSTRUCTOR") return;
    api<Slot[]>("/api/scheduling/availability").then(setSlots).catch(() => setSlots([]));
  }, [user?.role]);

  const addSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api("/api/scheduling/availability", {
        method: "POST",
        body: JSON.stringify({ dayOfWeek, startTime, endTime }),
      });
      const list = await api<Slot[]>("/api/scheduling/availability");
      setSlots(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const removeSlot = async (id: string) => {
    try {
      await api(`/api/scheduling/availability/${id}`, { method: "DELETE" });
      setSlots((prev: Slot[]) => prev.filter((s: Slot) => s.id !== id));
    } catch {}
  };

  if (user?.role !== "INSTRUCTOR") return <p>Access denied.</p>;

  return (
    <div>
      <h1>My availability</h1>
      <form onSubmit={addSlot} className="card" style={{ maxWidth: 400, marginTop: "1rem" }}>
        <div className="form-group">
          <label>Day</label>
          <select value={dayOfWeek} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDayOfWeek(Number(e.target.value))}>
            {DAYS.map((d: string, i: number) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Start</label>
          <input type="time" value={startTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)} />
        </div>
        <div className="form-group">
          <label>End</label>
          <input type="time" value={endTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)} />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="btn btn-primary">Add slot</button>
      </form>
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Current slots</h2>
        {slots.length === 0 ? (
          <p>No slots.</p>
        ) : (
          <ul style={{ listStyle: "none" }}>
            {slots.map((s: Slot) => (
              <li key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                {DAYS[s.dayOfWeek]} {s.startTime}–{s.endTime}
                <button type="button" className="btn btn-danger" style={{ padding: "0.2rem 0.5rem", fontSize: "0.875rem" }} onClick={() => removeSlot(s.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
