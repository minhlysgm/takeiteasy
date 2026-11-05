import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Tắt có chủ đích: các chỗ setState trong effect đều là đọc localStorage/theme/speech sau khi mount
      // (để bản server render và lần render đầu trên trình duyệt khớp nhau) hoặc reset khi chuyển đoạn.
      // Viết lại bằng useSyncExternalStore là việc riêng, xem backlog trong docs/workflow/STATE.md.
      "react-hooks/set-state-in-effect": "off",
      // Tên bắt đầu bằng "_" là cố ý bỏ không dùng
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
  globalIgnores([".next/**", "out/**", "next-env.d.ts", "test-results/**", "playwright-report/**", ".ui-snaps/**"]),
]);
