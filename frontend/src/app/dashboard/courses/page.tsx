"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Course = {
  id: string;
  title: string;
  description: string | null;
  instructor: { id: string; email: string };
  modules: { id: string; title: string }[];
};

type Paginated = {
  items: Course[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type Instructor = { id: string; email: string };

function fetchCourses(page: number, search: string): Promise<Paginated> {
  return api<Paginated>(`/api/courses?page=${page}&limit=10${search ? `&search=${encodeURIComponent(search)}` : ""}`);
}

export default function CoursesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Paginated | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createInstructorId, setCreateInstructorId] = useState("");
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const canCreate = user?.role === "ADMIN" || user?.role === "INSTRUCTOR";

  useEffect(() => {
    setLoading(true);
    fetchCourses(page, search)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      api<Instructor[]>("/api/users/instructors").then(setInstructors).catch(() => {});
    }
  }, [user?.role]);

  const doSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!createTitle.trim()) {
      setCreateError("Title is required");
      return;
    }
    if (user?.role === "ADMIN" && !createInstructorId) {
      setCreateError("Select an instructor");
      return;
    }
    setCreating(true);
    try {
      await api("/api/courses", {
        method: "POST",
        body: JSON.stringify({
          title: createTitle.trim(),
          description: createDesc.trim() || undefined,
          ...(user?.role === "ADMIN" ? { instructorId: createInstructorId } : {}),
        }),
      });
      setCreateTitle("");
      setCreateDesc("");
      setCreateInstructorId("");
      setShowCreate(false);
      setPage(1);
      const updated = await fetchCourses(1, search);
      setData(updated);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1>Courses</h1>
      {canCreate && (
        <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
          {!showCreate ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              Create course
            </button>
          ) : (
            <div className="card" style={{ maxWidth: 480, padding: "1rem" }}>
              <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Create course</h2>
              <form onSubmit={handleCreateCourse}>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={createTitle}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateTitle(e.target.value)}
                    placeholder="Course title"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description (optional)</label>
                  <input
                    type="text"
                    value={createDesc}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateDesc(e.target.value)}
                    placeholder="Short description"
                  />
                </div>
                {user?.role === "ADMIN" && (
                  <div className="form-group">
                    <label>Instructor</label>
                    <select
                      value={createInstructorId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCreateInstructorId(e.target.value)}
                      required
                    >
                      <option value="">— Select instructor —</option>
                      {instructors.map((i: Instructor) => (
                        <option key={i.id} value={i.id}>{i.email}</option>
                      ))}
                    </select>
                  </div>
                )}
                {createError && <p className="error-message" style={{ marginBottom: "0.5rem" }}>{createError}</p>}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button type="submit" className="btn btn-primary" disabled={creating}>
                    {creating ? "Creating..." : "Create"}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowCreate(false); setCreateError(""); }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
      <form onSubmit={doSearch} style={{ marginTop: "1rem", marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
        <input
          type="search"
          placeholder="Search by course title..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="form-group"
          style={{ maxWidth: 300, marginBottom: 0 }}
        />
        <button type="submit" className="btn btn-primary">Search</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      {loading && <p>Loading...</p>}
      {data && !loading && (
        <>
          {data.items.length === 0 ? (
            <p className="card">No courses found.</p>
          ) : (
            <div className="grid">
              {data.items.map((c: Course) => (
                <div key={c.id} className="card">
                  <h2 style={{ fontSize: "1.125rem" }}>
                    <Link href={`/dashboard/courses/${c.id}`}>{c.title}</Link>
                  </h2>
                  {c.description && <p style={{ color: "#94a3b8", marginTop: "0.25rem" }}>{c.description}</p>}
                  <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.5rem" }}>
                    Instructor: {c.instructor.email} · {c.modules.length} module(s)
                  </p>
                </div>
              ))}
            </div>
          )}
          {data.totalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p: number) => p - 1)}
              >
                Previous
              </button>
              <span style={{ alignSelf: "center" }}>
                Page {page} of {data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p: number) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
