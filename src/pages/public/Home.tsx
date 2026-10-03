import { Link } from "react-router";
import LoadState from "../../components/LoadState";
import StrategyCard from "../../components/StrategyCard";
import TagChip from "../../components/TagChip";
import { getRecentStrategies } from "../../data/public";
import { useLoad, useTitle } from "../../hooks/useLoad";
import { SUGGESTED_TAGS } from "../../lib/types";

export default function Home() {
  useTitle(undefined);
  const recent = useLoad(() => getRecentStrategies(12), []);

  return (
    <div className="space-y-12">
      <section className="card relative overflow-hidden p-6 shadow-glow sm:p-10">
        <p className="font-mono text-sm text-muted">&gt; booting pinweb...</p>
        <h1 className="mt-3 text-3xl font-bold text-glow sm:text-5xl">Pinball strategy, decoded.</h1>
        <p className="mt-4 max-w-prose text-lg leading-relaxed">
          Multiball setups, wizard-mode routes, and skill-shot tips, written at the machine.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/games" className="btn btn-primary">
            Browse games
          </Link>
          <Link to="/search" className="btn">
            Search strategies
          </Link>
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
          {(list) =>
            list.length === 0 ? (
              <p className="card p-6 text-center text-muted">No strategies published yet. Check back soon!</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((s) => (
                  <StrategyCard key={s.id} strategy={s} />
                ))}
              </div>
            )
          }
        </LoadState>
      </section>
    </div>
  );
}
