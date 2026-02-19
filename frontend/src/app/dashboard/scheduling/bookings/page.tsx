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

type Instructor = { id: string; email: string };

export default function BookingsListPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveInstructorId, setApproveInstructorId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<Booking[]>("/api/scheduling/bookings").then(setBookings).catch(() => setBookings([]));
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      api<Instructor[]>("/api/users/instructors").then(setInstructors).catch(() => {});
    }
  }, [user?.role]);

  const refresh = () => api<Booking[]>("/api/scheduling/bookings").then(setBookings);

  const approve = async () => {
    if (!approveId || !approveInstructorId) return;
    setError("");
    try {
      await api(`/api/scheduling/bookings/${approveId}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ instructorId: approveInstructorId }),
      });
      setApproveId(null);
      setApproveInstructorId("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed (check conflict)");
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await api(`/api/scheduling/bookings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      refresh();
    } catch {}
  };

  return (
    <div>
      <h1>All bookings</h1>
      {user?.role === "STUDENT" && (
        <p style={{ marginTop: "0.5rem" }}>
          <a href="/dashboard/scheduling/new">Request a new booking</a>
        </p>
      )}
      {error && <p className="error-message">{error}</p>}
      {approveId && (
        <div className="card" style={{ marginTop: "1rem", background: "#334155" }}>
          <p>Assign instructor for this booking:</p>
          <select value={approveInstructorId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setApproveInstructorId(e.target.value)} style={{ marginTop: "0.5rem", padding: "0.35rem" }}>
            <option value="">— Select —</option>
            {instructors.map((i: Instructor) => (
              <option key={i.id} value={i.id}>{i.email}</option>
            ))}
          </select>
          <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-primary" onClick={approve} disabled={!approveInstructorId}>Approve & assign</button>
            <button type="button" className="btn btn-secondary" onClick={() => { setApproveId(null); setError(""); }}>Cancel</button>
          </div>
        </div>
      )}
      <div className="card" style={{ marginTop: "1rem" }}>
        {bookings.length === 0 ? (
          <p>No bookings.</p>
        ) : (
          <ul style={{ listStyle: "none" }}>
            {bookings.map((b: Booking) => (
              <li key={b.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #334155" }}>
                <span className={`badge badge-${b.status.toLowerCase()}`} style={{ marginRight: "0.5rem" }}>{b.status}</span>
                {b.date} {b.startTime}–{b.endTime}
                {b.student && ` · ${b.student.email}`}
                {b.instructor && ` · ${b.instructor.email}`}
                {user?.role === "ADMIN" && b.status === "REQUESTED" && (
                  <button type="button" className="btn btn-primary" style={{ marginLeft: "0.5rem", padding: "0.2rem 0.5rem" }} onClick={() => setApproveId(b.id)}>Approve / assign</button>
                )}
                {(user?.role === "ADMIN" || user?.role === "INSTRUCTOR") && (b.status === "APPROVED" || b.status === "ASSIGNED") && (
                  <button type="button" className="btn btn-secondary" style={{ marginLeft: "0.5rem", padding: "0.2rem 0.5rem" }} onClick={() => setStatus(b.id, "COMPLETED")}>Mark completed</button>
                )}
                {(user?.role === "ADMIN" || user?.role === "INSTRUCTOR" || user?.role === "STUDENT") && (b.status === "REQUESTED" || b.status === "APPROVED" || b.status === "ASSIGNED") && (
                  <button type="button" className="btn btn-danger" style={{ marginLeft: "0.25rem", padding: "0.2rem 0.5rem" }} onClick={() => setStatus(b.id, "CANCELLED")}>Cancel</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
