/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Nút "N" của Next (chỉ khi dev) mặc định ở góc dưới trái — đè lên nút "giải thích" ở footer.
  // Góc trên phải: header chỉ có chữ căn giữa, không có nút nào.
  devIndicators: { position: "top-right" },
};
export default nextConfig;
