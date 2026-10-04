import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import type { Editor as TiptapEditor } from "@tiptap/react";
import NotesPanel from "../../components/NotesPanel";
import BackglassSearch from "../../components/editor/BackglassSearch";
import { downloadBackglass, type BackglassResult } from "../../lib/backglass";
import { PhotosContext } from "../../components/editor/PhotosContext";
import PhotoManager from "../../components/PhotoManager";
import RichTextEditor from "../../components/RichTextEditor";
import StatusBadge from "../../components/StatusBadge";
import { createGame, deleteGame, newGameId, setGamePhoto, subscribeGame, updateGame } from "../../data/games";
import { setStrategyPhotos, setStrategyStatus, subscribeStrategy, updateStrategy } from "../../data/strategies";
import { saveStatusLabel, useAutosave, type SaveStatus } from "../../hooks/useAutosave";
import { useGames } from "../../hooks/useLive";
import { formatDate } from "../../lib/format";
import { deletePhotoFiles, uploadPhoto } from "../../lib/photos";
import { makeExcerpt } from "../../lib/richText";
import type { Game, Strategy } from "../../lib/types";
import { errorMessage, reportError } from "../../lib/writes";

/**
 * /admin/games/:id edits a game. /admin/games/new opens the same editor,
 * empty: the game is created as soon as it has a name, and the URL then
 * switches to its id without reloading the editor (so typing isn't interrupted).
 */
export default function GameEditor() {
  const { id: param = "" } = useParams();
  const location = useLocation();
  // Identifies one "new game" session, carried across the URL switch. Only
  // sessions from this page load count: browsers keep history state across a
  // reload, and a reloaded page should just load the saved game.
  const carried = (location.state as { freshKey?: string } | null)?.freshKey;
  const freshKey = param === "new" ? location.key : carried && freshSessions.has(carried) ? carried : undefined;
  return <Loader key={freshKey ? `new:${freshKey}` : param} param={param} freshKey={freshKey} />;
}

/** freshKey → the id reserved for that new game. In memory only. */
const freshSessions = new Map<string, string>();

function Loader({ param, freshKey }: { param: string; freshKey?: string }) {
  const [freshId] = useState(() => {
    if (!freshKey) return "";
    const id = freshSessions.get(freshKey) ?? newGameId();
    freshSessions.set(freshKey, id);
    return id;
  });
  const isFresh = !!freshKey;
  const id = isFresh ? freshId : param;
  const [game, setGame] = useState<Game | null | undefined>(undefined);
  const [strategy, setStrategy] = useState<Strategy | null | undefined>(undefined);

  useEffect(() => {
    const offGame = subscribeGame(id, setGame);
    const offStrategy = subscribeStrategy(id, setStrategy);
    return () => {
      offGame();
      offStrategy();
    };
  }, [id]);

  if (!isFresh) {
    if (game === undefined || strategy === undefined) return <p className="text-muted">Loading…</p>;
    if (!game || !strategy)
      return (
        <p>
          Game not found. <Link to="/admin/games">Back to list</Link>
        </p>
      );
  }
  return <Editor id={id} game={game ?? null} strategy={strategy ?? null} freshKey={freshKey} />;
}

/**
 * Text fields are edited locally and autosaved (their initial values come
 * from the first load). Photos, status, and cover stay live from Firestore.
 * `game`/`strategy` are null for a new game that hasn't been saved yet.
 */
function Editor({
  id,
  game,
  strategy,
  freshKey,
}: {
  id: string;
  game: Game | null;
  strategy: Strategy | null;
  freshKey?: string;
}) {
  const navigate = useNavigate();
  const allGames = useGames();
  const [createdHere, setCreatedHere] = useState(false);
  // Declared before the autosaves so it's cleared first on unmount: a final
  // save while leaving the page must not navigate back here.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const exists = !!game || createdHere;

  // Game info
  const [name, setName] = useState(game?.name ?? "");
  const [manufacturer, setManufacturer] = useState(game?.manufacturer ?? "");
  const [year, setYear] = useState(game?.year ? String(game.year) : "");

  // Strategy text
  const editorRef = useRef<TiptapEditor | null>(null);
  const [body, setBody] = useState({ json: strategy?.body ?? "", excerpt: strategy?.excerpt ?? "" });
  const text = useMemo(() => ({ body: body.json, excerpt: body.excerpt }), [body]);
  const latestText = useRef(text);
  latestText.current = text;

  // A new game can't reuse an existing game's name (one page per game).
  const duplicate = !exists ? allGames?.find((g) => g.nameLower === name.trim().toLowerCase()) : undefined;

  const info = useMemo(() => ({ name, manufacturer, year }), [name, manufacturer, year]);
  const infoSave = useAutosave(info, (f) => {
    if (!f.name.trim()) return Promise.resolve();
    const input = { name: f.name, manufacturer: f.manufacturer || null, year: f.year ? Number(f.year) : null };
    if (exists) return updateGame(id, input);
    if (duplicate) return Promise.resolve();
    // First save of a new game: create it with everything typed so far.
    createGame(input, { id, ...latestText.current });
    if (mounted.current) {
      setCreatedHere(true);
      navigate(`/admin/games/${id}`, { replace: true, state: { freshKey } });
    }
    return Promise.resolve();
  });
  // Text typed before the game has a name is included when it's created.
  const textSave = useAutosave(text, (f) => (exists ? updateStrategy(id, f) : Promise.resolve()));

  const status = strategy?.status ?? "draft";
  const published = status === "published";

  // Backglass lookup: the chosen image becomes the cover photo. For a game
  // that isn't saved yet, it waits until the game has been created.
  const [lookingUp, setLookingUp] = useState(false);
  const [incomingCover, setIncomingCover] = useState<File | null>(null);

  async function applyBackglass(result: BackglassResult, { fillDetails }: { fillDetails: boolean }) {
    setLookingUp(false);
    if (!name.trim()) setName(result.gameName);
    if (fillDetails) {
      if (!manufacturer && result.manufacturer) setManufacturer(result.manufacturer);
      if (!year && result.year) setYear(String(result.year));
    }
    try {
      setIncomingCover(await downloadBackglass(result));
    } catch (err) {
      reportError(`Couldn't get that backglass: ${errorMessage(err)}`, err);
    }
  }

  async function handleDelete() {
    if (!game || !confirm(`Delete “${game.name}”, its strategy, and all its photos? This can't be undone.`)) return;
    await deleteGame(game, strategy).catch((err) => reportError("Couldn't delete game", err));
    navigate("/admin/games", { replace: true });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/games" className="font-mono text-sm">
          ← All games
        </Link>
        {exists ? (
          <SaveIndicator statuses={[infoSave.status, textSave.status]} />
        ) : (
          <span className="font-mono text-xs text-draft">Not saved yet: give the game a name</span>
        )}
      </div>

      {exists && strategy && (
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <StatusBadge status={status} />
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
      )}

      <div>
        <label className="label" htmlFor="name">
          Game name
        </label>
        <input
          id="name"
          className="input text-lg font-semibold"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Medieval Madness"
          required
          maxLength={100}
          autoFocus={!exists}
        />
        {duplicate ? (
          <p className="mt-1 text-sm text-draft">
            “{duplicate.name}” already has a page. <Link to={`/admin/games/${duplicate.id}`}>Open it →</Link>
          </p>
        ) : (
          exists && !name.trim() && <p className="mt-1 text-sm text-draft">A name is required. Changes won't save until it has one.</p>
        )}
        <button type="button" className="btn btn-sm mt-2" onClick={() => setLookingUp(true)}>
          🔍 Find backglass
        </button>
      </div>

      {lookingUp && (
        <BackglassSearch
          initialQuery={name}
          offerDetails={!manufacturer || !year}
          onConfirm={applyBackglass}
          onClose={() => setLookingUp(false)}
        />
      )}

      <div>
        <span className="label">Strategy</span>
        <PhotosContext.Provider value={strategy?.photos ?? []}>
          <RichTextEditor
            initialBody={strategy?.body ?? ""}
            onChange={(json, plain) => setBody({ json, excerpt: makeExcerpt(plain) })}
            onReady={(e) => (editorRef.current = e)}
          />
        </PhotosContext.Provider>
      </div>

      {exists && (
        <NotesPanel
          gameId={id}
          photos={strategy?.photos ?? []}
          onInsert={(noteText, photoIds) => {
            const content: object[] = noteText
              .split(/\n+/)
              .filter((line) => line.trim())
              .map((line) => ({ type: "paragraph", content: [{ type: "text", text: line }] }));
            // The note's photos come along as a photo row right under its text.
            if (photoIds.length > 0) content.push({ type: "photoRow", attrs: { photoIds } });
            editorRef.current?.chain().focus("end").insertContent(content).run();
          }}
        />
      )}

      <div>
        <span className="label">Photos</span>
        {exists ? (
          <PhotoManager
            gameId={id}
            photos={strategy?.photos ?? []}
            onChange={(photos) => setStrategyPhotos(id, photos)}
          />
        ) : (
          <p className="text-sm text-muted">Name the game to add photos.</p>
        )}
      </div>

      <section className="card space-y-4 p-4">
        <h2 className="font-mono text-sm text-muted uppercase">Details (optional)</h2>
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
        {game ? (
          <CoverPhoto
            game={game}
            incoming={incomingCover}
            onIncomingHandled={() => setIncomingCover(null)}
            onFindBackglass={() => setLookingUp(true)}
          />
        ) : (
          <p className="text-sm text-muted">
            {incomingCover
              ? "Backglass chosen. It becomes the cover as soon as the game is saved (give it a name)."
              : "Name the game to add a cover photo, or use 🔍 Find backglass above."}
          </p>
        )}
      </section>

      {game && (
        <div className="border-t border-line pt-6">
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete game
          </button>
        </div>
      )}
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
function CoverPhoto({
  game,
  incoming,
  onIncomingHandled,
  onFindBackglass,
}: {
  game: Game;
  /** A confirmed backglass waiting to become the cover. */
  incoming: File | null;
  onIncomingHandled: () => void;
  onFindBackglass: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  // Upload a confirmed backglass (once, even if React runs the effect twice).
  const handled = useRef<File | null>(null);
  useEffect(() => {
    if (!incoming || handled.current === incoming) return;
    handled.current = incoming;
    change(incoming).finally(onIncomingHandled);
  });

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
          <button type="button" className="btn btn-sm" onClick={onFindBackglass} disabled={progress !== null}>
            🔍 Find backglass
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
