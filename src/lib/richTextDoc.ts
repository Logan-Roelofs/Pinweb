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

/** Ids of photos placed in photo rows inside the body. */
export function photoIdsInBody(body: string): Set<string> {
  const ids = new Set<string>();
  const walk = (node: JSONContent) => {
    if (node.type === "photoRow" && Array.isArray(node.attrs?.photoIds)) {
      for (const id of node.attrs.photoIds) if (typeof id === "string") ids.add(id);
    }
    node.content?.forEach(walk);
  };
  const doc = parseBody(body);
  if (doc) walk(doc);
  return ids;
}

export function makeExcerpt(text: string, max = 280): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : flat.slice(0, max - 1).trimEnd() + "…";
}
