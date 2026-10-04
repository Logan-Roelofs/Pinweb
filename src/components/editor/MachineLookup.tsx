import { useEffect, useState, type FormEvent } from "react";
import { findIpdbId } from "../../lib/backglass";
import { isMainMachine, searchOpdb, type OpdbMachine } from "../../lib/opdb";
import type { MachineLink } from "../../lib/types";
import { errorMessage } from "../../lib/writes";

interface Props {
  initialQuery: string;
  onPick: (machine: MachineLink, details: OpdbMachine) => void;
  onClose: () => void;
}

/**
 * Find the real machine a game page is about (in the Open Pinball Database),
 * so the page can link to PinTips, IPDB, etc. Picking a result also looks up
 * its IPDB number.
 */
export default function MachineLookup({ initialQuery, onPick, onClose }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<OpdbMachine[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function search(e?: FormEvent) {
    e?.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    setError("");
    try {
      // Main machines first; variants (special editions, clones) after.
      const found = await searchOpdb(query);
      setResults([...found.filter((m) => isMainMachine(m.id)), ...found.filter((m) => !isMainMachine(m.id))]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Search right away with the game's name (once, on open).
  useEffect(() => {
    if (initialQuery.trim()) search();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function pick(m: OpdbMachine) {
    setSaving(m.id);
    // The IPDB number comes from a separate database; the link still works without it.
    const ipdbId = await findIpdbId(m).catch(() => null);
    onPick({ opdbId: m.id, ipdbId, name: m.name }, m);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Link to a machine"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 sm:items-center"
      onClick={onClose}
    >
      <div className="card flex max-h-[85dvh] w-full max-w-lg flex-col p-4 shadow-glow" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-mono text-lg font-bold">Which machine is this?</h2>
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
            placeholder="Machine name"
            aria-label="Machine name"
            autoFocus={!initialQuery}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || query.trim().length < 2}>
            Search
          </button>
        </form>

        <div className="mt-3 min-h-24 overflow-y-auto">
          {loading && <p className="py-6 text-center font-mono text-sm text-muted">&gt; searching…</p>}
          {error && <p className="py-4 text-sm text-red-300">Search failed: {error}</p>}
          {!loading && results?.length === 0 && <p className="py-6 text-center text-sm text-muted">No machines found.</p>}
          {!loading && results && results.length > 0 && (
            <ul className="space-y-2">
              {results.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => pick(m)}
                    disabled={saving !== null}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-3 py-3 text-left transition hover:border-matrix hover:shadow-glow disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{m.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {[m.manufacturer, m.year].filter(Boolean).join(", ")}
                        {!isMainMachine(m.id) && " · variant"}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-matrix">{saving === m.id ? "linking…" : "Link"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">From the Open Pinball Database. Pick the exact maker and year.</p>
      </div>
    </div>
  );
}
