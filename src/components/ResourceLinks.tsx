import { resourceLinks } from "../lib/resources";
import type { Game } from "../lib/types";

/** "Elsewhere" links for a game: PinTips, Pinball Videos, Match Play, YouTube, OPDB, IPDB, flyer (new tabs). */
export default function ResourceLinks({ game }: { game: Game }) {
  const links = resourceLinks(game.name, game.machine);
  return (
    <nav aria-label={`${game.name} on other sites`} className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-xs tracking-wide text-muted uppercase">Elsewhere:</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-8 items-center rounded-full border border-line bg-surface-2 px-3 font-mono text-xs text-matrix-soft no-underline transition hover:border-matrix hover:no-underline hover:shadow-glow"
        >
          {l.label} ↗
        </a>
      ))}
    </nav>
  );
}
