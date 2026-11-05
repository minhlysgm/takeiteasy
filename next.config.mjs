/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Nút "N" của Next (chỉ khi dev) mặc định ở góc dưới trái — đè lên nút "giải thích" ở footer.
  // Góc trên phải giờ có nút theme (mobile). Góc trên trái: header mobile là ô trống cân đối,
  // desktop là 3 chấm trang trí, kệ sách là dòng chữ "// kệ sách" — không đè nút nào.
  devIndicators: { position: "top-left" },
};
export default nextConfig;
