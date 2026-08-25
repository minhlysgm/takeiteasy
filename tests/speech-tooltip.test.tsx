import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import { SpeechTooltip } from "@/components/reader/SpeechTooltip";

function Host() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} data-testid="col">
      <p>unflinchingly honest with himself</p>
      <SpeechTooltip containerRef={ref} />
    </div>
  );
}

function selectTextIn(el: Element, text: string) {
  const sel = window.getSelection()!;
  const node = el.querySelector("p")!.firstChild!;
  const start = node.textContent!.indexOf(text);
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, start + text.length);
  sel.removeAllRanges();
  sel.addRange(range);

  // Mock getBoundingClientRect for the range
  if (!range.getBoundingClientRect) {
    range.getBoundingClientRect = () => ({
      left: 10,
      top: 10,
      width: 100,
      height: 20,
      right: 110,
      bottom: 30,
      x: 10,
      y: 10,
      toJSON: () => ({}),
    });
  }
}

afterEach(() => window.getSelection()?.removeAllRanges());

describe("SpeechTooltip", () => {
  it("không hiện gì khi chưa có selection", () => {
    render(<Host />);
    fireEvent.mouseUp(document);
    expect(screen.queryByRole("button", { name: /nghe/ })).toBeNull();
  });
  it("hiện tooltip khi tô đen trong container", () => {
    render(<Host />);
    selectTextIn(screen.getByTestId("col"), "unflinchingly honest");
    fireEvent.mouseUp(document);
    expect(screen.getByRole("button", { name: /nghe/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /tra nghĩa/ })).toBeTruthy();
  });
  it("tra nghĩa mở Cambridge với query đã encode", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<Host />);
    selectTextIn(screen.getByTestId("col"), "unflinchingly honest");
    fireEvent.mouseUp(document);
    fireEvent.click(screen.getByRole("button", { name: /tra nghĩa/ }));
    expect(open).toHaveBeenCalledWith(
      "https://dictionary.cambridge.org/search/english/?q=unflinchingly%20honest",
      "_blank",
      "noopener",
    );
    open.mockRestore();
  });
});
