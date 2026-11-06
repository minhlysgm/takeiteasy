/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tắt nút "N" của Next (chỉ khi dev): cả 4 góc màn đọc mobile đều có nút của app (loa chọn giọng | theme ở header,
  // "giải thích" | "tiếp →" ở footer) nên để góc nào cũng đè. Lỗi build/runtime vẫn hiện overlay như thường.
  devIndicators: false,
};
export default nextConfig;
