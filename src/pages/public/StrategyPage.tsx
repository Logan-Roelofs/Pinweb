import { Link, useParams } from "react-router";
import LoadState from "../../components/LoadState";
import PhotoGallery from "../../components/PhotoGallery";
import RichTextView from "../../components/RichTextView";
import TagChip from "../../components/TagChip";
import { getVisibleStrategy } from "../../data/public";
import { useAuth } from "../../hooks/useAuth";
import { useLoad, useTitle } from "../../hooks/useLoad";
import { formatDate } from "../../lib/format";
import NotFound from "./NotFound";

export default function StrategyPage() {
  const { id = "" } = useParams();
  const { isAdmin, user } = useAuth();
  // Reload once auth is known, so the admin can preview drafts here.
  const state = useLoad(() => getVisibleStrategy(id), [id, user?.uid]);
  useTitle(state.status === "ready" ? (state.data?.title ?? "Not found") : undefined);

  return (
    <LoadState state={state}>
      {(s) =>
        !s ? (
          <NotFound />
        ) : (
          <article className="mx-auto max-w-3xl space-y-8">
            {s.status !== "published" && (
              <p className="rounded-lg border border-draft/40 bg-draft/10 px-4 py-2 font-mono text-sm text-draft">
                Draft preview: only you can see this page.
              </p>
            )}

            <header className="space-y-3">
              <Link to={`/games/${s.gameId}`} className="font-mono text-sm tracking-wide uppercase">
                {s.gameName}
              </Link>
              <h1 className="text-3xl leading-tight font-bold text-glow sm:text-4xl">{s.title || "Untitled"}</h1>
              <p className="font-mono text-xs text-muted">Updated {formatDate(s.updatedAt)}</p>
              {s.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {s.tags.map((t) => (
                    <TagChip key={t} tag={t} />
                  ))}
                </div>
              )}
              {isAdmin && (
                <Link to={`/admin/strategies/${s.id}`} className="btn btn-sm">
                  ✎ Edit
                </Link>
              )}
            </header>

            <RichTextView body={s.body} />

            {s.photos.length > 0 && (
              <section>
                <h2 className="mb-3 font-mono text-sm tracking-wide text-muted uppercase">
                  Photos <span className="normal-case">· tap to enlarge</span>
                </h2>
                <PhotoGallery photos={s.photos} />
              </section>
            )}

            <footer className="border-t border-line pt-6">
              <Link to={`/games/${s.gameId}`} className="font-mono text-sm">
                ← More {s.gameName} strategies
              </Link>
            </footer>
          </article>
        )
      }
    </LoadState>
  );
}
