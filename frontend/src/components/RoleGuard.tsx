"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export function RoleGuard({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user || !allowedRoles.includes(user.role)) return null;
  return <>{children}</>;
}
