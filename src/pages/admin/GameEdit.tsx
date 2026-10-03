import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { countStrategiesForGame, createGame, deleteGame, getGame, setGamePhoto, updateGame } from "../../data/games";
import { deletePhotoFiles, uploadPhoto } from "../../lib/photos";
import type { Game } from "../../lib/types";
import { errorMessage, reportError } from "../../lib/writes";

/** Create (/admin/games/new) or edit (/admin/games/:id) a game. */
export default function GameEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    getGame(id).then((g) => {
      setGame(g);
      if (g) {
        setName(g.name);
        setManufacturer(g.manufacturer ?? "");
        setYear(g.year ? String(g.year) : "");
      }
      setLoading(false);
    });
  }, [id]);

  const input = () => ({ name, manufacturer: manufacturer || null, year: year ? Number(year) : null });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (isNew) {
      const newId = createGame(input());
      navigate(`/admin/games/${newId}`, { replace: true });
    } else if (game) {
      await updateGame(game.id, input(), game.name);
      navigate("/admin/games");
    }
  }

  async function changePhoto(file: File) {
    if (!game) return;
    setUploadProgress(0);
    try {
      const photo = await uploadPhoto(file, `games/${game.id}`, setUploadProgress);
      const old = game.photo;
      await setGamePhoto(game.id, photo);
      setGame({ ...game, photo });
      if (old) deletePhotoFiles(old).catch(() => {});
    } catch (err) {
      reportError(`Couldn't upload photo: ${errorMessage(err)}`, err);
    } finally {
      setUploadProgress(null);
    }
  }

  async function removePhoto() {
    if (!game?.photo || !confirm("Remove this game's photo?")) return;
    const old = game.photo;
    await setGamePhoto(game.id, null);
    setGame({ ...game, photo: null });
    deletePhotoFiles(old).catch(() => {});
  }

  async function handleDelete() {
    if (!game) return;
    const count = await countStrategiesForGame(game.id);
    if (count > 0) {
      alert(`“${game.name}” still has ${count} strateg${count === 1 ? "y" : "ies"}. Delete or move those first.`);
      return;
    }
    if (!confirm(`Delete “${game.name}”?`)) return;
    await deleteGame(game);
    navigate("/admin/games", { replace: true });
  }

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!isNew && !game) return <p>Game not found.</p>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link to="/admin/games" className="font-mono text-sm">
        ← All games
      </Link>
      <h1 className="text-2xl font-bold">{isNew ? "New game" : game!.name}</h1>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
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
        <button type="submit" className="btn btn-primary w-full" disabled={!name.trim()}>
          {isNew ? "Create game" : "Save"}
        </button>
      </form>

      {!isNew && game && (
        <>
          <section className="space-y-3">
            <span className="label">Photo</span>
            {game.photo ? (
              <img src={game.photo.url} alt={game.name} className="max-h-80 rounded-lg border border-line" />
            ) : (
              <p className="text-sm text-muted">No photo.</p>
            )}
            {uploadProgress !== null && (
              <div className="h-1.5 overflow-hidden rounded bg-surface-2">
                <div className="h-full bg-matrix shadow-glow transition-all" style={{ width: `${uploadProgress * 100}%` }} />
              </div>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) changePhoto(f);
                e.target.value = "";
              }}
            />
            <div className="flex gap-2">
              <button className="btn" onClick={() => fileInput.current?.click()} disabled={uploadProgress !== null}>
                {game.photo ? "Replace photo" : "Add photo"}
              </button>
              {game.photo && (
                <button className="btn btn-danger" onClick={removePhoto}>
                  Remove photo
                </button>
              )}
            </div>
          </section>

          <div className="border-t border-line pt-6">
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete game
            </button>
          </div>
        </>
      )}
    </div>
  );
}
