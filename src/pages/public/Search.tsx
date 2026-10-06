import { useEffect, useMemo } from "react";
import { logSearch } from "../../lib/analytics";
import { useSearchParams } from "react-router";
import GuidesElsewhere from "../../components/GuidesElsewhere";
import GameCard from "../../components/GameCard";
import LoadState from "../../components/LoadState";
import { getPublishedGamePages } from "../../data/public";
import { useLoad, useTitle } from "../../hooks/useLoad";

/**
 * Search this site's guides (by game, manufacturer, or year) and, for any
 * search, the other guide sites too. Firestore has no full-text search, so
 * this loads every published page once and filters in the browser.
 */
export default function Search() {
  useTitle("Search");
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

  // Record what people search for (once they've stopped typing).
  useEffect(() => {
    const timer = window.setTimeout(() => logSearch(q), 1500);
    return () => window.clearTimeout(timer);
  }, [q]);

  const all = useMemo(() => (state.status === "ready" ? state.data : []), [state]);
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return all.filter(({ game }) => {
      const haystack = `${game.nameLower} ${(game.manufacturer ?? "").toLowerCase()} ${game.year ?? ""}`;
      return words.every((w) => haystack.includes(w));
    });
  }, [all, q]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-glow">Search</h1>
      <input
        className="input"
        type="search"
        value={q}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Game, manufacturer, or year…"
        aria-label="Search guides"
        autoFocus
      />

      {!q.trim() ? (
        <p className="font-mono text-sm text-muted">
          &gt; searches Logan's Balls, Bob's Guide, the Pinball Primer, and Pinball Cards.
        </p>
      ) : (
        <LoadState state={state}>
          {() => (
            <>
              {results.length > 0 && (
                <>
                  <p className="font-mono text-xs text-muted">
                    &gt; {results.length} guide{results.length === 1 ? "" : "s"} on Logan's Balls matching “{q}”
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {results.map((p) => (
                      <GameCard key={p.game.id} page={p} />
                    ))}
                  </div>
                </>
              )}
              <GuidesElsewhere query={q.trim()} foundHere={results.length > 0} />
            </>
          )}
        </LoadState>
      )}
    </div>
  );
}
