import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChunkDrawer } from "@/components/reader/ChunkDrawer";
import { books, getPassages } from "@/lib/content";

// neo vào đoạn theo id (không theo vị trí) để thêm đoạn mới không làm test trôi fixture
const chunks = getPassages(books[0].id, "ch01")!.find((p) => p.id === "ch01-p03")!.chunks;

describe("ChunkDrawer", () => {
  it("hiện headword, meaning, pattern và ví dụ của chunk đang chọn", () => {
    const stemIdx = chunks.findIndex((c) => c.id === "stem-from");
    render(<ChunkDrawer chunks={chunks} index={stemIdx} onNavigate={() => {}} onClose={() => {}} />);
    expect(screen.getByText("stem from something")).toBeTruthy();
    expect(screen.getByText("= bắt nguồn từ / xuất phát từ")).toBeTruthy();
    expect(screen.getByText(/stems not from A, but from B/)).toBeTruthy();
    expect(screen.getByText(/stems not from the frontend/)).toBeTruthy();
  });
  it("hiện mistake box khi có", () => {
    const despiteIdx = chunks.findIndex((c) => c.id === "despite");
    render(<ChunkDrawer chunks={chunks} index={despiteIdx} onNavigate={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/Despite of the rain/)).toBeTruthy();
  });
  it("nút đóng gọi onClose, nút chunk sau gọi onNavigate", () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    render(<ChunkDrawer chunks={chunks} index={0} onNavigate={onNavigate} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /đóng/ }));
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: /chunk sau/ }));
    expect(onNavigate).toHaveBeenCalledWith(1);
  });
  it("focus vào drawer khi mở", () => {
    render(<ChunkDrawer chunks={chunks} index={0} onNavigate={() => {}} onClose={() => {}} />);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });
});
