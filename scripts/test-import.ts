/**
 * Dry run of the old-site importer: converts every pinballstrat/<game>/page.tsx
 * and prints what would be imported (nothing is written anywhere).
 *
 *   node scripts/test-import.ts            summary of every game
 *   node scripts/test-import.ts congo      full converted outline of one game
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { convertPage, docText, IMAGE_PLACEHOLDER, type DocNode } from "../src/lib/importer/pageToDoc.ts";

const dir = "pinballstrat";
const only = process.argv[2];
let failures = 0;

function outline(node: DocNode, depth = 0): string[] {
  const pad = "  ".repeat(depth);
  switch (node.type) {
    case "doc":
      return node.content!.flatMap((c) => outline(c, depth));
    case "heading":
      return [`${pad}${"#".repeat(node.attrs!.level as number)} ${docText(node).trim()}`];
    case "paragraph":
      return [`${pad}¶ ${render(node)}`];
    case "photoRow":
      return [`${pad}▦ [${(node.attrs!.photoIds as string[]).map((id) => id.slice(IMAGE_PLACEHOLDER.length)).join(", ")}]`];
    case "bulletList":
    case "orderedList":
      return node.content!.flatMap((li, n) => {
        const [first, ...rest] = li.content!;
        const bullet = node.type === "orderedList" ? `${n + 1}.` : "•";
        return [`${pad}${bullet} ${render(first)}`, ...rest.flatMap((c) => outline(c, depth + 1))];
      });
    case "horizontalRule":
      return [`${pad}---`];
    default:
      return [`${pad}<${node.type}>`];
  }
}

function render(node: DocNode): string {
  return (node.content ?? [])
    .map((t) => {
      if (t.type === "hardBreak") return " / ";
      let s = t.text ?? "";
      for (const m of t.marks ?? []) {
        if (m.type === "bold") s = `**${s}**`;
        if (m.type === "link") s = `[${s}](${m.attrs!.href})`;
      }
      return s;
    })
    .join("");
}

for (const game of readdirSync(dir).sort()) {
  const file = join(dir, game, "page.tsx");
  if (!existsSync(file) || (only && game !== only)) continue;
  try {
    const page = convertPage(readFileSync(file, "utf8"));
    const missing = page.images.filter((img) => !existsSync(join(dir, "static", img)));
    const count = (type: string) => JSON.stringify(page.doc).split(`"type":"${type}"`).length - 1;
    console.log(
      `${game.padEnd(20)} "${page.name}"${page.unfinished ? " (unfinished)" : ""} · ${count("heading")} headings · ` +
        `${count("paragraph")} paragraphs · ${count("listItem")} list items · ${count("photoRow")} photo rows · ` +
        `${page.images.length} images${missing.length ? ` · MISSING: ${missing.join(", ")}` : ""}` +
        (page.warnings.length ? ` · warnings: ${page.warnings.join("; ")}` : ""),
    );
    if (only) console.log("\n" + outline(page.doc).join("\n"));
  } catch (err) {
    failures++;
    console.log(`${game.padEnd(20)} FAILED: ${(err as Error).message}`);
  }
}
process.exitCode = failures ? 1 : 0;
