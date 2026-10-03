import { useState } from "react";
import type { Photo } from "../lib/types";
import Lightbox from "./Lightbox";

/** Thumbnail grid; tapping a photo opens it full size. */
export default function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setOpen(i)}
            className="group overflow-hidden rounded-lg border border-line bg-surface-2 transition hover:border-matrix-dim hover:shadow-glow"
            aria-label={`View photo ${i + 1} full size`}
          >
            <img
              src={p.thumbUrl}
              alt={p.caption ?? ""}
              loading="lazy"
              width={p.width}
              height={p.height}
              className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.02]"
            />
          </button>
        ))}
      </div>
      {open !== null && <Lightbox photos={photos} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}
