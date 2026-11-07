/**
 * Tạo file giọng ElevenLabs còn thiếu vào public/audio/. Chạy: `npm run audio -- [--dry-run] [--prune]`
 *
 *   (không cờ)   tạo các file còn thiếu, lần lượt từng file; lỗi HTTP thì dừng (file đã ghi được giữ)
 *   --dry-run    chỉ in số file cần tạo / ký tự (= credit) / file thừa, không gọi mạng, không cần key
 *   --prune      xoá file thừa (không câu nào dùng nữa)
 *
 * Key đọc từ .env.local biến ELEVENLABS_API_KEY — không bao giờ in ra.
 */
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { audioTexts } from "../../lib/audio/texts";
import { planAudio } from "../../lib/audio/plan";
import { audioPath } from "../../lib/audio/audioPath";
import { TTS_FORMAT, TTS_MODEL, VOICES } from "../../lib/audio/voices";
import { withRetry429 } from "../../lib/audio/retry";

const PUBLIC_DIR = join(process.cwd(), "public");
const AUDIO_DIR = join(PUBLIC_DIR, "audio");
const MIN_BYTES = 1024; // khớp test tests/audio-coverage.test.ts

function scanExisting(): Set<string> {
  const found = new Set<string>();
  if (!existsSync(AUDIO_DIR)) return found;
  for (const voice of readdirSync(AUDIO_DIR, { withFileTypes: true })) {
    if (!voice.isDirectory()) continue;
    for (const file of readdirSync(join(AUDIO_DIR, voice.name))) {
      if (file.endsWith(".mp3")) found.add(`/audio/${voice.name}/${file}`);
    }
  }
  return found;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const prune = process.argv.includes("--prune");

  try {
    process.loadEnvFile(".env.local");
  } catch (err) {
    // Không có .env.local: vẫn chạy được --dry-run; chạy thật sẽ báo thiếu key bên dưới.
    // Có mà đọc lỗi (sai cú pháp, không có quyền): báo đúng lỗi, đừng để người dùng tưởng là thiếu key.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`Không đọc được .env.local: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  }

  const plan = planAudio(audioTexts(), scanExisting());
  console.log(`Cần tạo: ${plan.todo.length} file`);
  console.log(`Tổng ký tự (= credit ElevenLabs): ${plan.chars}`);
  console.log(`File thừa: ${plan.orphans.length}`);
  if (dryRun) return;

  if (prune) {
    for (const orphan of plan.orphans) unlinkSync(join(PUBLIC_DIR, orphan));
    if (plan.orphans.length) console.log(`Đã xoá ${plan.orphans.length} file thừa.`);
  }
  if (plan.todo.length === 0) {
    console.log("Không có gì cần tạo.");
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("Thiếu ELEVENLABS_API_KEY — thêm vào .env.local rồi chạy lại.");
    process.exit(1);
  }

  let done = 0;
  for (const item of plan.todo) {
    const voice = VOICES.find((v) => v.id === item.voice)!;
    const res = await withRetry429(
      () =>
        fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.elevenId}?output_format=${TTS_FORMAT}`, {
          method: "POST",
          headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
          body: JSON.stringify({ text: item.text, model_id: TTS_MODEL }),
        }),
      (wait) => console.log(`  429 (quá nhiều lượt) — chờ ${Math.round(wait / 1000)}s rồi thử lại…`),
    );
    if (!res.ok) {
      console.error(`Lỗi HTTP ${res.status} ở "${item.label}" · ${item.voice}. Dừng (đã tạo ${done} file, giữ nguyên).`);
      process.exit(1);
    }
    const audio = Buffer.from(await res.arrayBuffer());
    // File rỗng / gần rỗng (lỗi mạng) mà ghi ra thì lần sau bị coi là "đã có" → chặn, không ghi.
    if (audio.byteLength <= MIN_BYTES) {
      console.error(`File trả về chỉ ${audio.byteLength} byte ở "${item.label}" · ${item.voice}. Dừng (đã tạo ${done} file, giữ nguyên).`);
      process.exit(1);
    }
    const file = join(PUBLIC_DIR, audioPath(item.voice, item.text));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, audio);
    done++;
    console.log(`[${done}/${plan.todo.length}] ${item.label} · ${item.voice}`);
  }
  console.log(`Xong: ${done} file.`);
}

main().catch((err) => {
  // chỉ in thông điệp lỗi, không in cả đối tượng (tránh lộ header)
  console.error(`Lỗi: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
