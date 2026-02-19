"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FeatureFlagsProvider, useFeatureFlags } from "@/context/FeatureFlagsContext";

function DashboardNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { hasFlag } = useFeatureFlags();

  if (!user) {
    router.replace("/login");
    return null;
  }

  const nav = [
    { href: "/dashboard", label: "Home" },
    { href: "/dashboard/courses", label: "Courses" },
    { href: "/dashboard/scheduling", label: "Scheduling" },
  ];
  if (user.role === "ADMIN") {
    nav.push({ href: "/dashboard/students", label: "Students" });
    nav.push({ href: "/dashboard/instructors", label: "Instructors" });
    nav.push({ href: "/dashboard/feature-flags", label: "Feature flags" });
  }
  if (user.role === "INSTRUCTOR") {
    nav.push({ href: "/dashboard/availability", label: "My Availability" });
  }

  return (
    <>
      <nav className="nav">
        {hasFlag("beta_ui") && (
          <span style={{ marginRight: "0.5rem", fontSize: "0.75rem", background: "#0ea5e9", color: "#fff", padding: "0.2rem 0.4rem", borderRadius: 4 }}>Beta</span>
        )}
        {nav.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? "active" : undefined}
          >
            {label}
          </Link>
        ))}
        <span style={{ marginLeft: "auto", color: "#64748b" }}>
          {user.email} ({user.role})
        </span>
        <button type="button" onClick={() => { logout(); router.push("/login"); }}>
          Logout
        </button>
      </nav>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  if (!user) {
    router.replace("/login");
    return null;
  }
  return (
    <FeatureFlagsProvider>
      <DashboardNav />
      <main className="container" style={{ paddingTop: "2rem" }}>
        {children}
      </main>
    </FeatureFlagsProvider>
  );
}
