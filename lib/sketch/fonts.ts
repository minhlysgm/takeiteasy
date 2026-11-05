const FONT_WAIT_MS = 1500;

/** Chờ font tay tải xong để đo chữ cho đúng, tối đa FONT_WAIT_MS. Trả hàm huỷ timeout. */
export function waitFonts(): { ready: Promise<unknown>; cancel: () => void } {
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  if (!fonts?.ready) return { ready: Promise.resolve(), cancel: () => {} };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise((r) => (timer = setTimeout(r, FONT_WAIT_MS)));
  const ready = Promise.race([fonts.ready, timeout]).finally(() => clearTimeout(timer));
  return { ready, cancel: () => clearTimeout(timer) };
}
