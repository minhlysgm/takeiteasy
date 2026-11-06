"use client";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import type { Book, Passage } from "@/content/types";
import { chapterLabel, firstSentence, type PassageOutline } from "@/lib/content";
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
  // Tính trước return sớm bên dưới (luật hook). Chỉ câu mở đầu đi xuống danh sách đoạn.
  const outline = useMemo<PassageOutline[]>(
    () => passages.map((p, i) => ({ index: i + 1, firstSentence: firstSentence(p.caption) })),
    [passages],
  );
  const label = chapterLabel(chapterId);
  const chapter = book.chapters.find((c) => c.id === chapterId);
  // "Chương 1 · Don't Try"
  const chapterTitle = `${label.charAt(0).toUpperCase()}${label.slice(1)}${chapter ? ` · ${chapter.title}` : ""}`;
  // Số đoạn sai (page đang chuyển hướng tới số đúng): chưa vẽ gì.
  if (String(idx) !== passageIndex) return null;
  return (
    <PassageView
      book={book}
      chapterId={chapterId}
      passage={passages[idx - 1]}
      passageIndex={idx}
      passageCount={passages.length}
      outline={outline}
      chapterTitle={chapterTitle}
    />
  );
}
