import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { useAllStrategies, useGames } from "../../hooks/useLive";
import GameRow from "./GameRow";

export default function GameList() {
  const strategies = useAllStrategies();
  const games = useGames();
  // Filters live in the URL so they survive reloads and the back button.
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "";

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const covers = useMemo(() => new Map(games?.map((g) => [g.id, g.photo])), [games]);
  const filtered = useMemo(
    () =>
      strategies
        ?.filter((s) => (!status || s.status === status) && s.gameName.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => a.gameName.localeCompare(b.gameName)),
    [strategies, q, status],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Games</h1>
        <div className="flex gap-2">
          <Link to="/admin/import" className="btn btn-sm">
            Import
          </Link>
          <Link to="/admin/games/new" className="btn btn-primary btn-sm">
            + New game
          </Link>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className="input"
          type="search"
          value={q}
          onChange={(e) => setFilter("q", e.target.value)}
          placeholder="Search games…"
          aria-label="Search games"
        />
        <select className="input" value={status} onChange={(e) => setFilter("status", e.target.value)} aria-label="Filter by status">
          <option value="">Drafts and published</option>
          <option value="draft">Drafts only</option>
          <option value="published">Published only</option>
        </select>
      </div>

      {!filtered ? (
        <p className="text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted">{strategies?.length ? "No games match." : "No games yet. Add your first one!"}</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => (
            <GameRow key={s.id} strategy={s} cover={covers.get(s.id)} showToggle />
          ))}
        </ul>
      )}
    </div>
  );
}
