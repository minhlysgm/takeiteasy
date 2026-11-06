import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LookupCard } from "@/components/reader/LookupCard";
import type { LookupResult } from "@/lib/lookupTypes";
import { lookupUrl } from "@/lib/selection";
import { play } from "@/lib/audio/player";

vi.mock("@/lib/audio/player", () => ({ play: vi.fn() }));

const LOUT: LookupResult = {
  headword: "lout",
  ipa: "/laʊt/",
  pos: "danh từ",
  meaning: "kẻ thô lỗ, cục cằn, cư xử khó coi",
  example: { en: "Don't be a lout. Say thank you to the waiter.", vi: "Đừng có thô lỗ thế, cảm ơn người phục vụ đi." },
};

afterEach(() => vi.clearAllMocks());

describe("LookupCard", () => {
  it("loading → vùng aria-live có aria-busy, khung xương có vạch chờ cho dòng chân thẻ", () => {
    render(<LookupCard state={{ phase: "loading" }} text="lout" speechOk />);
    const sk = screen.getByTestId("lookup-skeleton");
    expect(sk.innerHTML).toContain("motion-reduce:animate-none");
    const card = screen.getByTestId("lookup-card");
    expect(card.contains(sk)).toBe(true);
    const live = card.querySelector("[aria-live]")!;
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.getAttribute("aria-busy")).toBe("true");
    expect(live.contains(sk)).toBe(true);
    // Chân thẻ đã có chỗ sẵn lúc chờ → khung xương sang kết quả không giật cao thêm một dòng
    expect(screen.getByTestId("lookup-footer").contains(screen.getByTestId("lookup-footer-skeleton"))).toBe(true);
  });

  it("ok → aria-busy false; hiện lout, /laʊt/, danh từ, nghĩa, ví dụ; chân thẻ nhãn ngắn 'AI soạn' / 'Cambridge ↗'", () => {
    render(<LookupCard state={{ phase: "ok", result: LOUT }} text="lout" speechOk />);
    const card = screen.getByTestId("lookup-card");
    expect(card.querySelector("[aria-live]")!.getAttribute("aria-busy")).toBe("false");
    for (const s of ["lout", "/laʊt/", "danh từ", "nghĩa trong câu này", LOUT.meaning, LOUT.example.en, LOUT.example.vi]) {
      expect(card.textContent).toContain(s);
    }
    const footer = screen.getByTestId("lookup-footer");
    // Nhãn hiện ra ngắn (một dòng ở mọi bề ngang); câu đủ cho trình đọc màn hình
    expect(footer.textContent).toContain("AI soạn");
    expect(footer.querySelector(".sr-only")?.textContent).toContain("có thể chưa chuẩn");
    expect(footer.className).toContain("whitespace-nowrap");
    expect(footer.className).not.toContain("flex-wrap");
    const link = screen.getByRole("link", { name: /Cambridge ↗/ });
    expect(link.textContent).toBe("Cambridge ↗");
    expect(link.getAttribute("href")).toBe(lookupUrl("lout"));
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener");
    expect(screen.queryByTestId("lookup-skeleton")).toBeNull();
    expect(screen.queryByTestId("lookup-footer-skeleton")).toBeNull();
  });

  it("cỡ chữ gốc 13.5px ở thẻ (không ăn 16px của body trên mobile)", () => {
    render(<LookupCard state={{ phase: "error" }} text="lout" speechOk />);
    expect(screen.getByTestId("lookup-card").className).toContain("text-[13.5px]");
  });

  it("thẻ hiện / đổi trạng thái thì mờ dần vào (tắt khi reduced-motion)", () => {
    render(<LookupCard state={{ phase: "ok", result: LOUT }} text="lout" speechOk />);
    const body = screen.getByTestId("lookup-body");
    const content = body.firstElementChild!;
    expect(content.className).toContain("animate-fade-in");
    expect(content.className).toContain("motion-reduce:animate-none");
  });

  it("bấm ▶ → play qua bộ phát chung, không kèm src (giọng máy); ▶ có nền bg để viền không chìm vào surface", () => {
    render(<LookupCard state={{ phase: "ok", result: LOUT }} text="louts" speechOk />);
    const btn = screen.getByRole("button", { name: "nghe: lout" });
    expect(btn.className.split(" ")).toContain("bg-bg");
    fireEvent.click(btn);
    expect(play).toHaveBeenCalledWith("tts:lout", { text: "lout" });
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

  it("có id (cho aria-controls của nút 'tra nghĩa'); không còn ✕ trong thẻ (✕ nằm ở hàng nút)", () => {
    render(<LookupCard id="lk-1" state={{ phase: "loading" }} text="lout" speechOk />);
    expect(screen.getByTestId("lookup-card").id).toBe("lk-1");
    expect(screen.queryByRole("button", { name: "đóng thẻ" })).toBeNull();
  });

  it("phần thân cuộn được; còn chữ phía dưới thì hiện vệt mờ, cuộn tới cuối thì vệt mờ ẩn", () => {
    render(<LookupCard state={{ phase: "ok", result: LOUT }} text="lout" speechOk />);
    const body = screen.getByTestId("lookup-body");
    expect(body.className).toContain("overflow-y-auto");
    expect(screen.queryByTestId("lookup-fade")).toBeNull(); // jsdom: không tràn
    const set = (scrollTop: number) => {
      Object.defineProperty(body, "scrollHeight", { configurable: true, value: 300 });
      Object.defineProperty(body, "clientHeight", { configurable: true, value: 100 });
      Object.defineProperty(body, "scrollTop", { configurable: true, value: scrollTop });
      fireEvent.scroll(body);
    };
    set(0);
    const fade = screen.getByTestId("lookup-fade");
    expect(fade.getAttribute("aria-hidden")).toBe("true");
    expect(fade.className).toContain("var(--surface)");
    set(200);
    expect(screen.queryByTestId("lookup-fade")).toBeNull();
  });
});
