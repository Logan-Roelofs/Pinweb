import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import PhotoManager from "../../components/PhotoManager";
import RichTextEditor from "../../components/RichTextEditor";
import StatusBadge from "../../components/StatusBadge";
import TagInput from "../../components/TagInput";
import { deleteGame, setGamePhoto, subscribeGame, updateGame } from "../../data/games";
import { addStrategyPhoto, setStrategyPhotos, setStrategyStatus, subscribeStrategy, updateStrategy } from "../../data/strategies";
import { saveStatusLabel, useAutosave, type SaveStatus } from "../../hooks/useAutosave";
import { formatDate } from "../../lib/format";
import { deletePhotoFiles, uploadPhoto } from "../../lib/photos";
import { makeExcerpt } from "../../lib/richText";
import type { Game, Strategy } from "../../lib/types";
import { errorMessage, reportError } from "../../lib/writes";

/** Loads a game and its strategy page live, then shows the editor for both. */
export default function GameEditor() {
  const { id = "" } = useParams();
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const [strategy, setStrategy] = useState<Strategy | null | undefined>(undefined);

  useEffect(() => {
    setGame(undefined);
    setStrategy(undefined);
    const offGame = subscribeGame(id, setGame);
    const offStrategy = subscribeStrategy(id, setStrategy);
    return () => {
      offGame();
      offStrategy();
    };
  }, [id]);

  if (game === undefined || strategy === undefined) return <p className="text-muted">Loading…</p>;
  if (!game || !strategy)
    return (
      <p>
        Game not found. <Link to="/admin/games">Back to list</Link>
      </p>
    );
  return <Editor key={id} game={game} strategy={strategy} />;
}

/**
 * Text fields are edited locally and autosaved (their initial values come
 * from the first load). Photos, status, and cover stay live from Firestore.
 */
function Editor({ game, strategy }: { game: Game; strategy: Strategy }) {
  const navigate = useNavigate();
  const id = game.id;

  // Game info
  const [name, setName] = useState(game.name);
  const [manufacturer, setManufacturer] = useState(game.manufacturer ?? "");
  const [year, setYear] = useState(game.year ? String(game.year) : "");
  const info = useMemo(() => ({ name, manufacturer, year }), [name, manufacturer, year]);
  const infoSave = useAutosave(info, (f) =>
    f.name.trim()
      ? updateGame(id, { name: f.name, manufacturer: f.manufacturer || null, year: f.year ? Number(f.year) : null })
      : Promise.resolve(),
  );

  // Strategy text
  const [body, setBody] = useState({ json: strategy.body, excerpt: strategy.excerpt });
  const [tags, setTags] = useState(strategy.tags);
  const text = useMemo(() => ({ body: body.json, excerpt: body.excerpt, tags }), [body, tags]);
  const textSave = useAutosave(text, (f) => updateStrategy(id, f));

  const published = strategy.status === "published";

  async function handleDelete() {
    if (!confirm(`Delete “${game.name}”, its strategy, and all its photos? This can't be undone.`)) return;
    await deleteGame(game, strategy).catch((err) => reportError("Couldn't delete game", err));
    navigate("/admin/games", { replace: true });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/games" className="font-mono text-sm">
          ← All games
        </Link>
        <SaveIndicator statuses={[infoSave.status, textSave.status]} />
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <StatusBadge status={strategy.status} />
        <span className="flex-1 text-sm text-muted">
          {published ? `Visible to everyone · first published ${formatDate(strategy.publishedAt)}` : "Only you can see this"}
        </span>
        <Link to={`/games/${id}`} className="btn">
          {published ? "View" : "Preview"}
        </Link>
        <button
          className={`btn ${published ? "" : "btn-primary"}`}
          onClick={() => setStrategyStatus(strategy, published ? "draft" : "published")}
        >
          {published ? "Unpublish" : "Publish"}
        </button>
      </div>

      <section className="space-y-4">
        <div>
          <label className="label" htmlFor="name">
            Game name
          </label>
          <input
            id="name"
            className="input text-lg font-semibold"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
          />
          {!name.trim() && <p className="mt-1 text-sm text-draft">A name is required. Changes won't save until it has one.</p>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label" htmlFor="manufacturer">
              Manufacturer
            </label>
            <input
              id="manufacturer"
              className="input"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="Stern, Williams…"
              maxLength={100}
            />
          </div>
          <div>
            <label className="label" htmlFor="year">
              Year
            </label>
            <input
              id="year"
              className="input"
              type="number"
              inputMode="numeric"
              min={1930}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
        </div>
        <CoverPhoto game={game} />
      </section>

      <div>
        <span className="label">Strategy</span>
        <RichTextEditor
          initialBody={strategy.body}
          onChange={(json, plain) => setBody({ json, excerpt: makeExcerpt(plain) })}
        />
      </div>

      <div>
        <span className="label">Photos</span>
        <PhotoManager
          photos={strategy.photos}
          folder={`strategies/${id}`}
          onAdd={(p) => addStrategyPhoto(id, p)}
          onChange={(photos) => setStrategyPhotos(id, photos)}
        />
      </div>

      <div>
        <span className="label">Tags</span>
        <TagInput tags={tags} onChange={setTags} />
      </div>

      <div className="border-t border-line pt-6">
        <button className="btn btn-danger" onClick={handleDelete}>
          Delete game
        </button>
      </div>
    </div>
  );
}

function SaveIndicator({ statuses }: { statuses: SaveStatus[] }) {
  const order: SaveStatus[] = ["error", "offline", "saving", "pending", "saved", "idle"];
  const worst = order.find((s) => statuses.includes(s)) ?? "idle";
  return (
    <span className={`font-mono text-xs ${worst === "error" ? "text-red-300" : "text-muted"}`} aria-live="polite">
      {saveStatusLabel(worst)}
    </span>
  );
}

/** The game's cover photo, shown at the top of its public page and on cards. */
function CoverPhoto({ game }: { game: Game }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function change(file: File) {
    setProgress(0);
    try {
      const photo = await uploadPhoto(file, `games/${game.id}`, setProgress);
      const old = game.photo;
      await setGamePhoto(game.id, photo);
      if (old) deletePhotoFiles(old).catch(() => {});
    } catch (err) {
      reportError(`Couldn't upload photo: ${errorMessage(err)}`, err);
    } finally {
      setProgress(null);
    }
  }

  async function remove() {
    if (!game.photo || !confirm("Remove the cover photo?")) return;
    const old = game.photo;
    await setGamePhoto(game.id, null);
    deletePhotoFiles(old).catch(() => {});
  }

  return (
    <div>
      <span className="label">Cover photo</span>
      <div className="flex items-center gap-3">
        {game.photo ? (
          <img src={game.photo.thumbUrl} alt="" className="h-20 w-28 rounded-md border border-line object-cover" />
        ) : (
          <div className="flex h-20 w-28 items-center justify-center rounded-md border border-dashed border-line text-xs text-muted">
            none
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button type="button" className="btn btn-sm" onClick={() => input.current?.click()} disabled={progress !== null}>
            {progress !== null ? `Uploading ${Math.round(progress * 100)}%` : game.photo ? "Replace" : "Add cover"}
          </button>
          {game.photo && (
            <button type="button" className="btn btn-sm btn-danger" onClick={remove}>
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) change(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
