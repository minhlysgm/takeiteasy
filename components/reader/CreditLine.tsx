import type { Book } from "@/content/types";
import { chapterLabel } from "@/lib/content";

/** Dòng ghi công cuối cột dịch: sách chỉ là nguồn ý, hình và lời là của takeiteasy. */
export function CreditLine({ book, chapterId }: { book: Book; chapterId: string }) {
  return (
    <p data-testid="credit" className="mt-6 text-[12.5px] leading-relaxed text-muted">
      Ý tưởng từ {chapterLabel(chapterId)}, <i>{book.title}</i> — {book.author}. Hình và lời: takeiteasy.
    </p>
  );
}
