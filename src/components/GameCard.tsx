import { Link } from "react-router";
import type { GamePage } from "../data/public";
import { timeAgo } from "../lib/format";
import TagChip from "./TagChip";

/** A game's strategy page as a card: photo, name, maker/year, excerpt, tags. */
export default function GameCard({ page: { game, strategy } }: { page: GamePage }) {
  const photo = game.photo ?? strategy.photos[0];
  return (
    <article className="card group relative flex flex-col overflow-hidden transition hover:border-matrix-dim hover:shadow-glow">
      {photo ? (
        <img
          src={photo.thumbUrl}
          alt=""
          loading="lazy"
          className="aspect-[16/9] w-full border-b border-line bg-surface-2 object-cover"
        />
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center border-b border-line bg-surface-2 font-mono text-4xl text-matrix-dim">
          ◉
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-sans text-lg leading-snug font-semibold text-text">
          {/* The link covers the whole card (see ::after) so it's easy to tap. */}
          <Link
            to={`/games/${game.id}`}
            className="text-text no-underline after:absolute after:inset-0 hover:no-underline group-hover:text-matrix-soft"
          >
            {game.name}
          </Link>
        </h3>
        {(game.manufacturer || game.year) && (
          <p className="font-mono text-xs tracking-wide text-muted uppercase">
            {[game.manufacturer, game.year].filter(Boolean).join(" · ")}
          </p>
        )}
        {strategy.excerpt && <p className="line-clamp-3 text-sm text-muted">{strategy.excerpt}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          {strategy.tags.slice(0, 3).map((t) => (
            <TagChip key={t} tag={t} />
          ))}
          <span className="ml-auto font-mono text-xs text-muted">{timeAgo(strategy.updatedAt)}</span>
        </div>
      </div>
    </article>
  );
}
