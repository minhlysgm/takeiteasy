import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChunkDrawer } from "@/components/reader/ChunkDrawer";
import { audioPath } from "@/lib/audio/audioPath";
import { stopPlayback, togglePlay, usePlaying } from "@/lib/audio/player";
import { MOBILE_QUERY } from "@/lib/breakpoints";
import { books, getPassages } from "@/lib/content";

vi.mock("@/lib/audio/player", () => ({
  togglePlay: vi.fn(),
  stopPlayback: vi.fn(),
  usePlaying: vi.fn(() => null),
}));

// neo vào đoạn theo id (không theo vị trí) để thêm đoạn mới không làm test trôi fixture
const chunks = getPassages(books[0].id, "ch01")!.find((p) => p.id === "ch01-p02")!.chunks;

describe("ChunkDrawer", () => {
  it("hiện headword, meaning, pattern và ví dụ của chunk đang chọn", () => {
    const harderIdx = chunks.findIndex((c) => c.id === "the-harder-the-louder");
    render(<ChunkDrawer chunks={chunks} index={harderIdx} onNavigate={() => {}} onClose={() => {}} />);
    expect(screen.getByText("the harder…, the louder…")).toBeTruthy();
    expect(screen.getByText(/^Mẫu "càng… càng…"/)).toBeTruthy();
    expect(screen.getByText(/The \+ so sánh hơn \+ S \+ V, the \+ so sánh hơn/)).toBeTruthy();
    expect(screen.getByText(/The earlier we leave, the better\./)).toBeTruthy();
  });
  it("hiện mistake box khi có", () => {
    const asleepIdx = chunks.findIndex((c) => c.id === "fall-asleep");
    render(<ChunkDrawer chunks={chunks} index={asleepIdx} onNavigate={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/I fell sleep/)).toBeTruthy();
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
  it("bấm nền mờ phía sau thì đóng, bấm trong drawer thì không", () => {
    const onClose = vi.fn();
    render(<ChunkDrawer chunks={chunks} index={0} onNavigate={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("drawer-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  describe("khoá cuộn trang phía sau", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      document.body.style.overflow = "";
    });
    const stubMobile = (matches: boolean) =>
      vi.stubGlobal(
        "matchMedia",
        vi.fn((q: string) => ({
          matches: matches && q === MOBILE_QUERY,
          media: q,
          addEventListener: () => {},
          removeEventListener: () => {},
        })),
      );

    it("dưới 1024px: mở thì khoá cuộn body, đóng thì trả lại", () => {
      stubMobile(true);
      const { unmount } = render(
        <ChunkDrawer chunks={chunks} index={0} onNavigate={() => {}} onClose={() => {}} />,
      );
      expect(document.body.style.overflow).toBe("hidden");
      unmount();
      expect(document.body.style.overflow).toBe("");
    });
    it("từ 1024px: không đụng tới cuộn body", () => {
      stubMobile(false);
      const { unmount } = render(
        <ChunkDrawer chunks={chunks} index={0} onNavigate={() => {}} onClose={() => {}} />,
      );
      expect(document.body.style.overflow).toBe("");
      unmount();
      expect(document.body.style.overflow).toBe("");
    });
  });

  it("▶ ví dụ phát file audio giọng đang chọn; đang phát thì nhãn thành 'dừng:'; đóng ngăn thì dừng câu ví dụ", () => {
    const en = chunks[0].examples[0].en;
    render(<ChunkDrawer chunks={chunks} index={0} onNavigate={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: `nghe: ${en}` }));
    expect(togglePlay).toHaveBeenCalledWith(`ex:${en}`, { text: en, src: audioPath("will", en) });
    cleanup();
    vi.mocked(usePlaying).mockReturnValue(`ex:${en}`);
    render(<ChunkDrawer chunks={chunks} index={0} onNavigate={() => {}} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: `dừng: ${en}` })).toBeTruthy();
    cleanup();
    vi.mocked(usePlaying).mockReturnValue(null);
    expect(stopPlayback).toHaveBeenCalledWith("ex:");
  });
});
