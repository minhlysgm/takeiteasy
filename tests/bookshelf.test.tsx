import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { BookShelf } from "@/components/shelf/BookShelf";
import { books } from "@/lib/content";
import { saveProgress } from "@/lib/progress";

describe("BookShelf", () => {
  beforeEach(() => localStorage.clear());

  it("hiện tựa sách, tác giả và link chương", () => {
    render(<BookShelf books={books} />);
    expect(screen.getByText(/The Subtle Art/)).toBeTruthy();
    expect(screen.getByText(/Mark Manson/)).toBeTruthy();
    const link = screen.getByRole("link", { name: /Don't Try/ });
    expect(link.getAttribute("href")).toBe("/read/the-subtle-art/ch01/1");
  });

  it("hiện 'đọc tiếp' đúng vị trí khi có tiến độ", async () => {
    saveProgress({ bookId: "the-subtle-art", chapterId: "ch01", passageIndex: 1 });
    render(<BookShelf books={books} />);
    const resume = await screen.findByRole("link", { name: /đọc tiếp/ });
    expect(resume.getAttribute("href")).toBe("/read/the-subtle-art/ch01/1");
  });
});
