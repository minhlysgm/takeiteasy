"use client";
import type { LookupResult } from "@/lib/lookupTypes";
import { lookupUrl } from "@/lib/selection";
import { speak } from "@/lib/speech";

export type LookupState = { phase: "loading" } | { phase: "ok"; result: LookupResult } | { phase: "error" };

interface Props {
  state: LookupState;
  /** Chữ đang chọn — cho link Cambridge. */
  text: string;
  speechOk: boolean;
  /** Có thì hiện ✕ "đóng thẻ" (thanh đáy mobile; popup desktop đóng bằng Esc / bấm ra ngoài). */
  onClose?: () => void;
}

/** Ô cảm ứng ≥ 44px ở chế độ thanh đáy (khớp DOCK_QUERY: màn hẹp hoặc cảm ứng); desktop gọn như mockup. */
const TOUCH_44 = "max-lg:h-11 max-lg:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11";
const LINK_44 = "max-lg:min-h-11 [@media(pointer:coarse)]:min-h-11";

/** Khung xương lúc chờ: bốn vạch dài ngắn như thẻ thật. */
const SKELETON_WIDTHS = ["45%", "80%", "92%", "70%"];

function CambridgeLink({ text, children }: { text: string; children: string }) {
  return (
    <a
      href={lookupUrl(text)}
      target="_blank"
      rel="noopener"
      className={`ml-auto inline-flex items-center text-muted underline-offset-2 hover:text-bright hover:underline ${LINK_44}`}
    >
      {children}
    </a>
  );
}

/** Thẻ kết quả tra nghĩa, vẽ ngay dưới hàng nút "nghe · tra nghĩa" của popup / thanh đáy. */
export function LookupCard({ state, text, speechOk, onClose }: Props) {
  return (
    <div data-testid="lookup-card" className="grid grid-cols-[minmax(0,1fr)_auto] border-t border-line">
      <div className="min-w-0" aria-live="polite">
        {state.phase === "loading" && (
          <div data-testid="lookup-skeleton" aria-busy="true" className="grid gap-2 px-4 py-3.5">
            <span className="sr-only">đang tra…</span>
            {SKELETON_WIDTHS.map((w) => (
              <i
                key={w}
                className="block h-3 animate-pulse rounded-sm bg-line motion-reduce:animate-none"
                style={{ width: w }}
              />
            ))}
          </div>
        )}
        {state.phase === "ok" && (
          <div className="grid gap-2.5 px-4 pb-3 pt-3.5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <b className="text-[18px] font-medium text-bright">{state.result.headword}</b>
              <span className="text-text">{state.result.ipa}</span>
              <span className="border border-line px-1.5 text-[11px] text-muted">{state.result.pos}</span>
              <button
                type="button"
                aria-label={`nghe: ${state.result.headword}`}
                onClick={() => speak(state.result.headword)}
                disabled={!speechOk}
                title={speechOk ? undefined : "trình duyệt không hỗ trợ đọc"}
                className={`ml-auto flex h-[30px] w-[30px] shrink-0 items-center justify-center border border-line transition-colors hover:bg-bg disabled:opacity-40 disabled:hover:bg-transparent motion-reduce:transition-none ${TOUCH_44}`}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4 2.5v11l9-5.5z" fill="var(--accent)" />
                </svg>
              </button>
            </div>
            <div>
              <div className="mb-0.5 text-[11px] text-muted">nghĩa trong câu này</div>
              <div className="text-[14px] text-bright">{state.result.meaning}</div>
            </div>
            <div className="grid gap-0.5 border-l-2 border-ink pl-2.5">
              <span className="text-bright">{state.result.example.en}</span>
              <span className="text-muted">{state.result.example.vi}</span>
            </div>
          </div>
        )}
        {state.phase === "error" && (
          <div className="grid gap-1.5 px-4 py-3.5">
            <b className="font-medium text-bright">Tạm chưa tra được, thử lại sau nhé.</b>
            <span className="text-muted">Trong lúc chờ, bạn có thể tra từ điển ngoài.</span>
          </div>
        )}
      </div>
      {onClose && (
        // Dính trên cùng khi phần thẻ cuộn (thanh đáy cao tối đa 50dvh)
        <button
          type="button"
          aria-label="đóng thẻ"
          onClick={onClose}
          className="sticky top-0 flex h-11 w-11 items-center justify-center self-start text-[18px] text-bright"
        >
          <span aria-hidden="true">✕</span>
        </button>
      )}
      {state.phase !== "loading" && (
        <div className="col-span-full flex flex-wrap items-center justify-between gap-x-3 border-t border-line px-4 py-2 text-[12px] text-muted max-lg:py-0 [@media(pointer:coarse)]:py-0">
          {state.phase === "ok" ? (
            <>
              {/* Màn hẹp: dòng này và link xuống hai hàng → chừa chút khoảng trên, link nằm phải */}
              <span className="inline-flex items-center max-lg:min-h-8 [@media(pointer:coarse)]:min-h-8">
                AI soạn · có thể chưa chuẩn
              </span>
              <CambridgeLink text={text}>xem thêm ở Cambridge ↗</CambridgeLink>
            </>
          ) : (
            <CambridgeLink text={text}>mở Cambridge ↗</CambridgeLink>
          )}
        </div>
      )}
    </div>
  );
}
