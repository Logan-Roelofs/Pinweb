import { useEffect, useState, type FormEvent } from "react";
import { searchBackglasses, type BackglassResult } from "../../lib/backglass";
import { errorMessage } from "../../lib/writes";

interface Props {
  initialQuery: string;
  /** Offer to fill in manufacturer/year (when the game doesn't have them yet). */
  offerDetails: boolean;
  onConfirm: (result: BackglassResult, options: { fillDetails: boolean }) => void;
  onClose: () => void;
}

/**
 * Search online for a game's backglass, pick one, and confirm it before it
 * becomes the cover photo. Nothing is saved until "Use as cover".
 */
export default function BackglassSearch({ initialQuery, offerDetails, onConfirm, onClose }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<BackglassResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<BackglassResult | null>(null);
  const [fillDetails, setFillDetails] = useState(true);

  async function search(e?: FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResults(await searchBackglasses(query));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Search right away if we already know the game's name (once, on open).
  useEffect(() => {
    if (initialQuery.trim()) search();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (picked) setPicked(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked, onClose]);

  const details = picked && [picked.manufacturer, picked.year].filter(Boolean).join(" · ");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Find a backglass"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 sm:items-center"
      onClick={onClose}
    >
      <div className="card flex max-h-[92dvh] w-full max-w-3xl flex-col p-4 shadow-glow" onClick={(e) => e.stopPropagation()}>
        {picked ? (
          // Step 2: confirm
          <>
            <h2 className="font-mono text-lg font-bold">Use this backglass?</h2>
            <div className="my-3 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-black">
              <img src={picked.imageUrl} alt={`${picked.gameName} backglass`} className="max-h-[55dvh] max-w-full object-contain" />
            </div>
            <p className="text-sm">
              <strong>{picked.gameName}</strong>
              {details && <span className="text-muted"> · {details}</span>}
              <span className="text-muted"> · art by {picked.credit}</span>
            </p>
            {offerDetails && details && (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--color-matrix)]"
                  checked={fillDetails}
                  onChange={(e) => setFillDetails(e.target.checked)}
                />
                Also fill in manufacturer and year ({details})
              </label>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn" onClick={() => setPicked(null)}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={() => onConfirm(picked, { fillDetails: offerDetails && fillDetails })}>
                Use as cover
              </button>
            </div>
          </>
        ) : (
          // Step 1: search
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-mono text-lg font-bold">Find a backglass</h2>
              <button className="btn btn-sm" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
            <form onSubmit={search} className="mt-3 flex gap-2">
              <input
                className="input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Game name, e.g. Medieval Madness"
                aria-label="Game name"
                autoFocus={!initialQuery}
              />
              <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
                Search
              </button>
            </form>

            <div className="mt-3 min-h-40 overflow-y-auto">
              {loading && <p className="py-8 text-center font-mono text-sm text-muted">&gt; searching backglasses…</p>}
              {error && <p className="py-4 text-sm text-red-300">Search failed: {error}</p>}
              {!loading && results?.length === 0 && (
                <p className="py-8 text-center text-sm text-muted">No backglasses found. Try fewer or different words.</p>
              )}
              {!loading && results && results.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {results.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setPicked(r)}
                      className="overflow-hidden rounded-lg border border-line bg-surface-2 text-left transition hover:border-matrix hover:shadow-glow"
                    >
                      <img src={r.imageUrl} alt="" loading="lazy" className="aspect-[4/3] w-full bg-black object-contain" />
                      <span className="block truncate px-2 pt-1 text-xs font-semibold">{r.gameName}</span>
                      <span className="block truncate px-2 pb-1 text-xs text-muted">
                        {[r.manufacturer, r.year].filter(Boolean).join(" · ") || "—"} · {r.credit}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-muted">
              Images from the community-run Virtual Pinball Spreadsheet. Tap one to preview it before anything is saved.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
