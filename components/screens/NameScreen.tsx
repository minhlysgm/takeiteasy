"use client";
import { useState } from "react";
import Button from "../ui/Button";
export default function NameScreen({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex flex-col items-center gap-5 pt-16 px-6 text-center">
      <h1 className="font-display font-extrabold text-3xl">Ghép Câu</h1>
      <p className="text-sm text-ink-soft max-w-[320px]">Bạn có thấy bối rối mỗi khi Manager (người nước ngoài) nhắn tin cho bạn? Đừng lo, vô đây tui chỉ cho nè</p>
      <form className="flex flex-col items-center gap-2 w-full max-w-[320px]"
        onSubmit={e => { e.preventDefault(); onSubmit(v); }}>
        <input value={v} onChange={e => setV(e.target.value)} maxLength={14}
          placeholder="Cho tui xin tên nhe"
          className="w-full border-2 border-ink rounded-tile bg-surface px-3 py-3 text-base font-display text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink" />
        <p className="text-xs text-ink-soft">Cho tui xin tên để dễ xưng hô hen</p>
        <Button type="submit">Bắt đầu ▸</Button>
        <Button variant="secondary" onClick={() => onSubmit("")}>Bỏ qua</Button>
      </form>
    </div>
  );
}
