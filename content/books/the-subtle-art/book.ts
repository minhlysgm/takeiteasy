import type { Book, Passage } from "@/content/types";
import { ch01Passages } from "./ch01";

export const theSubtleArtPassages: Record<string, Passage[]> = { ch01: ch01Passages };

export const theSubtleArt: Book = {
  id: "the-subtle-art",
  title: "The Subtle Art of Not Giving a F*ck",
  author: "Mark Manson",
  chapters: [{ id: "ch01", title: "Don't Try", passageCount: ch01Passages.length }],
};
