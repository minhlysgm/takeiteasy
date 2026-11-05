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
