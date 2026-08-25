"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Book } from "@/content/types";
import { getProgress, type Progress } from "@/lib/progress";
import { useTheme } from "@/lib/useTheme";

export function BookShelf({ books }: { books: Book[] }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const { theme, toggle } = useTheme();
  useEffect(() => setProgress(getProgress()), []);

  return (
    <div className="mx-auto max-w-3xl px-8 py-16">
      <div className="mb-10 text-sm text-muted">// kệ sách</div>
      {books.map((book) => {
        const resume = progress && progress.bookId === book.id ? progress : null;
        return (
          <section key={book.id} className="mb-12">
            <h1 className="text-xl text-bright">{book.title}</h1>
            <div className="mt-1 text-sm text-muted">{book.author}</div>
            {resume && (
              <Link
                href={`/read/${book.id}/${resume.chapterId}/${resume.passageIndex}`}
                className="mt-4 block text-sm text-accent"
              >
                đang đọc dở {resume.chapterId} · đoạn {resume.passageIndex} — đọc tiếp →
              </Link>
            )}
            <ul className="mt-6 space-y-2">
              {book.chapters.map((ch) => (
                <li key={ch.id}>
                  <Link href={`/read/${book.id}/${ch.id}/1`} className="text-text hover:text-bright">
                    <span className="text-muted">{ch.id}</span> · {ch.title}{" "}
                    <span className="text-muted">· {ch.passageCount} đoạn</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <button type="button" onClick={toggle} className="mt-16 text-xs text-muted hover:text-bright">
        theme: {theme} — bấm để đổi
      </button>
    </div>
  );
}
