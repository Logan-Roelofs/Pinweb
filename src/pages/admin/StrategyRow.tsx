import { Link } from "react-router";
import StatusBadge from "../../components/StatusBadge";
import { setStrategyStatus } from "../../data/strategies";
import type { Strategy } from "../../lib/types";
import { timeAgo } from "../../lib/format";

export default function StrategyRow({ strategy: s, showToggle = false }: { strategy: Strategy; showToggle?: boolean }) {
  return (
    <li className="card flex items-center gap-3 p-3">
      {s.photos[0] ? (
        <img src={s.photos[0].thumbUrl} alt="" className="size-14 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="size-14 shrink-0 rounded-md border border-line bg-surface-2" />
      )}
      <Link to={`/admin/strategies/${s.id}`} className="min-w-0 flex-1 text-text no-underline hover:no-underline">
        <div className="truncate font-semibold">{s.title || <span className="text-muted italic">Untitled</span>}</div>
        <div className="truncate text-sm text-muted">
          {s.gameName} · {timeAgo(s.updatedAt)}
        </div>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
        <StatusBadge status={s.status} />
        {showToggle && (
          <button
            className="btn btn-sm"
            onClick={() => setStrategyStatus(s, s.status === "published" ? "draft" : "published")}
          >
            {s.status === "published" ? "Unpublish" : "Publish"}
          </button>
        )}
      </div>
    </li>
  );
}
