import { useState } from "react";
import type { Photo } from "../lib/types";
import Lightbox from "./Lightbox";

/**
 * A side-scrolling strip of photos inside a strategy's text. Tap one to
 * view it full size and swipe through the rest of this row.
 */
export default function PhotoRow({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length === 0) return null;

  return (
    <div className="not-prose">
      {/* On phones the strip runs edge to edge; scroll-padding keeps photos lined up with the text. */}
      <div
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0"
        role="list"
      >
        {photos.map((p, i) => (
          <button
            key={p.id}
            role="listitem"
            onClick={() => setOpen(i)}
            aria-label={`View photo ${i + 1} of ${photos.length} full size`}
            className="w-64 max-w-[75%] shrink-0 snap-start overflow-hidden rounded-lg border border-line bg-surface-2 transition hover:border-matrix-dim hover:shadow-glow sm:w-72"
          >
            <img
              src={p.thumbUrl}
              alt={p.caption ?? ""}
              loading="lazy"
              width={p.width}
              height={p.height}
              className="aspect-[4/3] w-full object-cover"
            />
          </button>
        ))}
      </div>
      {photos.length > 1 && <p className="mt-1 font-mono text-xs text-muted">← swipe · tap to enlarge →</p>}
      {open !== null && <Lightbox photos={photos} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} />}
    </div>
  );
}
