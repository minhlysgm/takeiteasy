import { redirect } from "next/navigation";
import { ChapterReader } from "@/components/reader/ChapterReader";
import { getBook, getPassages } from "@/lib/content";

interface Props {
  children: React.ReactNode;
  params: Promise<{ bookId: string; chapterId: string }>;
}

/**
 * Màn đọc nằm ở layout của chương (không ở page): Next dựng lại page mỗi khi số đoạn trên URL đổi,
 * còn layout thì giữ nguyên → header/footer sống xuyên các đoạn, vạch tiến độ trượt được.
 * Page `[passageIndex]` chỉ còn kiểm số đoạn và chuyển hướng.
 */
export default async function ChapterLayout({ children, params }: Props) {
  const { bookId, chapterId } = await params;
  const book = getBook(bookId);
  if (!book) redirect("/");
  const chapter = book.chapters.find((c) => c.id === chapterId);
  if (!chapter) redirect(`/read/${book.id}/${book.chapters[0].id}/1`);
  const passages = getPassages(book.id, chapter.id) ?? [];
  if (passages.length === 0) redirect("/");
  return (
    <>
      <ChapterReader book={book} chapterId={chapter.id} passages={passages} />
      {children}
    </>
  );
}
