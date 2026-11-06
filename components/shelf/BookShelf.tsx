"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Book } from "@/content/types";
import { chapterLabel } from "@/lib/content";
import { getProgress, type Progress } from "@/lib/progress";
import { useTheme } from "@/lib/useTheme";

export function BookShelf({ books }: { books: Book[] }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const { theme, toggle } = useTheme();
  useEffect(() => setProgress(getProgress()), []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
      <div className="reveal reveal-1 mb-8 text-sm text-muted">{"// kệ sách"}</div>

      {books.map((book) => {
        const resume = progress && progress.bookId === book.id ? progress : null;
        return (
          <section key={book.id} className="reveal reveal-2 mb-10 border border-line">
            <div className="flex h-9 items-center gap-2 border-b border-line bg-surface px-4">
              <span className="block h-2.5 w-2.5 rounded-full bg-danger opacity-70" aria-hidden="true" />
              <span className="block h-2.5 w-2.5 rounded-full bg-ink opacity-70" aria-hidden="true" />
              <span className="block h-2.5 w-2.5 rounded-full bg-accent opacity-70" aria-hidden="true" />
              <span className="ml-2 text-xs text-muted">{book.id}</span>
            </div>

            <div className="p-5 sm:p-8">
              <h1 className="text-[26px] leading-snug text-bright">{book.title}</h1>
              <div className="mt-1 text-sm text-muted">{book.author}</div>

              {resume && (
                <Link
                  href={`/read/${book.id}/${resume.chapterId}/${resume.passageIndex}`}
                  className="mt-6 inline-block border border-accent px-4 py-2 text-sm text-accent transition-colors hover:bg-accent hover:text-bg"
                >
                  đang đọc dở {chapterLabel(resume.chapterId)} · thẻ {resume.passageIndex} — đọc tiếp →
                </Link>
              )}

              <ul className="mt-8 space-y-1">
                {book.chapters.map((ch) => {
                  const pct =
                    resume && resume.chapterId === ch.id
                      ? Math.round((resume.passageIndex / ch.passageCount) * 100)
                      : 0;
                  return (
                    <li key={ch.id}>
                      <Link
                        href={`/read/${book.id}/${ch.id}/1`}
                        className="group flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 transition-[transform,background-color] hover:translate-x-1 hover:bg-surface motion-reduce:transition-none"
                      >
                        <span className="whitespace-nowrap text-muted">{chapterLabel(ch.id)}</span>
                        <span className="text-text transition-colors group-hover:text-bright">{ch.title}</span>
                        <span className="whitespace-nowrap text-xs text-muted">· {ch.passageCount} thẻ</span>
                        <span className="ml-auto flex items-center gap-3">
                          <span className="h-1 w-20 rounded bg-line sm:w-28">
                            <span
                              className="block h-full rounded bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          <span className="w-9 text-right text-xs text-muted">{pct}%</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        );
      })}

      <div className="reveal reveal-3 flex items-center justify-between text-sm text-muted">
        <span>
          {"> chọn chương để bắt đầu"}
          <span className="animate-blink ml-1 inline-block h-[14px] w-[8px] translate-y-[2px] bg-accent" aria-hidden="true" />
        </span>
        <button type="button" onClick={toggle} className="text-xs text-muted transition-colors hover:text-bright">
          theme: {theme} — bấm để đổi
        </button>
      </div>
    </div>
  );
}
