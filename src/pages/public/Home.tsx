import { Link } from "react-router";
import GameCard from "../../components/GameCard";
import LoadState from "../../components/LoadState";
import MatrixRain from "../../components/MatrixRain";
import TagChip from "../../components/TagChip";
import { getPublishedGamePages } from "../../data/public";
import { useLoad, useTitle } from "../../hooks/useLoad";
import { SUGGESTED_TAGS } from "../../lib/types";

export default function Home() {
  useTitle(undefined);
  // Newest edits first.
  const recent = useLoad(() => getPublishedGamePages().then((pages) => pages.slice(0, 12)), []);

  return (
    <div className="space-y-12">
      <section className="card relative overflow-hidden p-6 shadow-glow sm:p-10">
        {/* Rain fades out toward the left so it never sits behind the text; on
            narrow screens the text fills the width, so it's left out there. */}
        <MatrixRain className="hidden opacity-40 [mask-image:linear-gradient(to_left,black_5%,transparent_45%)] sm:block" />
        <div className="relative">
        <p className="font-mono text-sm text-muted">&gt; booting pinweb...</p>
        <h1 className="mt-3 text-3xl font-bold text-glow sm:text-5xl">Pinball strategy, decoded.</h1>
        <p className="mt-4 max-w-prose text-lg leading-relaxed">
          One page per machine: multiball setups, wizard-mode routes, and skill-shot tips, written at the machine.
        </p>
        <div className="mt-6">
          <Link to="/games" className="btn btn-primary">
            Browse all games
          </Link>
        </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-sm tracking-wide text-muted uppercase">Jump to a tag</h2>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TAGS.map((t) => (
            <TagChip key={t} tag={t} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">Recently updated</h2>
        <LoadState state={recent}>
          {(pages) =>
            pages.length === 0 ? (
              <p className="card p-6 text-center text-muted">No games published yet. Check back soon!</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pages.map((p) => (
                  <GameCard key={p.game.id} page={p} />
                ))}
              </div>
            )
          }
        </LoadState>
      </section>
    </div>
  );
}
