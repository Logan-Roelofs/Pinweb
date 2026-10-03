import { useMemo } from "react";
import { Link } from "react-router";
import InstallCard from "../../components/InstallCard";
import { useAllStrategies, useGames } from "../../hooks/useLive";
import { allBackups } from "../../lib/noteBackup";
import GameRow from "./GameRow";

export default function AdminHome() {
  const strategies = useAllStrategies();
  const games = useGames();
  const covers = useMemo(() => new Map(games?.map((g) => [g.id, g.photo])), [games]);
  // Already sorted by most recently edited.
  const drafts = strategies?.filter((s) => s.status === "draft") ?? [];
  const published = strategies?.filter((s) => s.status === "published") ?? [];
  // A capture started before a game was picked, kept on this device.
  const unassigned = useMemo(() => allBackups().find((b) => !b.gameId && b.text.trim()), []);

  return (
    <div className="space-y-8">
      <Link
        to="/admin/capture"
        className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-matrix bg-matrix/10 p-6 text-center no-underline shadow-glow transition hover:bg-matrix/20 hover:no-underline hover:shadow-glow-strong"
      >
        <span className="font-mono text-3xl font-bold text-matrix text-glow">⚡ Quick Capture</span>
        <span className="text-sm text-text">Photos + notes, right at the machine</span>
      </Link>

      <InstallCard />

      {unassigned && (
        <Link to={`/admin/capture?note=${unassigned.noteId}`} className="card block border-draft/50 p-4 no-underline hover:no-underline">
          <span className="font-mono text-sm text-draft">Unfinished capture: no game picked yet →</span>
          <span className="mt-1 block truncate text-sm text-muted">{unassigned.text}</span>
        </Link>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Pick up where you left off</h2>
          <Link to="/admin/games/new" className="btn btn-sm">
            + New game
          </Link>
        </div>
        {!strategies ? (
          <p className="text-muted">Loading…</p>
        ) : drafts.length === 0 ? (
          <p className="text-muted">No drafts. Everything's published!</p>
        ) : (
          <ul className="space-y-2">
            {drafts.slice(0, 6).map((s) => (
              <GameRow key={s.id} strategy={s} cover={covers.get(s.id)} showCapture />
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 text-center">
        <Stat label="Drafts" value={strategies ? drafts.length : "…"} />
        <Stat label="Published" value={strategies ? published.length : "…"} />
      </div>
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
