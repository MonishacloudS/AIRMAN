"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

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

export default function CoursesPage() {
  const [data, setData] = useState<Paginated | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api<Paginated>(`/api/courses?page=${page}&limit=10${search ? `&search=${encodeURIComponent(search)}` : ""}`)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [page, search]);

  const doSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div>
      <h1>Courses</h1>
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
