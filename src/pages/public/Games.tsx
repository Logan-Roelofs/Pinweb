import { useState } from "react";
import { Link } from "react-router";
import LoadState from "../../components/LoadState";
import { getAllGames, getAllPublished } from "../../data/public";
import { useLoad, useTitle } from "../../hooks/useLoad";

export default function Games() {
  useTitle("Games");
  const [filter, setFilter] = useState("");
  // Only list games that have at least one published strategy.
  const state = useLoad(async () => {
    const [games, strategies] = await Promise.all([getAllGames(), getAllPublished()]);
    const counts = new Map<string, number>();
    strategies.forEach((s) => counts.set(s.gameId, (counts.get(s.gameId) ?? 0) + 1));
    return games.filter((g) => counts.has(g.id)).map((g) => ({ ...g, count: counts.get(g.id)! }));
  }, []);

  const q = filter.trim().toLowerCase();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-glow">Games</h1>
      <input
        className="input"
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter games…"
        aria-label="Filter games"
      />
      <LoadState state={state}>
        {(games) => {
          const shown = games.filter(
            (g) => !q || g.nameLower.includes(q) || g.manufacturer?.toLowerCase().includes(q),
          );
          if (games.length === 0) return <p className="card p-6 text-center text-muted">No games with published strategies yet.</p>;
          if (shown.length === 0) return <p className="text-muted">No games match “{filter}”.</p>;
          return (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((g) => (
                <li key={g.id}>
                  <Link
                    to={`/games/${g.id}`}
                    className="card flex h-full overflow-hidden text-text no-underline transition hover:border-matrix-dim hover:no-underline hover:shadow-glow"
                  >
                    {g.photo ? (
                      <img src={g.photo.thumbUrl} alt="" loading="lazy" className="w-28 shrink-0 bg-surface-2 object-cover" />
                    ) : (
                      <div className="flex w-28 shrink-0 items-center justify-center bg-surface-2 font-mono text-3xl text-matrix-dim">
                        ◉
                      </div>
                    )}
                    <div className="flex min-w-0 flex-col justify-center gap-1 p-4">
                      <span className="text-lg font-semibold">{g.name}</span>
                      <span className="text-sm text-muted">{[g.manufacturer, g.year].filter(Boolean).join(" · ")}</span>
                      <span className="font-mono text-xs text-matrix">
                        {g.count} strateg{g.count === 1 ? "y" : "ies"}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          );
        }}
      </LoadState>
    </div>
  );
}
