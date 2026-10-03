import { useMemo } from "react";
import { Link } from "react-router";
import { useAllStrategies, useGames } from "../../hooks/useLive";
import GameRow from "./GameRow";

export default function AdminHome() {
  const strategies = useAllStrategies();
  const games = useGames();
  const covers = useMemo(() => new Map(games?.map((g) => [g.id, g.photo])), [games]);
  // Already sorted by most recently edited.
  const drafts = strategies?.filter((s) => s.status === "draft") ?? [];
  const published = strategies?.filter((s) => s.status === "published") ?? [];

  return (
    <div className="space-y-8">
      <div className="card flex flex-col items-center gap-2 border-dashed p-6 text-center">
        <span className="font-mono text-lg font-bold text-muted">⚡ Quick Capture</span>
        <span className="text-sm text-muted">Coming in Phase 4. For now, use “New game”.</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <Stat label="Drafts" value={strategies ? drafts.length : "…"} />
        <Stat label="Published" value={strategies ? published.length : "…"} />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Pick up where you left off</h2>
          <Link to="/admin/games/new" className="btn btn-primary btn-sm">
            + New game
          </Link>
        </div>
        {!strategies ? (
          <p className="text-muted">Loading…</p>
        ) : drafts.length === 0 ? (
          <p className="text-muted">No drafts. Everything's published!</p>
        ) : (
          <ul className="space-y-2">
            {drafts.slice(0, 5).map((s) => (
              <GameRow key={s.id} strategy={s} cover={covers.get(s.id)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-4">
      <div className="font-mono text-3xl font-bold text-matrix text-glow">{value}</div>
      <div className="mt-1 text-xs text-muted uppercase">{label}</div>
    </div>
  );
}
