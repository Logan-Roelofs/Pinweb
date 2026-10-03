import { useEffect, useState } from "react";
import { Link } from "react-router";
import { deleteNote, markNoteMerged, subscribeNotes } from "../data/notes";
import { formatDate } from "../lib/format";
import type { Note, Photo } from "../lib/types";

interface Props {
  gameId: string;
  photos: Photo[];
  /** Adds the note's text (and its photos, as a photo row) to the end of the strategy. */
  onInsert: (text: string, photoIds: string[]) => void;
}

/** Quick Capture notes for a game, to fold into the strategy text over time. */
export default function NotesPanel({ gameId, photos, onInsert }: Props) {
  const [notes, setNotes] = useState<Note[]>();
  useEffect(() => subscribeNotes(gameId, setNotes), [gameId]);

  return (
    <section className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mono text-sm text-muted uppercase">
          Capture notes {notes && notes.length > 0 && <span>({notes.length})</span>}
        </h2>
        <Link to={`/admin/capture?game=${gameId}`} className="btn btn-sm border-matrix-dim text-matrix">
          ⚡ Capture
        </Link>
      </div>
      {!notes ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted">No notes yet. Use Quick Capture at the machine.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => {
            const notePhotos = photos.filter((p) => n.photoIds?.includes(p.id));
            return (
              <li key={n.id} className={`rounded-lg border border-line bg-surface-2 p-3 ${n.mergedAt ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between gap-2 font-mono text-xs text-muted">
                  <span>{formatDate(n.createdAt)}</span>
                  {n.mergedAt && <span className="text-matrix">✓ added</span>}
                </div>
                {n.text && <p className="mt-2 text-sm whitespace-pre-wrap">{n.text}</p>}
                {notePhotos.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {notePhotos.map((p) => (
                      <img key={p.id} src={p.thumbUrl} alt="" className="size-14 shrink-0 rounded object-cover" />
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(n.text.trim() || notePhotos.length > 0) && (
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        onInsert(n.text, notePhotos.map((p) => p.id));
                        markNoteMerged(gameId, n.id);
                      }}
                    >
                      {n.mergedAt ? "Add again" : "↓ Add to strategy"}
                    </button>
                  )}
                  <Link to={`/admin/capture?game=${gameId}&note=${n.id}`} className="btn btn-sm">
                    Continue
                  </Link>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => confirm("Delete this note? Its photos stay on the page.") && deleteNote(gameId, n.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
