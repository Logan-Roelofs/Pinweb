import { Link } from "react-router";
import StatusBadge from "../../components/StatusBadge";
import { setStrategyStatus } from "../../data/strategies";
import { timeAgo } from "../../lib/format";
import type { Photo, Strategy } from "../../lib/types";

/** One game in admin lists, shown via its strategy page (which has the name, status, and photos). */
export default function GameRow({
  strategy: s,
  cover,
  showToggle = false,
}: {
  strategy: Strategy;
  cover?: Photo | null;
  showToggle?: boolean;
}) {
  const thumb = cover ?? s.photos[0];
  return (
    <li className="card flex items-center gap-3 p-3">
      {thumb ? (
        <img src={thumb.thumbUrl} alt="" className="size-14 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 font-mono text-matrix-dim">
          ◉
        </div>
      )}
      <Link to={`/admin/games/${s.id}`} className="min-w-0 flex-1 text-text no-underline hover:no-underline">
        <div className="truncate font-semibold">{s.gameName}</div>
        <div className="truncate text-sm text-muted">
          {s.excerpt ? `${s.excerpt.slice(0, 60)}${s.excerpt.length > 60 ? "…" : ""} · ` : ""}
          {timeAgo(s.updatedAt)}
        </div>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
        <StatusBadge status={s.status} />
        {showToggle && (
          <button className="btn btn-sm" onClick={() => setStrategyStatus(s, s.status === "published" ? "draft" : "published")}>
            {s.status === "published" ? "Unpublish" : "Publish"}
          </button>
        )}
      </div>
    </li>
  );
}
