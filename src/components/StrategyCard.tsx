import { Link } from "react-router";
import { timeAgo } from "../lib/format";
import type { Strategy } from "../lib/types";
import TagChip from "./TagChip";

export default function StrategyCard({ strategy: s, showGame = true }: { strategy: Strategy; showGame?: boolean }) {
  const photo = s.photos[0];
  return (
    <article className="card group relative flex flex-col overflow-hidden transition hover:border-matrix-dim hover:shadow-glow">
      {photo && (
        <img
          src={photo.thumbUrl}
          alt=""
          loading="lazy"
          className="aspect-[16/9] w-full border-b border-line bg-surface-2 object-cover"
        />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {showGame && <p className="font-mono text-xs tracking-wide text-matrix uppercase">{s.gameName}</p>}
        <h3 className="font-sans text-lg leading-snug font-semibold text-text">
          {/* The link covers the whole card (see ::after) so it's easy to tap. */}
          <Link
            to={`/strategies/${s.id}`}
            className="text-text no-underline after:absolute after:inset-0 hover:no-underline group-hover:text-matrix-soft"
          >
            {s.title || "Untitled"}
          </Link>
        </h3>
        {s.excerpt && <p className="line-clamp-3 text-sm text-muted">{s.excerpt}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          {s.tags.slice(0, 3).map((t) => (
            <TagChip key={t} tag={t} />
          ))}
          <span className="ml-auto font-mono text-xs text-muted">{timeAgo(s.updatedAt)}</span>
        </div>
      </div>
    </article>
  );
}
