import { redirect } from "next/navigation";
import { PassageView } from "@/components/reader/PassageView";
import { getBook, getPassages } from "@/lib/content";

interface Props {
  params: Promise<{ bookId: string; chapterId: string; passageIndex: string }>;
}

export default async function ReadPage({ params }: Props) {
  const { bookId, chapterId, passageIndex } = await params;
  const book = getBook(bookId);
  if (!book) redirect("/");
  const chapter = book.chapters.find((c) => c.id === chapterId);
  if (!chapter) redirect(`/read/${book.id}/${book.chapters[0].id}/1`);
  const passages = getPassages(book.id, chapter.id) ?? [];
  if (passages.length === 0) redirect("/");
  const idx = Number(passageIndex);
  if (!Number.isInteger(idx) || idx < 1) {
    redirect(`/read/${book.id}/${chapter.id}/1`);
  }
  if (idx > passages.length) {
    redirect(`/read/${book.id}/${chapter.id}/${passages.length}`);
  }
  return (
    <PassageView
      key={`${book.id}-${chapter.id}-${idx}`}
      book={book}
      chapterId={chapter.id}
      passage={passages[idx - 1]}
      passageIndex={idx}
      passageCount={passages.length}
    />
  );
}
