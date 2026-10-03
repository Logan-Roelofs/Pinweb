import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { useAllStrategies, useGames } from "../../hooks/useLive";
import StrategyRow from "./StrategyRow";

export default function StrategyList() {
  const strategies = useAllStrategies();
  const games = useGames();
  // Filters live in the URL so they survive reloads and the back button.
  const [params, setParams] = useSearchParams();
  const gameId = params.get("game") ?? "";
  const status = params.get("status") ?? "";

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const filtered = useMemo(
    () => strategies?.filter((s) => (!gameId || s.gameId === gameId) && (!status || s.status === status)),
    [strategies, gameId, status],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Strategies</h1>
        <Link to="/admin/strategies/new" className="btn btn-primary btn-sm">
          + New strategy
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <select className="input" value={gameId} onChange={(e) => setFilter("game", e.target.value)} aria-label="Filter by game">
          <option value="">All games</option>
          {games?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select className="input" value={status} onChange={(e) => setFilter("status", e.target.value)} aria-label="Filter by status">
          <option value="">Drafts and published</option>
          <option value="draft">Drafts only</option>
          <option value="published">Published only</option>
        </select>
      </div>

      {!filtered ? (
        <p className="text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted">No strategies match.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => (
            <StrategyRow key={s.id} strategy={s} showToggle />
          ))}
        </ul>
      )}
    </div>
  );
}
