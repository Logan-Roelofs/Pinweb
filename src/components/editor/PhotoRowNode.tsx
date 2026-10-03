import { useState } from "react";
import { Node, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import PhotoPicker from "./PhotoPicker";
import { usePagePhotos } from "./PhotosContext";

/**
 * A "photo row" block inside the strategy text: a list of the game's photo
 * ids, shown publicly as a side-scrolling strip under that part of the text
 * (see components/PhotoRow.tsx). Stored in the body JSON as
 * { type: "photoRow", attrs: { photoIds: [...] } }.
 */
export const PhotoRowNode = Node.create({
  name: "photoRow",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      photoIds: {
        default: [],
        parseHTML: (el) => {
          try {
            return JSON.parse(el.getAttribute("data-photo-ids") ?? "[]");
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({ "data-photo-ids": JSON.stringify(attrs.photoIds ?? []) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-photo-row]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { "data-photo-row": "", ...HTMLAttributes }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PhotoRowView);
  },
});

/** How a photo row looks while editing. */
function PhotoRowView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const photos = usePagePhotos();
  const [picking, setPicking] = useState(false);
  const ids = (node.attrs.photoIds ?? []) as string[];
  const shown = ids.map((id) => photos.find((p) => p.id === id)).filter((p) => !!p);
  const missing = ids.length - shown.length;

  return (
    <NodeViewWrapper
      className={`my-4 rounded-lg border bg-surface-2 p-2 ${selected ? "border-matrix shadow-glow" : "border-line"}`}
      contentEditable={false}
    >
      <div className="flex items-center gap-2 pb-2">
        <span data-drag-handle className="cursor-grab font-mono text-xs text-muted" title="Drag to move">
          ⠿ photo row
        </span>
        <span className="flex-1" />
        <button type="button" className="btn btn-sm" onClick={() => setPicking(true)}>
          Edit
        </button>
        <button type="button" className="btn btn-sm btn-danger" onClick={deleteNode} aria-label="Remove photo row">
          ✕
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {shown.map((p) => (
          <img key={p.id} src={p.thumbUrl} alt="" className="h-20 w-28 shrink-0 rounded object-cover" />
        ))}
        {shown.length === 0 && <span className="p-2 text-sm text-muted">No photos. Tap Edit to pick some.</span>}
      </div>
      {missing > 0 && (
        <p className="pt-1 text-xs text-draft">
          {missing} photo{missing === 1 ? " is" : "s are"} still uploading or were deleted.
        </p>
      )}
      {picking && (
        <PhotoPicker
          photos={photos}
          initial={ids}
          onCancel={() => setPicking(false)}
          onDone={(photoIds) => {
            updateAttributes({ photoIds });
            setPicking(false);
          }}
        />
      )}
    </NodeViewWrapper>
  );
}
