"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

type TextContent = { body: string };
type QuizQuestion = { id: string; prompt: string; options: string[]; correctIndex: number; order: number };
type Quiz = { id: string; questions: QuizQuestion[] };
type Lesson = {
  id: string;
  title: string;
  type: string;
  content?: TextContent | null;
  quiz?: Quiz | null;
};

export default function LessonPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState<{ score: number; total: number; incorrect: { questionIndex: number; correctIndex: number; prompt: string }[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Lesson>(`/api/courses/lessons/${id}`)
      .then((l: Lesson) => {
        setLesson(l);
        if (l.quiz?.questions) setAnswers(l.quiz.questions.map(() => 0));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"));
  }, [id]);

  const submitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson?.quiz) return;
    setError("");
    try {
      const result = await api<{ score: number; total: number; incorrect: { questionIndex: number; correctIndex: number; prompt: string }[] }>(
        `/api/courses/lessons/${id}/quiz/attempt`,
        { method: "POST", body: JSON.stringify({ answers }) }
      );
      setSubmitted(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    }
  };

  if (error && !lesson) return <p className="error-message">{error}</p>;
  if (!lesson) return <p>Loading...</p>;

  return (
    <div>
      <p style={{ marginBottom: "1rem" }}>
        <Link href="/dashboard/courses">← Courses</Link>
      </p>
      <h1>{lesson.title}</h1>
      <p style={{ color: "#94a3b8" }}>Type: {lesson.type}</p>

      {lesson.type === "TEXT" && lesson.content && (
        <div className="card" style={{ marginTop: "1rem", whiteSpace: "pre-wrap" }}>
          {lesson.content.body}
        </div>
      )}

      {lesson.type === "QUIZ" && lesson.quiz && (
        <div className="card" style={{ marginTop: "1rem" }}>
          {submitted ? (
            <>
              <h2>Result: {submitted.score} / {submitted.total}</h2>
              {submitted.incorrect.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h3 style={{ fontSize: "1rem" }}>Incorrect answers</h3>
                  <ul style={{ marginTop: "0.5rem" }}>
                    {submitted.incorrect.map((inc: { prompt: string; correctIndex: number }, i: number) => (
                      <li key={i} style={{ marginBottom: "0.5rem" }}>
                        <strong>{inc.prompt}</strong> — Correct option index: {inc.correctIndex}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={submitQuiz}>
              {lesson.quiz.questions
                .sort((a: QuizQuestion, b: QuizQuestion) => a.order - b.order)
                .map((q: QuizQuestion, i: number) => (
                  <div key={q.id} className="form-group" style={{ marginBottom: "1.25rem" }}>
                    <label><strong>Q{i + 1}:</strong> {q.prompt}</label>
                    <div style={{ marginTop: "0.5rem" }}>
                      {q.options.map((opt: string, j: number) => (
                        <label key={j} style={{ display: "block", marginBottom: "0.25rem" }}>
                          <input
                            type="radio"
                            name={`q-${i}`}
                            checked={answers[i] === j}
                            onChange={() => setAnswers((prev: number[]) => {
                              const next = [...prev];
                              next[i] = j;
                              return next;
                            })}
                          />
                          {" "}{opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              {user?.role === "STUDENT" && (
                <button type="submit" className="btn btn-primary">Submit quiz</button>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
