"use client";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { LookupResult } from "@/lib/lookupTypes";
import { lookupUrl } from "@/lib/selection";
import { play } from "@/lib/audio/player";

export type LookupState = { phase: "loading" } | { phase: "ok"; result: LookupResult } | { phase: "error" };

interface Props {
  state: LookupState;
  /** Chữ đang chọn — cho link Cambridge. */
  text: string;
  speechOk: boolean;
  /** Cho `aria-controls` của nút "tra nghĩa". */
  id?: string;
}

/** Ô cảm ứng ≥ 44px ở chế độ thanh đáy (khớp DOCK_QUERY: màn hẹp hoặc cảm ứng); desktop gọn như mockup. */
const TOUCH_44 = "max-lg:h-11 max-lg:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11";
const LINK_44 = "max-lg:min-h-11 [@media(pointer:coarse)]:min-h-11";
/** Hiện ra / đổi trạng thái: mờ dần vào. */
const FADE_IN = "animate-fade-in motion-reduce:animate-none";

/** Khung xương lúc chờ: bốn vạch dài ngắn như thẻ thật. */
const SKELETON_WIDTHS = ["45%", "80%", "92%", "70%"];
const BAR = "block h-3 animate-pulse rounded-sm bg-line motion-reduce:animate-none";

function CambridgeLink({ text, label, children }: { text: string; label?: string; children: string }) {
  return (
    <a
      href={lookupUrl(text)}
      target="_blank"
      rel="noopener"
      aria-label={label}
      className={`ml-auto inline-flex items-center text-muted underline-offset-2 hover:text-bright hover:underline ${LINK_44}`}
    >
      {children}
    </a>
  );
}

/**
 * Còn chữ bên dưới chưa cuộn tới không (để hiện vệt mờ báo "còn nữa"). Đo lại khi cuộn, khi đổi cỡ và khi
 * `deps` đổi (trạng thái thẻ).
 */
function useMoreBelow(deps: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setMore(el.scrollHeight - el.clientHeight - el.scrollTop > 1);
  }, []);
  useLayoutEffect(() => {
    check();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [check, deps]);
  return { ref, more, check };
}

/**
 * Thẻ kết quả tra nghĩa, nằm cạnh hàng nút "nghe · tra nghĩa" của popup / thanh đáy. Thân thẻ cuộn bên trong
 * khi khung chứa giới hạn chiều cao; dòng chân (AI soạn · Cambridge) luôn hiện.
 */
export function LookupCard({ state, text, speechOk, id }: Props) {
  const { ref: bodyRef, more, check } = useMoreBelow(state);

  return (
    <div id={id} data-testid="lookup-card" className="flex min-h-0 flex-col text-[13.5px]">
      <div className="relative flex min-h-0 flex-col">
        <div
          ref={bodyRef}
          data-testid="lookup-body"
          aria-live="polite"
          aria-busy={state.phase === "loading"}
          onScroll={check}
          className="min-h-0 overflow-y-auto overscroll-contain"
        >
          <div key={state.phase} className={FADE_IN}>
            {state.phase === "loading" && (
              <div data-testid="lookup-skeleton" className="grid gap-2 px-4 py-3.5">
                <span className="sr-only">đang tra…</span>
                {SKELETON_WIDTHS.map((w) => (
                  <i key={w} className={BAR} style={{ width: w }} />
                ))}
              </div>
            )}
            {state.phase === "ok" && (
              <div className="grid gap-2.5 px-4 pb-3 pt-3.5">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <b className="min-w-0 text-[18px] font-medium text-bright [overflow-wrap:anywhere]">{state.result.headword}</b>
                  <span className="text-text">{state.result.ipa}</span>
                  <span className="border border-line px-1.5 text-[11px] text-muted">{state.result.pos}</span>
                  <button
                    type="button"
                    aria-label={`nghe: ${state.result.headword}`}
                    onClick={() => play(`tts:${state.result.headword}`, { text: state.result.headword })}
                    disabled={!speechOk}
                    title={speechOk ? undefined : "trình duyệt không hỗ trợ đọc"}
                    className={`ml-auto flex h-[30px] w-[30px] shrink-0 items-center justify-center border border-line bg-bg transition-colors hover:border-muted disabled:opacity-40 disabled:hover:border-line motion-reduce:transition-none ${TOUCH_44}`}
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
        </div>
        {/* Còn chữ bên dưới (màn thấp): vệt mờ cùng màu nền báo "cuộn tiếp" */}
        {more && (
          <div
            data-testid="lookup-fade"
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-[linear-gradient(to_top,var(--surface),transparent)]"
          />
        )}
      </div>
      {/* Một dòng ở mọi bề ngang (nhãn ngắn như mockup mobile) */}
      <div
        data-testid="lookup-footer"
        className="flex shrink-0 items-center whitespace-nowrap border-t border-line px-4 py-2 text-[12px] text-muted max-lg:py-0 [@media(pointer:coarse)]:py-0"
      >
        <div key={state.phase} className={`flex grow items-center justify-between gap-x-3 ${FADE_IN}`}>
          {state.phase === "loading" && (
            <span data-testid="lookup-footer-skeleton" aria-hidden="true" className={`ml-auto inline-flex h-[18px] items-center ${LINK_44}`}>
              <i className={`${BAR} w-24`} />
            </span>
          )}
          {state.phase === "ok" && (
            <>
              <span title="AI soạn · có thể chưa chuẩn">
                AI soạn<span className="sr-only"> · có thể chưa chuẩn</span>
              </span>
              <CambridgeLink text={text} label="xem thêm ở Cambridge ↗">
                Cambridge ↗
              </CambridgeLink>
            </>
          )}
          {state.phase === "error" && <CambridgeLink text={text}>mở Cambridge ↗</CambridgeLink>}
        </div>
      </div>
    </div>
  );
}
