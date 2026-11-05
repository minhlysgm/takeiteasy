import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileNoteList } from "@/components/reader/MobileNoteList";
import { books, getPassages } from "@/lib/content";

const chunks = getPassages(books[0].id, "ch01")![0].chunks.slice(0, 3);

describe("MobileNoteList", () => {
  it("mỗi cụm một button, có số thứ tự và nhãn", () => {
    render(<MobileNoteList chunks={chunks} onChunkClick={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    expect(buttons[1].textContent).toContain("2");
    expect(buttons[1].textContent).toContain(chunks[1].label.split("\n")[0]);
  });
  it("bấm button 2 thì gọi onChunkClick với id chunk 2", () => {
    const onChunkClick = vi.fn();
    render(<MobileNoteList chunks={chunks} onChunkClick={onChunkClick} />);
    fireEvent.click(screen.getAllByRole("button")[1]);
    expect(onChunkClick).toHaveBeenCalledWith(chunks[1].id);
  });
});
