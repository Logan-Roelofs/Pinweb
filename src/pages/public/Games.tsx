import { useMemo } from "react";
import { useSearchParams } from "react-router";
import GameCard from "../../components/GameCard";
import LoadState from "../../components/LoadState";
import TagChip from "../../components/TagChip";
import { getPublishedGamePages } from "../../data/public";
import { useLoad, useTitle } from "../../hooks/useLoad";

/**
 * All published games, A→Z, with search (name or manufacturer) and a tag
 * filter. Firestore has no full-text search, so this loads every published
 * page once and filters in the browser. Fast and simple at this site's size.
 */
export default function Games() {
  useTitle("Games");
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const tag = params.get("tag") ?? "";
  const state = useLoad(
    () => getPublishedGamePages().then((pages) => pages.sort((a, b) => a.game.nameLower.localeCompare(b.game.nameLower))),
    [],
  );

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const all = useMemo(() => (state.status === "ready" ? state.data : []), [state]);
  const allTags = useMemo(() => [...new Set(all.flatMap((p) => p.strategy.tags))].sort(), [all]);
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return all.filter(({ game, strategy }) => {
      if (tag && !strategy.tags.includes(tag)) return false;
      const haystack = `${game.nameLower} ${(game.manufacturer ?? "").toLowerCase()} ${game.year ?? ""}`;
      return words.every((w) => haystack.includes(w));
    });
  }, [all, q, tag]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-glow">Games</h1>
      <input
        className="input"
        type="search"
        value={q}
        onChange={(e) => update("q", e.target.value)}
        placeholder="Search by game or manufacturer…"
        aria-label="Search games"
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
            {(q || tag) && (
              <p className="font-mono text-xs text-muted">
                &gt; {results.length} game{results.length === 1 ? "" : "s"}
                {tag && ` tagged #${tag}`}
                {q && ` matching “${q}”`}
              </p>
            )}
            {all.length === 0 ? (
              <p className="card p-6 text-center text-muted">No games published yet. Check back soon!</p>
            ) : results.length === 0 ? (
              <p className="card p-6 text-center text-muted">Nothing found. Try fewer words or a different tag.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((p) => (
                  <GameCard key={p.game.id} page={p} />
                ))}
              </div>
            )}
          </>
        )}
      </LoadState>
    </div>
  );
}
