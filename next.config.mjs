/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tắt nút "N" của Next (chỉ khi dev): cả 4 góc màn đọc mobile đều có nút của app (loa chọn giọng | theme ở header,
  // "giải thích" | "tiếp →" ở footer) nên để góc nào cũng đè. Lỗi build/runtime vẫn hiện overlay như thường.
  devIndicators: false,
  // Tên file audio là mã băm của (model, định dạng, giọng, câu) → đổi nội dung là đổi tên, cache mãi được.
  async headers() {
    return [{ source: "/audio/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
};
export default nextConfig;
