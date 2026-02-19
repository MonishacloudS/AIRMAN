"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

type Booking = {
  id: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  student?: { email: string };
  instructor?: { email: string } | null;
};

function getWeekStart(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

export default function SchedulingPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<Booking[]>(`/api/scheduling/calendar?weekStart=${weekStart}`)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [weekStart]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  return (
    <div>
      <h1>Scheduling</h1>
      <p style={{ color: "#94a3b8", marginTop: "0.5rem" }}>
        Weekly calendar view. {user?.role === "STUDENT" && <a href="/dashboard/scheduling/new">Request a booking</a>}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-secondary" onClick={prevWeek}>← Previous week</button>
        <span><strong>Week of {weekStart}</strong></span>
        <button type="button" className="btn btn-secondary" onClick={nextWeek}>Next week →</button>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && (
        <div className="card" style={{ marginTop: "1rem" }}>
          {bookings.length === 0 ? (
            <p>No bookings this week.</p>
          ) : (
            <ul style={{ listStyle: "none" }}>
              {bookings.map((b: Booking) => (
                <li key={b.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #334155" }}>
                  <span className={`badge badge-${b.status.toLowerCase()}`} style={{ marginRight: "0.5rem" }}>{b.status}</span>
                  {b.date} {b.startTime}–{b.endTime}
                  {b.student && ` · Student: ${b.student.email}`}
                  {b.instructor && ` · Instructor: ${b.instructor.email}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p style={{ marginTop: "1rem" }}>
        <a href="/dashboard/scheduling/bookings">View all bookings</a>
      </p>
    </div>
  );
}
