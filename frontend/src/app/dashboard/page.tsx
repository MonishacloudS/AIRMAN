"use client";

import * as React from "react";
import { useAuth } from "@/context/AuthContext";
import { useFeatureFlags } from "@/context/FeatureFlagsContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const { hasFlag } = useFeatureFlags();

  return (
    <div>
      <h1>Dashboard</h1>
      <p style={{ color: "#94a3b8", marginTop: "0.5rem" }}>
        Welcome, {user?.email}. You are signed in as <strong>{user?.role}</strong>.
      </p>
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>Quick links</h2>
        <ul style={{ listStyle: "inside", color: "#94a3b8" }}>
          <li><a href="/dashboard/courses">Browse courses & take quizzes</a></li>
          <li><a href="/dashboard/scheduling">View bookings & calendar</a></li>
          {hasFlag("advanced_analytics") && (
            <li><a href="/dashboard/courses">Advanced analytics</a> <span style={{ fontSize: "0.75rem", color: "#0ea5e9" }}>(flag)</span></li>
          )}
          {user?.role === "ADMIN" && (
            <>
              <li><a href="/dashboard/students">Approve students</a></li>
              <li><a href="/dashboard/instructors">Create instructors</a></li>
              <li><a href="/dashboard/feature-flags">Manage feature flags</a></li>
            </>
          )}
          {user?.role === "INSTRUCTOR" && (
            <li><a href="/dashboard/availability">Manage availability</a></li>
          )}
        </ul>
      </div>
    </div>
  );
}
