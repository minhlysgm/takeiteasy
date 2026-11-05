"use client";
import { useParams } from "next/navigation";
import type { Book, Passage } from "@/content/types";
import { PassageView } from "./PassageView";

interface Props {
  book: Book;
  chapterId: string;
  passages: Passage[];
}

/** Đọc số đoạn từ URL (đổi mà không dựng lại cây) rồi đưa đoạn tương ứng cho PassageView. */
export function ChapterReader({ book, chapterId, passages }: Props) {
  const { passageIndex } = useParams<{ passageIndex: string }>();
  const idx = Number(passageIndex);
  // Số đoạn sai: page đang chuyển hướng, chưa vẽ gì.
  if (!Number.isInteger(idx) || idx < 1 || idx > passages.length) return null;
  return (
    <PassageView
      book={book}
      chapterId={chapterId}
      passage={passages[idx - 1]}
      passageIndex={idx}
      passageCount={passages.length}
    />
  );
}
