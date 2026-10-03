import { useState } from "react";
import { Link, useParams } from "react-router";
import Lightbox from "../../components/Lightbox";
import LoadState from "../../components/LoadState";
import StrategyCard from "../../components/StrategyCard";
import { getPublicGame, getPublishedForGame } from "../../data/public";
import { useLoad, useTitle } from "../../hooks/useLoad";
import NotFound from "./NotFound";

export default function GameDetail() {
  const { id = "" } = useParams();
  const state = useLoad(async () => {
    const [game, strategies] = await Promise.all([getPublicGame(id), getPublishedForGame(id)]);
    return { game, strategies };
  }, [id]);
  const [photoOpen, setPhotoOpen] = useState(false);
  useTitle(state.status === "ready" ? (state.data.game?.name ?? "Not found") : undefined);

  return (
    <LoadState state={state}>
      {({ game, strategies }) =>
        !game ? (
          <NotFound />
        ) : (
          <div className="space-y-8">
            <Link to="/games" className="font-mono text-sm">
              ← All games
            </Link>
            <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {game.photo && (
                <button
                  onClick={() => setPhotoOpen(true)}
                  className="shrink-0 overflow-hidden rounded-xl border border-line hover:shadow-glow"
                  aria-label={`View ${game.name} photo full size`}
                >
                  <img src={game.photo.thumbUrl} alt="" className="h-40 w-full object-cover sm:w-56" />
                </button>
              )}
              <div>
                <h1 className="text-3xl font-bold text-glow sm:text-4xl">{game.name}</h1>
                <p className="mt-2 text-muted">{[game.manufacturer, game.year].filter(Boolean).join(" · ")}</p>
              </div>
            </header>

            <section>
              <h2 className="mb-4 text-xl font-bold">
                Strategies <span className="font-mono text-sm text-muted">({strategies.length})</span>
              </h2>
              {strategies.length === 0 ? (
                <p className="card p-6 text-center text-muted">No published strategies for this game yet.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {strategies.map((s) => (
                    <StrategyCard key={s.id} strategy={s} showGame={false} />
                  ))}
                </div>
              )}
            </section>

            {photoOpen && game.photo && (
              <Lightbox photos={[game.photo]} index={0} onIndexChange={() => {}} onClose={() => setPhotoOpen(false)} />
            )}
          </div>
        )
      }
    </LoadState>
  );
}
