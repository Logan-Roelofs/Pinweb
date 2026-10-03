import { useState } from "react";
import { Link, useParams } from "react-router";
import Lightbox from "../../components/Lightbox";
import LoadState from "../../components/LoadState";
import PhotoGallery from "../../components/PhotoGallery";
import RichTextView from "../../components/RichTextView";
import TagChip from "../../components/TagChip";
import { getVisibleGamePage } from "../../data/public";
import { useAuth } from "../../hooks/useAuth";
import { useLoad, useTitle } from "../../hooks/useLoad";
import { formatDate } from "../../lib/format";
import NotFound from "./NotFound";

/** A game's strategy page. */
export default function GameDetail() {
  const { id = "" } = useParams();
  const { isAdmin, user } = useAuth();
  // Reload once auth is known, so the admin can preview drafts here.
  const state = useLoad(() => getVisibleGamePage(id), [id, user?.uid]);
  const [coverOpen, setCoverOpen] = useState(false);
  useTitle(state.status === "ready" ? (state.data?.game.name ?? "Not found") : undefined);

  return (
    <LoadState state={state}>
      {(page) => {
        if (!page) return <NotFound />;
        const { game, strategy: s } = page;
        return (
          <article className="mx-auto max-w-3xl space-y-8">
            {s.status !== "published" && (
              <p className="rounded-lg border border-draft/40 bg-draft/10 px-4 py-2 font-mono text-sm text-draft">
                Draft preview: only you can see this page.
              </p>
            )}

            <Link to="/games" className="font-mono text-sm">
              ← All games
            </Link>

            <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {game.photo && (
                <button
                  onClick={() => setCoverOpen(true)}
                  className="shrink-0 overflow-hidden rounded-xl border border-line hover:shadow-glow"
                  aria-label={`View ${game.name} photo full size`}
                >
                  <img src={game.photo.thumbUrl} alt="" className="h-44 w-full object-cover sm:w-60" />
                </button>
              )}
              <div className="space-y-3">
                <h1 className="text-3xl leading-tight font-bold text-glow sm:text-4xl">{game.name}</h1>
                {(game.manufacturer || game.year) && (
                  <p className="font-mono text-sm tracking-wide text-muted uppercase">
                    {[game.manufacturer, game.year].filter(Boolean).join(" · ")}
                  </p>
                )}
                {s.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {s.tags.map((t) => (
                      <TagChip key={t} tag={t} />
                    ))}
                  </div>
                )}
                <p className="font-mono text-xs text-muted">Updated {formatDate(s.updatedAt)}</p>
                {isAdmin && (
                  <Link to={`/admin/games/${game.id}`} className="btn btn-sm">
                    ✎ Edit
                  </Link>
                )}
              </div>
            </header>

            {s.body ? (
              <RichTextView body={s.body} />
            ) : (
              <p className="text-muted italic">Strategy coming soon.</p>
            )}

            {s.photos.length > 0 && (
              <section>
                <h2 className="mb-3 font-mono text-sm tracking-wide text-muted uppercase">
                  Photos <span className="normal-case">· tap to enlarge</span>
                </h2>
                <PhotoGallery photos={s.photos} />
              </section>
            )}

            {coverOpen && game.photo && (
              <Lightbox photos={[game.photo]} index={0} onIndexChange={() => {}} onClose={() => setCoverOpen(false)} />
            )}
          </article>
        );
      }}
    </LoadState>
  );
}
