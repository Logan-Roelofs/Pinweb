import { generateHTML, generateText, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

/**
 * The one list of formatting allowed in strategy bodies. Both the editor and
 * the public page use it, and the public page can only output these node
 * types, so stored content can't inject scripts or arbitrary HTML.
 */
export const richTextExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    codeBlock: false,
    link: { openOnClick: false, autolink: true, protocols: ["http", "https"], HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" } },
  }),
];

export function parseBody(body: string): JSONContent | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as JSONContent;
  } catch {
    return null;
  }
}

export function bodyToHtml(body: string): string {
  const doc = parseBody(body);
  return doc ? generateHTML(doc, richTextExtensions) : "";
}

export function bodyToText(body: string): string {
  const doc = parseBody(body);
  return doc ? generateText(doc, richTextExtensions) : "";
}

export function makeExcerpt(text: string, max = 280): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : flat.slice(0, max - 1).trimEnd() + "…";
}
