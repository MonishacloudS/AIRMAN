"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

type Lesson = { id: string; title: string; type: string; order: number };
type Module = { id: string; title: string; order: number; lessons: Lesson[] };
type Course = {
  id: string;
  title: string;
  description: string | null;
  instructor: { id: string; email: string };
  modules: Module[];
};

export default function CourseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Course>(`/api/courses/${id}`)
      .then(setCourse)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"));
  }, [id]);

  if (error) return <p className="error-message">{error}</p>;
  if (!course) return <p>Loading...</p>;

  return (
    <div>
      <p style={{ marginBottom: "1rem" }}>
        <Link href="/dashboard/courses">← Courses</Link>
      </p>
      <h1>{course.title}</h1>
      {course.description && <p style={{ color: "#94a3b8", marginTop: "0.5rem" }}>{course.description}</p>}
      <p style={{ fontSize: "0.875rem", color: "#64748b" }}>Instructor: {course.instructor.email}</p>

      <h2 style={{ marginTop: "2rem", marginBottom: "0.75rem" }}>Modules & Lessons</h2>
      {course.modules.map((mod: Module) => (
        <div key={mod.id} className="card">
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{mod.title}</h3>
          <ul style={{ listStyle: "none" }}>
            {mod.lessons.map((les: Lesson) => (
              <li key={les.id} style={{ marginBottom: "0.35rem" }}>
                <Link href={`/dashboard/lessons/${les.id}`}>
                  {les.title}
                  <span className="badge badge-approved" style={{ marginLeft: "0.5rem", fontSize: "0.7rem" }}>
                    {les.type}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
