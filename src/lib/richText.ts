import StarterKit from "@tiptap/starter-kit";

export { parseBody, makeExcerpt } from "./richTextDoc";

/**
 * Formatting allowed in the editor. Public pages don't load TipTap at all;
 * they render the saved JSON with components/RichTextView.tsx, which only
 * knows these same node and mark types.
 */
export const richTextExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    codeBlock: false,
    link: { openOnClick: false, autolink: true, protocols: ["http", "https"] },
  }),
];
