import { Link } from "react-router";
import { useAllStrategies, useGames } from "../../hooks/useLive";

export default function GameList() {
  const games = useGames();
  const strategies = useAllStrategies();

  const countFor = (gameId: string) => strategies?.filter((s) => s.gameId === gameId).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Games</h1>
        <Link to="/admin/games/new" className="btn btn-primary btn-sm">
          + New game
        </Link>
      </div>
      {!games ? (
        <p className="text-muted">Loading…</p>
      ) : games.length === 0 ? (
        <p className="text-muted">No games yet.</p>
      ) : (
        <ul className="space-y-2">
          {games.map((g) => (
            <li key={g.id} className="card flex items-center gap-3 p-3 hover:border-matrix-dim">
              <Link to={`/admin/games/${g.id}`} className="flex min-w-0 flex-1 items-center gap-3 text-text no-underline hover:no-underline">
                {g.photo ? (
                  <img src={g.photo.thumbUrl} alt="" className="size-12 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="size-12 shrink-0 rounded-md border border-line bg-surface-2" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{g.name}</div>
                  <div className="text-sm text-muted">{[g.manufacturer, g.year].filter(Boolean).join(" · ") || "—"}</div>
                </div>
              </Link>
              <Link to={`/admin/strategies?game=${g.id}`} className="shrink-0 font-mono text-xs">
                {countFor(g.id)} strateg{countFor(g.id) === 1 ? "y" : "ies"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
