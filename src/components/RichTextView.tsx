import type { ReactNode } from "react";
import { parseBody, type JSONContent } from "../lib/richTextDoc";

/**
 * Renders a saved strategy body. It builds React elements from a fixed list
 * of node types (no raw HTML), so stored content can never inject markup or
 * scripts, and the public pages don't need to download the editor.
 */
export default function RichTextView({ body }: { body: string }) {
  const doc = parseBody(body);
  if (!doc?.content?.length) return null;
  return <div className="rich-text">{renderChildren(doc)}</div>;
}

function renderChildren(node: JSONContent): ReactNode[] {
  return (node.content ?? []).map((child, i) => renderNode(child, i));
}

function renderNode(node: JSONContent, key: number): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{renderChildren(node)}</p>;
    case "heading":
      return node.attrs?.level === 3 ? (
        <h3 key={key}>{renderChildren(node)}</h3>
      ) : (
        <h2 key={key}>{renderChildren(node)}</h2>
      );
    case "bulletList":
      return <ul key={key}>{renderChildren(node)}</ul>;
    case "orderedList":
      return (
        <ol key={key} start={typeof node.attrs?.start === "number" ? node.attrs.start : undefined}>
          {renderChildren(node)}
        </ol>
      );
    case "listItem":
      return <li key={key}>{renderChildren(node)}</li>;
    case "blockquote":
      return <blockquote key={key}>{renderChildren(node)}</blockquote>;
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    case "text":
      return renderText(node, key);
    default:
      // Unknown node: keep its text, drop the wrapper.
      return node.content ? <span key={key}>{renderChildren(node)}</span> : null;
  }
}

function renderText(node: JSONContent, key: number): ReactNode {
  let out: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        out = <strong>{out}</strong>;
        break;
      case "italic":
        out = <em>{out}</em>;
        break;
      case "underline":
        out = <u>{out}</u>;
        break;
      case "strike":
        out = <s>{out}</s>;
        break;
      case "code":
        out = <code>{out}</code>;
        break;
      case "link": {
        const href = String(mark.attrs?.href ?? "");
        if (/^https?:\/\//i.test(href)) {
          out = (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {out}
            </a>
          );
        }
        break;
      }
    }
  }
  return <span key={key}>{out}</span>;
}
