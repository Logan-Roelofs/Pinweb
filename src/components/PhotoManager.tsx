import { useRef, useState } from "react";
import type { Photo } from "../lib/types";
import { deletePhotoFiles, uploadPhoto } from "../lib/photos";
import { errorMessage, reportError } from "../lib/writes";

interface Props {
  photos: Photo[];
  /** Storage folder for new uploads, e.g. "strategies/abc123". */
  folder: string;
  onAdd: (photo: Photo) => void;
  onChange: (photos: Photo[]) => void;
}

/** Upload, reorder, and delete a strategy's photos. */
export default function PhotoManager({ photos, folder, onAdd, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<{ key: string; name: string; progress: number }[]>([]);

  async function handleFiles(files: FileList | null) {
    for (const file of Array.from(files ?? [])) {
      const key = crypto.randomUUID();
      setUploads((u) => [...u, { key, name: file.name, progress: 0 }]);
      try {
        const photo = await uploadPhoto(file, folder, (progress) =>
          setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress } : x))),
        );
        onAdd(photo);
      } catch (err) {
        reportError(`Couldn't upload ${file.name}: ${errorMessage(err)}`, err);
      } finally {
        setUploads((u) => u.filter((x) => x.key !== key));
      }
    }
  }

  function move(index: number, by: -1 | 1) {
    const next = [...photos];
    const [p] = next.splice(index, 1);
    next.splice(index + by, 0, p);
    onChange(next);
  }

  async function remove(photo: Photo) {
    if (!confirm("Delete this photo?")) return;
    onChange(photos.filter((p) => p.id !== photo.id));
    deletePhotoFiles(photo).catch((err) => reportError("Couldn't delete photo file", err));
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p, i) => (
          <figure key={p.id} className="card overflow-hidden">
            <img src={p.thumbUrl} alt="" className="aspect-square w-full bg-surface-2 object-cover" loading="lazy" />
            <figcaption className="flex justify-between gap-1 p-1">
              <button type="button" className="btn btn-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move earlier">
                ←
              </button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(p)} aria-label="Delete photo">
                ✕
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={i === photos.length - 1}
                onClick={() => move(i, 1)}
                aria-label="Move later"
              >
                →
              </button>
            </figcaption>
          </figure>
        ))}
        {uploads.map((u) => (
          <div key={u.key} className="card flex aspect-square flex-col items-center justify-center gap-2 p-3 text-center">
            <span className="font-mono text-2xl text-matrix">{Math.round(u.progress * 100)}%</span>
            <div className="h-1.5 w-full overflow-hidden rounded bg-surface-2">
              <div className="h-full bg-matrix shadow-glow transition-all" style={{ width: `${u.progress * 100}%` }} />
            </div>
            <span className="w-full truncate text-xs text-muted">{u.name}</span>
          </div>
        ))}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button type="button" className="btn mt-3" onClick={() => input.current?.click()}>
        + Add photos
      </button>
    </div>
  );
}
