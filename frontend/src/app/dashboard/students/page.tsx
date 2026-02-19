"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

type Student = { id: string; email: string; approved: boolean; createdAt: string };

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    api<Student[]>("/api/users/students").then(setStudents).catch(() => setStudents([]));
  }, [user?.role]);

  const approve = async (id: string) => {
    try {
      await api(`/api/users/students/${id}/approve`, { method: "PATCH" });
      setStudents((prev: Student[]) => prev.map((s: Student) => (s.id === id ? { ...s, approved: true } : s)));
    } catch {}
  };

  if (user?.role !== "ADMIN") return <p>Access denied.</p>;

  return (
    <div>
      <h1>Students</h1>
      <p style={{ color: "#94a3b8", marginTop: "0.5rem" }}>Approve students to allow login.</p>
      <div className="card" style={{ marginTop: "1rem" }}>
        {students.length === 0 ? (
          <p>No students.</p>
        ) : (
          <ul style={{ listStyle: "none" }}>
            {students.map((s: Student) => (
              <li key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0", borderBottom: "1px solid #334155" }}>
                <span>{s.email}</span>
                {s.approved ? (
                  <span className="badge badge-approved">Approved</span>
                ) : (
                  <button type="button" className="btn btn-primary" style={{ padding: "0.25rem 0.5rem" }} onClick={() => approve(s.id)}>Approve</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
