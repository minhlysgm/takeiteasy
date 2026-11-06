/**
 * Mốc mobile/desktop dùng trong JS — khớp với `lg` của Tailwind (≥ 1024px là desktop).
 * 1023.98 thay vì 1023 để không hở khoảng 1023–1024px khi trình duyệt có tỉ lệ zoom lẻ.
 */
export const MOBILE_QUERY = "(max-width: 1023.98px)";

/**
 * Chế độ "dock" (thanh công cụ dính đáy màn hình): màn hẹp HOẶC thiết bị cảm ứng chính (pointer: coarse).
 * Ngoài ra là desktop → popup nổi cạnh vùng chọn.
 */
export const DOCK_QUERY = "(max-width: 1023.98px), (pointer: coarse)";

/*
 * Màn đọc còn một mốc nữa chỉ dùng trong CSS: `2col:` (tailwind.config.ts, ≥ 1440px) — từ đó mới chia
 * hai cột mô tả | bản dịch; 1024–1439px vẫn là desktop (ghi chú lề, popup nổi) nhưng xếp một cột giữa.
 */
