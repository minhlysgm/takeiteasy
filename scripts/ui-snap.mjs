// Chụp màn hình để soi UI: mỗi route × (desktop, mobile) × (dark, light).
// Dùng:  npm run ui:snap                       → các route mặc định
//        npm run ui:snap -- / /read/x/ch01/2   → route tuỳ chọn
// Thêm "#explain" vào route reader để chụp cả lúc bật chế độ giải thích.
// Ảnh nằm ở .ui-snaps/<tên-route>__<viewport>__<theme>.png (đã gitignore).
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";

const BASE = process.env.UI_BASE_URL ?? "http://localhost:3000";
const OUT = ".ui-snaps";
const routes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["/", "/read/the-subtle-art/ch01/1", "/read/the-subtle-art/ch01/1#explain"];
const viewports = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const themes = ["dark", "light"];

async function up() {
  try {
    return (await fetch(BASE)).ok;
  } catch {
    return false;
  }
}

let server;
if (!(await up())) {
  server = spawn("npm", ["run", "dev"], { stdio: "ignore", detached: true });
  for (let i = 0; i < 120 && !(await up()); i++) await new Promise((r) => setTimeout(r, 1000));
  if (!(await up())) throw new Error(`Không khởi động được dev server ở ${BASE}`);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const files = [];
try {
  for (const route of routes) {
    const [path, flag] = route.split("#");
    const slug = (path === "/" ? "home" : path.replace(/^\/|\/$/g, "").replaceAll("/", "_")) + (flag ? `-${flag}` : "");
    for (const [vpName, viewport] of Object.entries(viewports)) {
      for (const theme of themes) {
        const ctx = await browser.newContext({ viewport, reducedMotion: "reduce", colorScheme: theme });
        await ctx.addInitScript((t) => {
          try {
            localStorage.setItem("tie:theme", t);
          } catch {}
        }, theme);
        const page = await ctx.newPage();
        await page.goto(BASE + path, { waitUntil: "networkidle" });
        if (await page.getByTestId("translation-col").count()) {
          await page.keyboard.press("Shift"); // phím bất kỳ = bỏ qua hiệu ứng gõ chữ
          if (flag === "explain") await page.keyboard.press("e");
        }
        await page.waitForTimeout(600);
        const file = `${OUT}/${slug}__${vpName}__${theme}.png`;
        await page.screenshot({ path: file, fullPage: true });
        files.push(file);
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
  if (server) process.kill(-server.pid);
}
console.log(files.join("\n"));
