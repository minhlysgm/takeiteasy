import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LookupCard } from "@/components/reader/LookupCard";
import type { LookupResult } from "@/lib/lookupTypes";
import { lookupUrl } from "@/lib/selection";
import { speak } from "@/lib/speech";

vi.mock("@/lib/speech", () => ({ speak: vi.fn() }));

const LOUT: LookupResult = {
  headword: "lout",
  ipa: "/laʊt/",
  pos: "danh từ",
  meaning: "kẻ thô lỗ, cục cằn, cư xử khó coi",
  example: { en: "Don't be a lout. Say thank you to the waiter.", vi: "Đừng có thô lỗ thế, cảm ơn người phục vụ đi." },
};

afterEach(() => vi.clearAllMocks());

describe("LookupCard", () => {
  it("loading → có lookup-skeleton aria-busy", () => {
    render(<LookupCard state={{ phase: "loading" }} text="lout" speechOk />);
    const sk = screen.getByTestId("lookup-skeleton");
    expect(sk.getAttribute("aria-busy")).toBe("true");
    expect(sk.innerHTML).toContain("motion-reduce:animate-none");
    expect(screen.getByTestId("lookup-card").contains(sk)).toBe(true);
  });

  it("ok → hiện lout, /laʊt/, danh từ, nghĩa, ví dụ, link Cambridge đúng lookupUrl('lout')", () => {
    render(<LookupCard state={{ phase: "ok", result: LOUT }} text="lout" speechOk />);
    const card = screen.getByTestId("lookup-card");
    for (const s of ["lout", "/laʊt/", "danh từ", "nghĩa trong câu này", LOUT.meaning, LOUT.example.en, LOUT.example.vi, "AI soạn · có thể chưa chuẩn"]) {
      expect(card.textContent).toContain(s);
    }
    const link = screen.getByRole("link", { name: "xem thêm ở Cambridge ↗" });
    expect(link.getAttribute("href")).toBe(lookupUrl("lout"));
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener");
    expect(screen.queryByTestId("lookup-skeleton")).toBeNull();
  });

  it("bấm ▶ → speak('lout')", () => {
    render(<LookupCard state={{ phase: "ok", result: LOUT }} text="louts" speechOk />);
    fireEvent.click(screen.getByRole("button", { name: "nghe: lout" }));
    expect(speak).toHaveBeenCalledWith("lout");
  });

  it("speechOk=false → nút ▶ disabled", () => {
    render(<LookupCard state={{ phase: "ok", result: LOUT }} text="lout" speechOk={false} />);
    expect((screen.getByRole("button", { name: "nghe: lout" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("error → câu 'Tạm chưa tra được, thử lại sau nhé.' + link mở Cambridge", () => {
    render(<LookupCard state={{ phase: "error" }} text="a lout" speechOk />);
    expect(screen.getByTestId("lookup-card").textContent).toContain("Tạm chưa tra được, thử lại sau nhé.");
    const link = screen.getByRole("link", { name: "mở Cambridge ↗" });
    expect(link.getAttribute("href")).toBe(lookupUrl("a lout"));
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener");
  });

  it("có onClose → nút 'đóng thẻ' gọi onClose", () => {
    const onClose = vi.fn();
    render(<LookupCard state={{ phase: "loading" }} text="lout" speechOk onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "đóng thẻ" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("không có onClose → không có nút 'đóng thẻ'", () => {
    render(<LookupCard state={{ phase: "ok", result: LOUT }} text="lout" speechOk />);
    expect(screen.queryByRole("button", { name: "đóng thẻ" })).toBeNull();
  });
});
