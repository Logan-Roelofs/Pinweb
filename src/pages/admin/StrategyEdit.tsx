import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import GamePicker from "../../components/GamePicker";
import PhotoManager from "../../components/PhotoManager";
import RichTextEditor from "../../components/RichTextEditor";
import StatusBadge from "../../components/StatusBadge";
import TagInput from "../../components/TagInput";
import { createGame } from "../../data/games";
import {
  addStrategyPhoto,
  deleteStrategy,
  getStrategy,
  setStrategyPhotos,
  setStrategyStatus,
  subscribeStrategy,
  updateStrategy,
} from "../../data/strategies";
import { saveStatusLabel, useAutosave } from "../../hooks/useAutosave";
import { useGames } from "../../hooks/useLive";
import { formatDate } from "../../lib/format";
import { makeExcerpt } from "../../lib/richText";
import type { Strategy } from "../../lib/types";
import { reportError } from "../../lib/writes";

/**
 * Loads the strategy once, then hands off to the editor. The text fields are
 * edited locally and autosaved; photos and status stay live from Firestore.
 */
export default function StrategyEdit() {
  const { id = "" } = useParams();
  const [initial, setInitial] = useState<Strategy | null | undefined>(undefined);

  useEffect(() => {
    setInitial(undefined);
    getStrategy(id).then(setInitial, (err) => {
      reportError("Couldn't load strategy", err);
      setInitial(null);
    });
  }, [id]);

  if (initial === undefined) return <p className="text-muted">Loading…</p>;
  if (initial === null)
    return (
      <p>
        Strategy not found. <Link to="/admin/strategies">Back to list</Link>
      </p>
    );
  return <Editor key={id} initial={initial} />;
}

interface TextFields {
  title: string;
  body: string;
  excerpt: string;
  tags: string[];
}

function Editor({ initial }: { initial: Strategy }) {
  const navigate = useNavigate();
  const games = useGames();
  const [live, setLive] = useState<Strategy>(initial);
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState({ json: initial.body, excerpt: initial.excerpt });
  const [tags, setTags] = useState(initial.tags);
  const [changingGame, setChangingGame] = useState(false);

  useEffect(() => subscribeStrategy(initial.id, (s) => s && setLive(s)), [initial.id]);

  const fields = useMemo<TextFields>(
    () => ({ title, body: body.json, excerpt: body.excerpt, tags }),
    [title, body, tags],
  );
  const { status } = useAutosave(fields, (f) => updateStrategy(initial.id, f));

  async function handleDelete() {
    if (!confirm(`Delete “${live.title || "Untitled"}” and all its photos? This can't be undone.`)) return;
    await deleteStrategy(live).catch((err) => reportError("Couldn't delete strategy", err));
    navigate("/admin/strategies", { replace: true });
  }

  const published = live.status === "published";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/strategies" className="font-mono text-sm">
          ← All strategies
        </Link>
        <span className={`font-mono text-xs ${status === "error" ? "text-red-300" : "text-muted"}`} aria-live="polite">
          {saveStatusLabel(status)}
        </span>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <StatusBadge status={live.status} />
        <span className="flex-1 text-sm text-muted">
          {published ? `Visible to everyone · first published ${formatDate(live.publishedAt)}` : "Only you can see this"}
        </span>
        <Link to={`/strategies/${live.id}`} className="btn">
          {published ? "View" : "Preview"}
        </Link>
        <button
          className={`btn ${published ? "" : "btn-primary"}`}
          onClick={() => setStrategyStatus(live, published ? "draft" : "published")}
        >
          {published ? "Unpublish" : "Publish"}
        </button>
      </div>

      <div>
        <label className="label" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          className="input text-lg font-semibold"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled strategy"
          maxLength={200}
        />
      </div>

      <div>
        <span className="label">Game</span>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-matrix">{live.gameName}</span>
          <button type="button" className="btn btn-sm" onClick={() => setChangingGame((v) => !v)}>
            {changingGame ? "Cancel" : "Change"}
          </button>
        </div>
        {changingGame && (
          <div className="mt-2">
            <GamePicker
              games={games ?? []}
              selectedId={live.gameId}
              onSelect={(g) => {
                updateStrategy(initial.id, { gameId: g.id, gameName: g.name });
                setChangingGame(false);
              }}
              onCreate={(name) => createGame({ name, manufacturer: null, year: null })}
            />
          </div>
        )}
      </div>

      <div>
        <span className="label">Strategy</span>
        <RichTextEditor
          initialBody={initial.body}
          onChange={(json, text) => setBody({ json, excerpt: makeExcerpt(text) })}
        />
      </div>

      <div>
        <span className="label">Photos</span>
        <PhotoManager
          photos={live.photos}
          folder={`strategies/${initial.id}`}
          onAdd={(p) => addStrategyPhoto(initial.id, p)}
          onChange={(photos) => setStrategyPhotos(initial.id, photos)}
        />
      </div>

      <div>
        <span className="label">Tags</span>
        <TagInput tags={tags} onChange={setTags} />
      </div>

      <div className="border-t border-line pt-6">
        <button className="btn btn-danger" onClick={handleDelete}>
          Delete strategy
        </button>
      </div>
    </div>
  );
}
