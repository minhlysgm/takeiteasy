"use client";
import { useParams } from "next/navigation";
import type { Book, Passage } from "@/content/types";
import { passageIndexOf } from "@/lib/passageIndex";
import { PassageView } from "./PassageView";

interface Props {
  book: Book;
  chapterId: string;
  passages: Passage[];
}

/** Đọc số đoạn từ URL (đổi mà không dựng lại cây) rồi đưa đoạn tương ứng cho PassageView. */
export function ChapterReader({ book, chapterId, passages }: Props) {
  const { passageIndex } = useParams<{ passageIndex: string }>();
  const idx = passageIndexOf(passageIndex, passages.length);
  // Số đoạn sai (page đang chuyển hướng tới số đúng): chưa vẽ gì.
  if (String(idx) !== passageIndex) return null;
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
