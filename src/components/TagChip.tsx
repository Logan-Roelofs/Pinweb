import { Link } from "react-router";

/** A tag that links to search results for it. `relative z-10` keeps it clickable inside cards. */
export default function TagChip({ tag, active = false }: { tag: string; active?: boolean }) {
  return (
    <Link
      to={active ? "/search" : `/search?tag=${encodeURIComponent(tag)}`}
      aria-pressed={active}
      className={`relative z-10 inline-flex min-h-7 items-center rounded-full border px-2.5 font-mono text-xs no-underline transition hover:no-underline ${
        active
          ? "border-matrix bg-matrix/15 text-matrix shadow-glow"
          : "border-matrix-dim/60 text-matrix-soft hover:border-matrix hover:shadow-glow"
      }`}
    >
      #{tag}
    </Link>
  );
}
