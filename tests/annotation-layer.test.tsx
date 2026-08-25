import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import { AnnotationLayer } from "@/components/reader/AnnotationLayer";
import { books, getPassages } from "@/lib/content";

const annotate = vi.fn(() => ({ remove: vi.fn() }));
const show = vi.fn();
vi.mock("rough-notation", () => ({
  annotate: (...args: unknown[]) => annotate(...args),
  annotationGroup: () => ({ show }),
}));

const passage = getPassages(books[0].id, "ch01")![0];

function Host() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="relative">
      {passage.chunks.map((c) => (
        <span key={c.id} data-chunk-id={c.id}>{c.match}</span>
      ))}
      <AnnotationLayer containerRef={ref} chunks={passage.chunks} onChunkClick={() => {}} />
    </div>
  );
}

describe("AnnotationLayer", () => {
  it("gọi rough-notation cho từng chunk và show group", () => {
    render(<Host />);
    expect(annotate).toHaveBeenCalledTimes(passage.chunks.length);
    expect(show).toHaveBeenCalledOnce();
  });
  it("render ghi chú lề bấm được cho từng chunk", () => {
    render(<Host />);
    for (const c of passage.chunks) {
      // label nhiều dòng: chỉ cần dòng đầu xuất hiện
      expect(screen.getAllByText(new RegExp(c.label.split("\n")[0].slice(0, 12).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).length).toBeGreaterThan(0);
    }
  });
});
