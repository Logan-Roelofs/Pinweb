import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/db";
import { deletePhotoFiles } from "../lib/photos";
import type { Game, Photo, Strategy } from "../lib/types";
import { trackWrite } from "../lib/writes";
import { fromSnap } from "./convert";

const games = collection(db, "games");

export interface GameInput {
  name: string;
  manufacturer: string | null;
  year: number | null;
}

/** Live list of all games, A→Z. Returns an unsubscribe function. */
export function subscribeGames(onChange: (games: Game[]) => void, onError?: (err: Error) => void) {
  return onSnapshot(
    query(games, orderBy("nameLower")),
    (snap) => onChange(snap.docs.map((d) => fromSnap<Game>(d))),
    onError,
  );
}

/** Live updates for one game. */
export function subscribeGame(id: string, onChange: (g: Game | null) => void) {
  return onSnapshot(doc(games, id), (snap) => onChange(snap.exists() ? fromSnap<Game>(snap) : null));
}

export async function getGame(id: string): Promise<Game | null> {
  const snap = await getDoc(doc(games, id));
  return snap.exists() ? fromSnap<Game>(snap) : null;
}

/** A new game id, made on the device (works offline). */
export function newGameId(): string {
  return doc(games).id;
}

/**
 * Creates a game together with its draft strategy page (optionally with text
 * already written) and returns the id right away. Works offline; the write
 * syncs when the connection is back.
 */
export function createGame(
  input: GameInput,
  options: { id?: string; body?: string; excerpt?: string } = {},
): string {
  const gameRef = options.id ? doc(games, options.id) : doc(games);
  const data = cleanInput(input);
  const batch = writeBatch(db);
  batch.set(gameRef, { ...data, photo: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  batch.set(doc(db, "strategies", gameRef.id), {
    gameId: gameRef.id,
    gameName: data.name,
    body: options.body ?? "",
    excerpt: options.excerpt ?? "",
    photos: [],
    status: "draft",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: null,
  });
  trackWrite(batch.commit(), "new game");
  return gameRef.id;
}

/** Updates a game's info, and the name copy on its strategy page. */
export function updateGame(id: string, input: GameInput): Promise<void> {
  const data = cleanInput(input);
  const batch = writeBatch(db);
  batch.update(doc(games, id), { ...data, updatedAt: serverTimestamp() });
  batch.update(doc(db, "strategies", id), { gameName: data.name });
  return trackWrite(batch.commit(), "game info");
}

export function setGamePhoto(id: string, photo: Photo | null): Promise<void> {
  return trackWrite(updateDoc(doc(games, id), { photo, updatedAt: serverTimestamp() }), "game photo");
}

/** Deletes a game, its strategy page, its notes, and all their photos. */
export async function deleteGame(game: Game, strategy: Strategy | null): Promise<void> {
  await Promise.all([...(strategy?.photos ?? []), ...(game.photo ? [game.photo] : [])].map(deletePhotoFiles));
  const notes = await getDocs(collection(db, "strategies", game.id, "notes"));
  const batch = writeBatch(db);
  notes.forEach((n) => batch.delete(n.ref));
  batch.delete(doc(db, "strategies", game.id));
  batch.delete(doc(games, game.id));
  await trackWrite(batch.commit(), "game deletion");
}

function cleanInput(input: GameInput) {
  const name = input.name.trim().slice(0, 100);
  return {
    name,
    nameLower: name.toLowerCase(),
    manufacturer: input.manufacturer?.trim() || null,
    year: input.year && Number.isInteger(input.year) ? input.year : null,
  };
}
