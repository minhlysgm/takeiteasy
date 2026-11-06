// v2: thẻ ch01-p01..03 đã thay hẳn nội dung (vẽ trước). Khoá cũ không version thì bỏ qua để ai cũng được xem vẽ lại.
export const SKETCH_SEEN_PREFIX = "tie:sketch-seen:v2:";

export function sketchSeenKey(passageId: string): string {
  return SKETCH_SEEN_PREFIX + passageId;
}

/** Passage này đã vẽ hình rồi chưa. Storage bị chặn → coi như chưa xem để hình vẫn chạy. */
export function isSketchSeen(passageId: string): boolean {
  try {
    return localStorage.getItem(sketchSeenKey(passageId)) === "1";
  } catch {
    return false;
  }
}

export function markSketchSeen(passageId: string): void {
  try {
    localStorage.setItem(sketchSeenKey(passageId), "1");
  } catch {
    /* ignore */
  }
}

/**
 * Script nội tuyến đầu trang (chạy trước khi vẽ HTML server): ghi các thẻ đã xem vào `<html data-sketch-seen="id id">`.
 * Server không đọc được localStorage; nhờ thuộc tính này, CSS của `sketchGateCss` chọn đúng "chờ vẽ" hay "hiện đủ"
 * ngay khung hình đầu, trước khi React hydrate.
 */
export const SKETCH_SEEN_BOOT_SCRIPT = `try{var p=${JSON.stringify(SKETCH_SEEN_PREFIX)},s=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf(p)===0&&localStorage.getItem(k)==="1")s.push(k.slice(p.length))}document.documentElement.dataset.sketchSeen=s.join(" ")}catch(e){}`;

/** CSS cho lúc chưa hydrate: thẻ này nằm trong `data-sketch-seen` → ẩn chỗ chờ, hiện đủ mô tả + bản dịch + hình. */
export function sketchGateCss(passageId: string): string {
  if (!/^[A-Za-z][\w-]*$/.test(passageId)) return "";
  const sel = `html[data-sketch-seen~="${passageId}"] [data-sketch-gate]`;
  return `${sel} .gate-wait{display:none}${sel} .gate-full{display:block}${sel} .sketch-art-idle{opacity:1}`;
}
