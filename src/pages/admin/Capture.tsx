import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import GamePicker from "../../components/GamePicker";
import { createGame } from "../../data/games";
import { newNoteId, saveNote, subscribeNote } from "../../data/notes";
import { subscribeStrategy } from "../../data/strategies";
import { saveStatusLabel, useAutosave } from "../../hooks/useAutosave";
import { useAllStrategies, useGames } from "../../hooks/useLive";
import { useQueuedPhotos } from "../../hooks/useUploadQueue";
import { allBackups, clearBackup, dropBackup, readBackup, writeBackup } from "../../lib/noteBackup";
import type { Note, Strategy } from "../../lib/types";
import { assignGame, discardQueued, enqueuePhoto } from "../../lib/uploadQueue";
import { reportError } from "../../lib/writes";

/**
 * Quick Capture: one screen for standing at the machine.
 * Pick (or quickly add) a game, snap photos, type a note. Everything saves
 * on the device instantly and syncs when there's signal. Each visit is its
 * own timestamped note on the game's page (see the game editor to merge).
 *
 * URL: /admin/capture?note=<id>&game=<id>. Both are added automatically, so
 * reopening the same URL continues the same note.
 */
export default function Capture() {
  const [params, setParams] = useSearchParams();
  const noteParam = params.get("note");

  // Settle on a note id first: the URL's, an unfinished capture with no game, or a new one.
  useEffect(() => {
    if (noteParam) return;
    const next = new URLSearchParams(params);
    const gameParam = params.get("game");
    const unassigned = !gameParam && allBackups().find((b) => !b.gameId);
    next.set("note", unassigned ? unassigned.noteId : newNoteId());
    setParams(next, { replace: true });
  }, [noteParam, params, setParams]);

  if (!noteParam) return null;
  return <CaptureSession key={noteParam} noteId={noteParam} initialGameId={params.get("game") ?? ""} />;
}

function CaptureSession({ noteId, initialGameId }: { noteId: string; initialGameId: string }) {
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();
  const backup = useMemo(() => readBackup(noteId), [noteId]);
  const [gameId, setGameId] = useState(backup?.gameId || initialGameId);
  const [createdAt] = useState(backup?.createdAt ?? Date.now());
  const [text, setText] = useState(backup?.text ?? "");
  const [loadedText, setLoadedText] = useState(!!backup);
  const [note, setNote] = useState<Note | null>(null);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const games = useGames();
  const strategies = useAllStrategies();
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  const game = games?.find((g) => g.id === gameId);

  // Continuing an existing note: load its saved text once (unless the local backup already had it).
  const textLoaded = useRef(!!backup);
  useEffect(() => {
    if (!gameId) return;
    return subscribeNote(gameId, noteId, (n) => {
      setNote(n);
      if (!textLoaded.current) {
        textLoaded.current = true;
        if (n) setText(n.text);
        setLoadedText(true);
      }
    });
  }, [gameId, noteId]);

  useEffect(() => (gameId ? subscribeStrategy(gameId, setStrategy) : undefined), [gameId]);

  const { status } = useAutosave(text, (t) => {
    if (!gameId || (!t.trim() && !note)) return Promise.resolve();
    return saveNote(gameId, noteId, t, createdAt).then(() => clearBackup(noteId, t));
  });

  function changeText(t: string) {
    setText(t);
    writeBackup({ noteId, gameId, text: t, createdAt });
  }

  function chooseGame(id: string) {
    setGameId(id);
    setParams({ note: noteId, game: id }, { replace: true });
    writeBackup({ noteId, gameId: id, text, createdAt });
    assignGame(noteId, id);
    if (text.trim()) saveNote(id, noteId, text, createdAt).then(() => clearBackup(noteId, text));
  }

  async function addFiles(files: FileList | null) {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    // Make sure the note exists so the photos can be linked to it.
    if (gameId) saveNote(gameId, noteId, text, createdAt);
    else writeBackup({ noteId, gameId, text, createdAt });
    for (const file of list) {
      await enqueuePhoto(file, { gameId, noteId }).catch((err) => reportError("Couldn't save photo on this device", err));
    }
  }

  function finish() {
    if (!gameId && !text.trim() && queued.length === 0) dropBackup(noteId);
    navigate("/admin");
  }

  // Photos from this capture: still on the device, and already uploaded.
  const queued = useQueuedPhotos((i) => i.noteId === noteId, [noteId]);
  const uploaded = useMemo(
    () => (strategy?.photos ?? []).filter((p) => note?.photoIds?.includes(p.id)),
    [strategy, note],
  );

  // Most recently edited games first.
  const gamesByRecent = useMemo(() => {
    if (!games) return [];
    const rank = new Map(strategies?.map((s, i) => [s.id, i]));
    return [...games].sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9));
  }, [games, strategies]);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-glow">⚡ Quick Capture</h1>
        <span className={`font-mono text-xs ${status === "error" ? "text-red-300" : "text-muted"}`} aria-live="polite">
          {gameId
            ? saveStatusLabel(status === "idle" && note ? "saved" : status)
            : text.trim()
              ? "Saved on device · pick a game"
              : ""}
        </span>
      </div>

      {/* Game */}
      {game ? (
        <div className="card flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <div className="label mb-0">Game</div>
            <div className="truncate text-lg font-semibold text-matrix">{game.name}</div>
          </div>
          {/* Switching is only safe before anything was saved under this game. */}
          {!note && uploaded.length === 0 && queued.length === 0 && (
            <button className="btn btn-sm" onClick={() => setGameId("")}>
              Change
            </button>
          )}
        </div>
      ) : (
        <div>
          <span className="label">Which game?</span>
          <GamePicker
            games={gamesByRecent}
            selectedId={gameId || null}
            onSelect={(g) => chooseGame(g.id)}
            onCreate={(name) => createGame({ name, manufacturer: null, year: null })}
          />
        </div>
      )}

      {/* Photos */}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn btn-primary min-h-16 text-base" onClick={() => camera.current?.click()}>
          📷 Camera
        </button>
        <button className="btn min-h-16 text-base" onClick={() => gallery.current?.click()}>
          🖼 Gallery
        </button>
      </div>
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={gallery}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {(uploaded.length > 0 || queued.length > 0) && (
        <div className="grid grid-cols-3 gap-2">
          {uploaded.map((p) => (
            <div key={p.id} className="relative overflow-hidden rounded-lg border border-line">
              <img src={p.thumbUrl} alt="" className="aspect-square w-full object-cover" />
              <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 font-mono text-[10px] text-matrix">✓</span>
            </div>
          ))}
          {queued.map(({ item, previewUrl, progress, label }) => (
            <div key={item.id} className="relative overflow-hidden rounded-lg border border-draft/50">
              {previewUrl && <img src={previewUrl} alt="" className="aspect-square w-full object-cover opacity-60" />}
              <div className="absolute inset-x-0 bottom-0 bg-black/75 p-1">
                {progress !== undefined && (
                  <div className="mb-1 h-1 overflow-hidden rounded bg-surface-2">
                    <div className="h-full bg-matrix" style={{ width: `${progress * 100}%` }} />
                  </div>
                )}
                <span className="block truncate font-mono text-[10px] text-draft">{label}</span>
              </div>
              {progress === undefined && (
                <button
                  className="absolute top-1 right-1 rounded bg-black/70 px-1.5 text-xs text-red-300"
                  aria-label="Discard this photo"
                  onClick={() => confirm("Discard this photo? It hasn't been uploaded.") && discardQueued(item.id)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Note */}
      <div>
        <label className="label" htmlFor="note">
          Note
        </label>
        <textarea
          id="note"
          className="input min-h-48 leading-relaxed"
          value={text}
          onChange={(e) => changeText(e.target.value)}
          placeholder="What did you notice? Shots, modes, timings…"
          disabled={!loadedText && !!gameId}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary flex-1" onClick={finish}>
          Done
        </button>
        {gameId && (
          <Link to={`/admin/games/${gameId}`} className="btn flex-1">
            Open full editor
          </Link>
        )}
      </div>
      <p className="text-xs text-muted">
        Everything saves as you go, even with no signal. Photos upload in the background while the app is open.
      </p>
    </div>
  );
}
