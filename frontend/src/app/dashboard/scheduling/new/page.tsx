"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

type Instructor = { id: string; email: string };

export default function NewBookingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [instructorId, setInstructorId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role !== "STUDENT") return;
    api<Instructor[]>("/api/users/instructors").then(setInstructors).catch(() => {});
  }, [user?.role]);

  if (user?.role !== "STUDENT") {
    router.replace("/dashboard/scheduling");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api("/api/scheduling/bookings", {
        method: "POST",
        body: JSON.stringify({
          date,
          startTime,
          endTime,
          ...(instructorId ? { instructorId } : {}),
        }),
      });
      router.push("/dashboard/scheduling/bookings");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Request a booking</h1>
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 400, marginTop: "1rem" }}>
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Start time (HH:mm)</label>
          <input type="time" value={startTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>End time (HH:mm)</label>
          <input type="time" value={endTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Instructor (optional; admin can assign later)</label>
          <select value={instructorId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setInstructorId(e.target.value)}>
            <option value="">— Select —</option>
            {instructors.map((i: Instructor) => (
              <option key={i.id} value={i.id}>{i.email}</option>
            ))}
          </select>
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit request"}
        </button>
      </form>
    </div>
  );
}
