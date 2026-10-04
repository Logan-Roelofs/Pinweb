import { useEffect, useState } from "react";
import { BOBS_GUIDE_SEARCH_URL, findOnBobsGuide, type BobsGuideMatch } from "../lib/bobsGuide";

/**
 * Shown when a search finds nothing on this site: links to the matching
 * game pages on Bob's Guide to Classic Pinball Machines (opens a new tab).
 */
export default function BobsGuideSuggestions({ query }: { query: string }) {
  const [matches, setMatches] = useState<BobsGuideMatch[] | null>(null);
  const [failed, setFailed] = useState(false);

  // Look the name up a moment after typing stops.
  useEffect(() => {
    setMatches(null);
    setFailed(false);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      findOnBobsGuide(query, controller.signal).then(setMatches, (err) => {
        if ((err as Error).name !== "AbortError") setFailed(true);
      });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const external = { target: "_blank", rel: "noopener noreferrer" } as const;

  return (
    <div className="card space-y-3 p-5">
      <p className="font-mono text-sm text-muted">
        &gt; “{query}” isn't on Logan's Balls yet.
      </p>
      <p className="text-sm">
        Try <strong>Bob's Guide to Classic Pinball Machines</strong>, which has strategies for hundreds of classic games
        (1960s to mid-80s):
      </p>

      {matches === null && !failed && <p className="font-mono text-xs text-muted">&gt; looking it up…</p>}

      {matches && matches.length > 0 && (
        <ul className="space-y-2">
          {matches.map((m) => (
            <li key={m.url}>
              <a
                href={m.url}
                {...external}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-3 py-3 no-underline transition hover:border-matrix hover:no-underline hover:shadow-glow"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-text">{m.name}</span>
                  <span className="block truncate text-xs text-muted">{m.details}</span>
                </span>
                <span className="shrink-0 font-mono text-sm text-matrix">Bob's Guide ↗</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {(failed || matches?.length === 0) && (
        <p className="text-sm text-muted">
          {failed ? "Couldn't look that up right now." : "No classic machine matches that name."} You can still search
          Bob's Guide yourself:
        </p>
      )}

      <a href={BOBS_GUIDE_SEARCH_URL} {...external} className="btn btn-sm">
        Open Bob's Guide search ↗
      </a>
    </div>
  );
}
