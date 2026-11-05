import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OriginalText } from "@/components/reader/OriginalText";
import { books, getPassages } from "@/lib/content";

const passage = getPassages(books[0].id, "ch01")![0];

describe("OriginalText", () => {
  it("tắt giải thích thì không có button số", () => {
    render(<OriginalText passage={passage} explainOn={false} onChunkClick={() => {}} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
  it("bật giải thích: mỗi cụm một button 'xem cụm n'", () => {
    render(<OriginalText passage={passage} explainOn onChunkClick={() => {}} />);
    expect(passage.chunks).toHaveLength(5);
    for (let n = 1; n <= 5; n++) expect(screen.getByRole("button", { name: `xem cụm ${n}` })).toBeTruthy();
  });
  it("bấm 'xem cụm 3' gọi onChunkClick với id chunk thứ 3", () => {
    const onChunkClick = vi.fn();
    render(<OriginalText passage={passage} explainOn onChunkClick={onChunkClick} />);
    fireEvent.click(screen.getByRole("button", { name: "xem cụm 3" }));
    expect(onChunkClick).toHaveBeenCalledWith(passage.chunks[2].id);
  });
});
