import { useMemo } from "react";
import { useSearchParams } from "react-router";
import GuidesElsewhere from "../../components/GuidesElsewhere";
import GameCard from "../../components/GameCard";
import LoadState from "../../components/LoadState";
import { getPublishedGamePages } from "../../data/public";
import { useLoad, useTitle } from "../../hooks/useLoad";

/**
 * All published games, A→Z, with search (name, manufacturer, or year).
 * Firestore has no full-text search, so this loads every published page once
 * and filters in the browser. Fast and simple at this site's size.
 */
export default function Games() {
  useTitle("Games");
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const state = useLoad(
    () => getPublishedGamePages().then((pages) => pages.sort((a, b) => a.game.nameLower.localeCompare(b.game.nameLower))),
    [],
  );

  const setQuery = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set("q", value);
    else next.delete("q");
    setParams(next, { replace: true });
  };

  const all = useMemo(() => (state.status === "ready" ? state.data : []), [state]);
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return all.filter(({ game }) => {
      const haystack = `${game.nameLower} ${(game.manufacturer ?? "").toLowerCase()} ${game.year ?? ""}`;
      return words.every((w) => haystack.includes(w));
    });
  }, [all, q]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-glow">Games</h1>
      <input
        className="input"
        type="search"
        value={q}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by game, manufacturer, or year…"
        aria-label="Search games"
      />

      <LoadState state={state}>
        {() => (
          <>
            {q && (
              <p className="font-mono text-xs text-muted">
                &gt; {results.length} game{results.length === 1 ? "" : "s"} matching “{q}”
              </p>
            )}
            {results.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((p) => (
                  <GameCard key={p.game.id} page={p} />
                ))}
              </div>
            ) : (
              !q && <p className="card p-6 text-center text-muted">No games published yet. Check back soon!</p>
            )}
            {/* Any search also checks the other guide sites, so this is one place to look. */}
            {q.trim() && <GuidesElsewhere query={q.trim()} foundHere={results.length > 0} />}
          </>
        )}
      </LoadState>
    </div>
  );
}
