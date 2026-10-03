import { useEffect, useRef } from "react";
import type { Photo } from "../lib/types";

interface Props {
  photos: Photo[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/** Full-screen photo viewer: tap outside / Esc to close, arrows or swipe to move between photos. */
export default function Lightbox({ photos, index, onIndexChange, onClose }: Props) {
  const photo = photos[index];
  const touchStartX = useRef<number | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const count = photos.length;

  const go = (by: number) => onIndexChange((index + by + count) % count);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Lock page scroll and move focus into the viewer while it's open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${count}`}
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onClick={onClose}
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) > 50 && count > 1) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between p-3 font-mono text-sm text-muted">
        <span>
          {index + 1} / {count}
        </span>
        <button ref={closeButton} className="btn btn-sm" onClick={onClose} aria-label="Close">
          ✕ Close
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        <img
          src={photo.url}
          alt={photo.caption ?? ""}
          className="max-h-full max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        {count > 1 && (
          <>
            <NavButton side="left" onClick={() => go(-1)} />
            <NavButton side="right" onClick={() => go(1)} />
          </>
        )}
      </div>

      {photo.caption && <p className="p-4 text-center text-sm text-text">{photo.caption}</p>}
    </div>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/80 font-mono text-xl text-matrix hover:shadow-glow sm:flex ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}
