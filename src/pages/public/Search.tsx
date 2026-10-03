import { useMemo } from "react";
import { useSearchParams } from "react-router";
import LoadState from "../../components/LoadState";
import StrategyCard from "../../components/StrategyCard";
import TagChip from "../../components/TagChip";
import { getAllPublished } from "../../data/public";
import { useLoad, useTitle } from "../../hooks/useLoad";

/**
 * Search by strategy title or game name, filter by tag. Firestore has no
 * full-text search, so this loads all published strategies once and filters
 * in the browser. Fast and simple at this site's size.
 */
export default function Search() {
  useTitle("Search");
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const tag = params.get("tag") ?? "";
  const state = useLoad(getAllPublished, []);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const all = state.status === "ready" ? state.data : [];
  const allTags = useMemo(() => [...new Set(all.flatMap((s) => s.tags))].sort(), [all]);
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return all.filter((s) => {
      if (tag && !s.tags.includes(tag)) return false;
      const haystack = `${s.titleLower} ${s.gameName.toLowerCase()}`;
      return words.every((w) => haystack.includes(w));
    });
  }, [all, q, tag]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-glow">Search</h1>
      <input
        className="input"
        type="search"
        value={q}
        onChange={(e) => update("q", e.target.value)}
        placeholder="Strategy title or game…"
        aria-label="Search strategies"
        autoFocus={!tag}
      />

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Filter by tag">
          {allTags.map((t) => (
            <TagChip key={t} tag={t} active={t === tag} />
          ))}
        </div>
      )}

      <LoadState state={state}>
        {() => (
          <>
            <p className="font-mono text-xs text-muted">
              &gt; {results.length} result{results.length === 1 ? "" : "s"}
              {tag && ` tagged #${tag}`}
              {q && ` for “${q}”`}
            </p>
            {results.length === 0 ? (
              <p className="card p-6 text-center text-muted">Nothing found. Try fewer words or a different tag.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((s) => (
                  <StrategyCard key={s.id} strategy={s} />
                ))}
              </div>
            )}
          </>
        )}
      </LoadState>
    </div>
  );
}
