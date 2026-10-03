import type { ReactNode } from "react";
import { parseBody, type JSONContent } from "../lib/richTextDoc";
import type { Photo } from "../lib/types";
import PhotoRow from "./PhotoRow";

/**
 * Renders a saved strategy body. It builds React elements from a fixed list
 * of node types (no raw HTML), so stored content can never inject markup or
 * scripts, and the public pages don't need to download the editor.
 * `photos` are the page's photos, used by photo rows (which store only ids).
 */
export default function RichTextView({ body, photos = [] }: { body: string; photos?: Photo[] }) {
  const doc = parseBody(body);
  if (!doc?.content?.length) return null;
  const byId = new Map(photos.map((p) => [p.id, p]));
  return <div className="rich-text">{renderChildren(doc, byId)}</div>;
}

type PhotoMap = Map<string, Photo>;

function renderChildren(node: JSONContent, photos: PhotoMap): ReactNode[] {
  return (node.content ?? []).map((child, i) => renderNode(child, i, photos));
}

function renderNode(node: JSONContent, key: number, photos: PhotoMap): ReactNode {
  const renderChildren_ = (n: JSONContent) => renderChildren(n, photos);
  switch (node.type) {
    case "photoRow": {
      const ids = Array.isArray(node.attrs?.photoIds) ? (node.attrs.photoIds as unknown[]) : [];
      const row = ids.flatMap((id) => (typeof id === "string" && photos.has(id) ? [photos.get(id)!] : []));
      return <PhotoRow key={key} photos={row} />;
    }
    case "paragraph":
      return <p key={key}>{renderChildren_(node)}</p>;
    case "heading":
      return node.attrs?.level === 3 ? (
        <h3 key={key}>{renderChildren_(node)}</h3>
      ) : (
        <h2 key={key}>{renderChildren_(node)}</h2>
      );
    case "bulletList":
      return <ul key={key}>{renderChildren_(node)}</ul>;
    case "orderedList":
      return (
        <ol key={key} start={typeof node.attrs?.start === "number" ? node.attrs.start : undefined}>
          {renderChildren_(node)}
        </ol>
      );
    case "listItem":
      return <li key={key}>{renderChildren_(node)}</li>;
    case "blockquote":
      return <blockquote key={key}>{renderChildren_(node)}</blockquote>;
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    case "text":
      return renderText(node, key);
    default:
      // Unknown node: keep its text, drop the wrapper.
      return node.content ? <span key={key}>{renderChildren_(node)}</span> : null;
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
