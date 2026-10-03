import type { JSONContent } from "@tiptap/core";

export type { JSONContent };

/** Strategy bodies are stored as a JSON-encoded TipTap document. */
export function parseBody(body: string): JSONContent | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as JSONContent;
  } catch {
    return null;
  }
}

export function makeExcerpt(text: string, max = 280): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : flat.slice(0, max - 1).trimEnd() + "…";
}
