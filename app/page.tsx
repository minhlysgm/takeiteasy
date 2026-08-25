import { BookShelf } from "@/components/shelf/BookShelf";
import { books } from "@/lib/content";

export default function HomePage() {
  return <BookShelf books={books} />;
}
