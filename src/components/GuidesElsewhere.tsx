import { useEffect, useState } from "react";
import {
  BOBS_GUIDE_SEARCH_URL,
  CARDS_URL,
  findGuidesElsewhere,
  PRIMER_LIST_URL,
  type GuideLink,
  type GuidesElsewhere as Results,
} from "../lib/guides";

/**
 * Guides for the searched game on other sites (Bob's Guide, Pinball Primer,
 * Pinball Cards), shown under the search results. Links open in a new tab.
 */
export default function GuidesElsewhere({ query, foundHere }: { query: string; foundHere: boolean }) {
  const [results, setResults] = useState<Results | null>(null);
  const [failed, setFailed] = useState(false);

  // Look the name up a moment after typing stops.
  useEffect(() => {
    setResults(null);
    setFailed(false);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      findGuidesElsewhere(query, controller.signal).then(setResults, (err) => {
        if ((err as Error).name !== "AbortError") setFailed(true);
      });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const total = results ? results.bobs.length + results.primer.length + results.cards.length : 0;

  return (
    <section className="card space-y-4 p-5">
      <div>
        {!foundHere && <p className="font-mono text-sm text-muted">&gt; “{query}” isn't on Logan's Balls yet.</p>}
        <h2 className={`text-lg font-bold ${foundHere ? "" : "mt-2"}`}>{foundHere ? "Also elsewhere" : "Guides elsewhere"}</h2>
      </div>

      {results === null && !failed && <p className="font-mono text-xs text-muted">&gt; checking other guide sites…</p>}
      {failed && <p className="text-sm text-muted">Couldn't check other sites right now.</p>}
      {results && total === 0 && <p className="text-sm text-muted">No guides found on the other sites for “{query}”.</p>}

      {results && (
        <>
          <Site name="Bob's Guide to Classic Pinball Machines" links={results.bobs} />
          <Site name="The Pinball Primer" links={results.primer} />
          <Site name="JLP's Pinball Cards" links={results.cards} />
        </>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <span className="w-full text-xs text-muted">Browse them yourself:</span>
        <External href={BOBS_GUIDE_SEARCH_URL}>Bob's Guide search ↗</External>
        <External href={PRIMER_LIST_URL}>Pinball Primer list ↗</External>
        <External href={CARDS_URL}>Pinball Cards ↗</External>
      </div>
    </section>
  );
}

function Site({ name, links }: { name: string; links: GuideLink[] }) {
  if (links.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 font-mono text-xs tracking-wide text-muted uppercase">{name}</h3>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.url}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-3 py-3 no-underline transition hover:border-matrix hover:no-underline hover:shadow-glow"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-text">{l.title}</span>
                <span className="block truncate text-xs text-muted">{l.details}</span>
              </span>
              <span className="shrink-0 font-mono text-sm text-matrix">↗</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function External({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
      {children}
    </a>
  );
}
