import { useEffect, useState } from "react";
import type { Photo } from "../../lib/types";

interface Props {
  photos: Photo[];
  initial?: string[];
  onDone: (photoIds: string[]) => void;
  onCancel: () => void;
}

/** Pick photos for a photo row, in order (tap to add or remove; numbers show the order). */
export default function PhotoPicker({ photos, initial = [], onDone, onCancel }: Props) {
  const [selected, setSelected] = useState<string[]>(initial.filter((id) => photos.some((p) => p.id === id)));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose photos for this row"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center"
      onClick={onCancel}
    >
      <div className="card flex max-h-[85dvh] w-full max-w-lg flex-col p-4 shadow-glow" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-mono text-lg font-bold">Photo row</h2>
        <p className="mt-1 text-sm text-muted">Tap photos in the order they should appear.</p>

        {photos.length === 0 ? (
          <p className="my-6 text-sm text-draft">
            This game has no uploaded photos yet. Add some in the Photos section below the editor (or with Quick Capture),
            then come back.
          </p>
        ) : (
          <div className="my-4 grid grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {photos.map((p) => {
              const n = selected.indexOf(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={n >= 0}
                  className={`relative overflow-hidden rounded-lg border-2 ${n >= 0 ? "border-matrix shadow-glow" : "border-transparent"}`}
                >
                  <img src={p.thumbUrl} alt="" className="aspect-square w-full object-cover" />
                  {n >= 0 && (
                    <span className="absolute top-1 left-1 flex size-6 items-center justify-center rounded-full bg-matrix font-mono text-xs font-bold text-bg">
                      {n + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={selected.length === 0} onClick={() => onDone(selected)}>
            {initial.length ? "Update row" : "Insert row"} ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}
