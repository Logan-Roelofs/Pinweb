import { Link } from "react-router";
import GameCard from "../../components/GameCard";
import LoadState from "../../components/LoadState";
import MatrixRain from "../../components/MatrixRain";
import { getPublishedGamePages } from "../../data/public";
import { useLoad, useTitle } from "../../hooks/useLoad";

export default function Home() {
  useTitle(undefined);
  // Newest edits first.
  const recent = useLoad(() => getPublishedGamePages().then((pages) => pages.slice(0, 12)), []);

  return (
    <div className="space-y-12">
      <section className="card relative overflow-hidden p-6 pt-24 shadow-glow sm:p-10">
        {/* The rain fades out before reaching the text: on phones it fills the
            top of the banner (hence the extra top padding); on wider screens
            it runs down the right side. */}
        <MatrixRain className="opacity-50 [mask-image:linear-gradient(to_bottom,black_0%,black_12%,transparent_38%)] sm:[mask-image:linear-gradient(to_left,black_5%,transparent_45%)]" />
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
