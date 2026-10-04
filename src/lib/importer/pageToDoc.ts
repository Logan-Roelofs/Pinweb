/**
 * Converts a strategy page from the old logansballs.com site (a Next.js
 * page.tsx built from Card/CardHeader/CardTitle/CardContent, lists, and
 * next/image screenshots) into a Pinweb strategy: game name + TipTap JSON.
 *
 * It's a small parser for the JSX those pages actually use, not a general
 * JSX/JavaScript parser. Self-contained (no imports) so it runs both in the
 * admin Import page and in Node for testing (scripts/test-import.ts).
 *
 * Screenshots become photo rows whose ids are placeholders "img:<file name>";
 * the importer swaps in real photo ids when it uploads the files.
 */

type JNode = JText | JElement;
interface JText {
  text: string;
}
interface JElement {
  tag: string;
  attrs: Record<string, string | true>;
  children: JNode[];
}

/** TipTap JSON node (same shape as @tiptap/core's JSONContent). */
export interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

export interface ConvertedPage {
  name: string;
  /** The old page was marked "NOT FINISHED". */
  unfinished: boolean;
  doc: DocNode;
  /** Image file names in the order they first appear (e.g. "congomap.png"). */
  images: string[];
  warnings: string[];
}

export const IMAGE_PLACEHOLDER = "img:";

// ---------------------------------------------------------------- parsing

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  rarr: "→",
  larr: "←",
  times: "×",
  hellip: "…",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** Parses the JSX returned by the page component into a tree. */
function parseJsx(source: string): JElement {
  const start = source.search(/return\s*\(\s*</);
  if (start < 0) throw new Error("Couldn't find the page's JSX (return ( <...> ))");
  let i = source.indexOf("<", start);
  const root: JElement = { tag: "#root", attrs: {}, children: [] };
  const stack: JElement[] = [root];

  const skipBraces = (from: number): number => {
    // Returns index just after the matching "}" (handles nested braces and strings).
    let depth = 0;
    let quote: string | null = null;
    for (let j = from; j < source.length; j++) {
      const c = source[j];
      if (quote) {
        if (c === "\\") j++;
        else if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) return j + 1;
    }
    throw new Error("Unbalanced { } in page");
  };

  /** A string literal inside { }, e.g. {"/static/x.png"} or {`chapter-1`}; otherwise the raw expression. */
  const braceValue = (raw: string): string => {
    const inner = raw.slice(1, -1).trim();
    const m = inner.match(/^(["'`])([\s\S]*)\1$/);
    return m ? m[2] : inner;
  };

  // Parse until the outermost element (the one after "return (") is closed.
  while (i < source.length && !(stack.length === 1 && root.children.some(isEl))) {
    const top = stack[stack.length - 1];
    const c = source[i];

    if (c === "<") {
      if (source[i + 1] === "/") {
        // Closing tag
        const end = source.indexOf(">", i);
        const tag = source.slice(i + 2, end).trim();
        if (top.tag !== tag) throw new Error(`Mismatched </${tag}> (expected </${top.tag}>)`);
        stack.pop();
        i = end + 1;
        continue;
      }
      // Opening tag
      const tagMatch = /^<([A-Za-z][\w.]*)/.exec(source.slice(i));
      if (!tagMatch) {
        top.children.push({ text: "<" });
        i++;
        continue;
      }
      const el: JElement = { tag: tagMatch[1], attrs: {}, children: [] };
      i += tagMatch[0].length;
      // Attributes
      for (;;) {
        while (/\s/.test(source[i])) i++;
        if (source.startsWith("/>", i)) {
          i += 2;
          top.children.push(el);
          break;
        }
        if (source[i] === ">") {
          i++;
          top.children.push(el);
          stack.push(el);
          break;
        }
        if (source[i] === "{") {
          // Spread attribute {...props}: ignore
          i = skipBraces(i);
          continue;
        }
        const nameMatch = /^[\w:-]+/.exec(source.slice(i));
        if (!nameMatch) throw new Error(`Unexpected character in <${el.tag}> attributes`);
        const name = nameMatch[0];
        i += name.length;
        while (/\s/.test(source[i])) i++;
        if (source[i] !== "=") {
          el.attrs[name] = true;
          continue;
        }
        i++;
        while (/\s/.test(source[i])) i++;
        const q = source[i];
        if (q === '"' || q === "'") {
          const end = source.indexOf(q, i + 1);
          el.attrs[name] = source.slice(i + 1, end);
          i = end + 1;
        } else if (q === "{") {
          const end = skipBraces(i);
          el.attrs[name] = braceValue(source.slice(i, end));
          i = end;
        } else {
          throw new Error(`Unexpected attribute value for ${name} in <${el.tag}>`);
        }
      }
      continue;
    }

    if (c === "{") {
      const end = skipBraces(i);
      const raw = source.slice(i, end);
      const inner = raw.slice(1, -1).trim();
      if (!inner.startsWith("/*")) {
        const m = inner.match(/^(["'`])([\s\S]*)\1$/);
        if (m) top.children.push({ text: m[2] });
      }
      i = end;
      continue;
    }

    // Text up to the next tag or expression
    let j = i;
    while (j < source.length && source[j] !== "<" && source[j] !== "{") j++;
    const raw = source.slice(i, j);
    // JSX whitespace: drop whitespace-only text that spans lines; collapse the rest.
    if (!(raw.trim() === "" && raw.includes("\n"))) {
      top.children.push({ text: decodeEntities(raw.replace(/\s+/g, " ")) });
    }
    i = j;
  }
  return root;
}

// ------------------------------------------------------------- converting

const isEl = (n: JNode): n is JElement => "tag" in n;
const cls = (el: JElement) => (typeof el.attrs.className === "string" ? el.attrs.className : "");

function textOf(n: JNode): string {
  return isEl(n) ? n.children.map(textOf).join("") : n.text;
}

function findAll(n: JNode, pred: (el: JElement) => boolean, out: JElement[] = []): JElement[] {
  if (isEl(n)) {
    if (pred(n)) out.push(n);
    n.children.forEach((c) => findAll(c, pred, out));
  }
  return out;
}

const INLINE_TAGS = new Set(["strong", "b", "em", "i", "span", "Link", "a", "br", "code", "u", "s"]);

interface Ctx {
  images: string[];
  warnings: string[];
}

type Mark = NonNullable<DocNode["marks"]>[number];

/** Inline content (text with bold/italic/link marks). */
function inline(nodes: JNode[], marks: Mark[] = []): DocNode[] {
  const out: DocNode[] = [];
  for (const n of nodes) {
    if (!isEl(n)) {
      if (n.text) out.push(marks.length ? { type: "text", text: n.text, marks } : { type: "text", text: n.text });
      continue;
    }
    const tag = n.tag;
    let next = marks;
    if (tag === "br") {
      out.push({ type: "hardBreak" });
      continue;
    }
    if (tag === "strong" || tag === "b" || /font-(semi)?bold/.test(cls(n))) next = addMark(next, { type: "bold" });
    if (tag === "em" || tag === "i" || /\bitalic\b/.test(cls(n))) next = addMark(next, { type: "italic" });
    if ((tag === "Link" || tag === "a") && typeof n.attrs.href === "string" && /^https?:\/\//.test(n.attrs.href)) {
      next = addMark(next, { type: "link", attrs: { href: n.attrs.href } });
    }
    out.push(...inline(n.children, next));
  }
  return tidyText(out);
}

function addMark(marks: Mark[], mark: Mark): Mark[] {
  return marks.some((m) => m.type === mark.type) ? marks : [...marks, mark];
}

/** Merges neighbouring text with identical marks, trims the ends, drops empties. */
function tidyText(nodes: DocNode[]): DocNode[] {
  const merged: DocNode[] = [];
  for (const n of nodes) {
    const prev = merged[merged.length - 1];
    if (prev && n.type === "text" && prev.type === "text" && JSON.stringify(prev.marks) === JSON.stringify(n.marks)) {
      prev.text += n.text!;
    } else merged.push({ ...n });
  }
  // Collapse double spaces created by merging, trim the ends.
  for (const n of merged) if (n.type === "text") n.text = n.text!.replace(/ {2,}/g, " ");
  const first = merged[0];
  if (first?.type === "text") first.text = first.text!.trimStart();
  const last = merged[merged.length - 1];
  if (last?.type === "text") last.text = last.text!.trimEnd();
  return merged.filter((n) => n.type !== "text" || n.text);
}

const paragraph = (content: DocNode[]): DocNode => (content.length ? { type: "paragraph", content } : { type: "paragraph" });

function photoRow(files: string[]): DocNode {
  return { type: "photoRow", attrs: { photoIds: files.map((f) => IMAGE_PLACEHOLDER + f) } };
}

function imageFile(el: JElement, ctx: Ctx): string | null {
  const src = typeof el.attrs.src === "string" ? el.attrs.src : "";
  const file = src.split("/").pop() ?? "";
  if (!file) {
    ctx.warnings.push("An image had no file name and was skipped.");
    return null;
  }
  if (!ctx.images.includes(file)) ctx.images.push(file);
  return file;
}

/** Block content: headings, paragraphs, lists, photo rows. */
function blocks(nodes: JNode[], ctx: Ctx): DocNode[] {
  const out: DocNode[] = [];
  let pendingInline: JNode[] = [];
  const flushInline = () => {
    const content = inline(pendingInline);
    if (content.length) out.push(paragraph(content));
    pendingInline = [];
  };

  for (const n of nodes) {
    if (!isEl(n) || INLINE_TAGS.has(n.tag)) {
      pendingInline.push(n);
      continue;
    }
    flushInline();
    out.push(...block(n, ctx));
  }
  flushInline();
  return mergePhotoRows(out);
}

function block(el: JElement, ctx: Ctx): DocNode[] {
  switch (el.tag) {
    case "CardHeader": {
      const title = findAll(el, (e) => e.tag === "CardTitle")[0];
      const text = (title ? textOf(title) : textOf(el)).replace(/\s+/g, " ").trim();
      return text ? [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] }] : [];
    }
    case "CardTitle":
    case "h1":
    case "h2": {
      const text = textOf(el).replace(/\s+/g, " ").trim();
      return text ? [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] }] : [];
    }
    case "h3":
    case "h4": {
      const content = inline(el.children).map(({ marks, ...rest }) => ({
        ...rest,
        ...(marks?.filter((m) => m.type !== "bold").length ? { marks: marks.filter((m) => m.type !== "bold") } : {}),
      }));
      return content.length ? [{ type: "heading", attrs: { level: 3 }, content }] : [];
    }
    case "p": {
      // A paragraph styled bold is bold text (it's used as a small label).
      const marks: Mark[] = /font-(semi)?bold/.test(cls(el)) ? [{ type: "bold" }] : [];
      const content = inline(el.children, marks);
      return content.length ? [paragraph(content)] : [];
    }
    case "ul":
    case "ol":
      return list(el, ctx);
    case "Image":
    case "img": {
      const file = imageFile(el, ctx);
      return file ? [photoRow([file])] : [];
    }
    case "hr":
      return [{ type: "horizontalRule" }];
    case "table":
      return table(el);
    case "iframe": {
      const src = typeof el.attrs.src === "string" ? el.attrs.src : "";
      const yt = src.match(/youtube\.com\/embed\/([\w-]+)/);
      const href = yt ? `https://www.youtube.com/watch?v=${yt[1]}` : src;
      if (!/^https?:\/\//.test(href)) return [];
      return [
        paragraph([
          { type: "text", text: "▶ " },
          { type: "text", text: yt ? "Watch the video on YouTube" : "Open the embedded video", marks: [{ type: "link", attrs: { href } }] },
        ]),
      ];
    }
    case "nav":
      // Table of contents from the old site: the headings already cover it.
      return [];
    default:
      // Layout wrappers (div, main, Card, CardContent, section, …): keep their contents.
      return blocks(el.children, ctx);
  }
}

/**
 * Lists. The old pages sometimes put images, paragraphs, or nested lists
 * directly inside <ul> between <li>s; nested lists are attached to the
 * previous item, anything else splits the list around it.
 */
function list(el: JElement, ctx: Ctx): DocNode[] {
  const type = el.tag === "ol" ? "orderedList" : "bulletList";
  const out: DocNode[] = [];
  let items: DocNode[] = [];
  const flush = () => {
    if (items.length) out.push({ type, content: items });
    items = [];
  };

  for (const child of el.children) {
    if (!isEl(child)) {
      if (child.text.trim()) {
        flush();
        out.push(paragraph(inline([child])));
      }
      continue;
    }
    if (child.tag === "li") {
      items.push(listItem(child, ctx));
    } else if ((child.tag === "ul" || child.tag === "ol") && items.length) {
      const last = items[items.length - 1];
      last.content!.push(...list(child, ctx));
    } else {
      flush();
      out.push(...block(child, ctx));
    }
  }
  flush();
  return mergePhotoRows(out);
}

function listItem(li: JElement, ctx: Ctx): DocNode {
  const inlineParts: JNode[] = [];
  const nested: DocNode[] = [];
  for (const c of li.children) {
    if (isEl(c) && !INLINE_TAGS.has(c.tag)) nested.push(...block(c, ctx));
    else inlineParts.push(c);
  }
  return { type: "listItem", content: [paragraph(inline(inlineParts)), ...mergePhotoRows(nested)] };
}

/** A table becomes one labelled list per column (the old site's only table lists rewards per route). */
function table(el: JElement): DocNode[] {
  const rows = findAll(el, (e) => e.tag === "tr");
  const cells = rows.map((r) => r.children.filter(isEl).filter((c) => c.tag === "td" || c.tag === "th"));
  const header = cells.find((row) => row.some((c) => c.tag === "th"));
  const body = cells.filter((row) => row !== header && row.length);
  if (!header) {
    return [
      {
        type: "bulletList",
        content: body.map((row) => ({
          type: "listItem",
          content: [paragraph([{ type: "text", text: row.map((c) => textOf(c).trim()).join(" · ") }])],
        })),
      },
    ];
  }
  return header.flatMap((th, col) => [
    paragraph([{ type: "text", text: textOf(th).trim(), marks: [{ type: "bold" }] }]),
    {
      type: "orderedList",
      content: body
        .map((row) => textOf(row[col] ?? { text: "" }).trim())
        .filter(Boolean)
        .map((text) => ({ type: "listItem", content: [paragraph([{ type: "text", text }])] })),
    },
  ]);
}

/** Back-to-back screenshots become one swipeable row. */
function mergePhotoRows(nodes: DocNode[]): DocNode[] {
  const out: DocNode[] = [];
  for (const n of nodes) {
    const prev = out[out.length - 1];
    if (n.type === "photoRow" && prev?.type === "photoRow") {
      const ids = [...(prev.attrs!.photoIds as string[])];
      for (const id of n.attrs!.photoIds as string[]) if (!ids.includes(id)) ids.push(id);
      prev.attrs = { photoIds: ids };
    } else out.push(n);
  }
  return out;
}

// ------------------------------------------------------------------ entry

export function convertPage(source: string): ConvertedPage {
  const root = parseJsx(source);
  const ctx: Ctx = { images: [], warnings: [] };

  // The first <main> is the old sidebar: title, high score, and table of contents.
  const mains = findAll(root, (e) => e.tag === "main");
  const titleEl = findAll(root, (e) => e.tag === "CardTitle" && /text-3xl/.test(cls(e)))[0];
  const rawTitle = titleEl ? textOf(titleEl).replace(/\s+/g, " ").trim() : "";
  const unfinished = /not finished/i.test(rawTitle);
  const name = rawTitle.replace(/\s*not finished\s*/i, "").trim();
  if (!name) ctx.warnings.push("No game title found.");

  const header = mains[0];
  const headerText = header ? textOf(header).replace(/\s+/g, " ") : "";
  const score = headerText.match(/Highest Score:\s*([\d,]+)/i)?.[1];
  const golf = headerText.match(/Pin-Golf Target:\s*([\d,]+)/i)?.[1];

  const content: DocNode[] = [];
  const stats: DocNode[] = [];
  if (score && score.replace(/[,0]/g, "")) {
    stats.push({ type: "text", text: "My highest score: ", marks: [{ type: "bold" }] }, { type: "text", text: score });
  }
  if (golf && golf.replace(/[,0]/g, "")) {
    if (stats.length) stats.push({ type: "text", text: " · " });
    stats.push({ type: "text", text: "Pin-golf target: ", marks: [{ type: "bold" }] }, { type: "text", text: golf });
  }
  if (stats.length) content.push(paragraph(stats));

  const bodyMains = mains.length > 1 ? mains.slice(1) : mains;
  for (const m of bodyMains) content.push(...blocks(m.children, ctx));

  return { name, unfinished, doc: { type: "doc", content: mergePhotoRows(content) }, images: ctx.images, warnings: ctx.warnings };
}

/** Plain text of a document (for the excerpt). */
export function docText(node: DocNode): string {
  if (node.type === "text") return node.text ?? "";
  const inner = (node.content ?? []).map(docText);
  return ["paragraph", "heading", "listItem"].includes(node.type) ? inner.join("") + "\n" : inner.join("");
}
