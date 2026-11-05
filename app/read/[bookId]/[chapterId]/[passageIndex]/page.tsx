import { redirect } from "next/navigation";
import { getBook, getPassages } from "@/lib/content";

interface Props {
  params: Promise<{ bookId: string; chapterId: string; passageIndex: string }>;
}

/**
 * Chỉ kiểm số đoạn: sai thì chuyển hướng, đúng thì không vẽ gì — màn đọc nằm ở layout của chương
 * (`../layout.tsx`) để sống xuyên các đoạn. Sách/chương sai đã được layout chuyển hướng.
 */
export default async function ReadPage({ params }: Props) {
  const { bookId, chapterId, passageIndex } = await params;
  const count = getBook(bookId) ? (getPassages(bookId, chapterId)?.length ?? 0) : 0;
  if (count === 0) return null;
  const idx = Number(passageIndex);
  if (!Number.isInteger(idx) || idx < 1) redirect(`/read/${bookId}/${chapterId}/1`);
  if (idx > count) redirect(`/read/${bookId}/${chapterId}/${count}`);
  return null;
}
