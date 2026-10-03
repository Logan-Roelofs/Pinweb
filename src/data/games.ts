import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { deletePhotoFiles } from "../lib/photos";
import type { Game, Photo } from "../lib/types";
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

export async function getGame(id: string): Promise<Game | null> {
  const snap = await getDoc(doc(games, id));
  return snap.exists() ? fromSnap<Game>(snap) : null;
}

/**
 * Creates a game and returns its id right away. The id is made on the device,
 * so this works offline; the write syncs when the connection is back.
 */
export function createGame(input: GameInput): string {
  const ref = doc(games);
  trackWrite(
    setDoc(ref, {
      ...cleanInput(input),
      photo: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    "game",
  );
  return ref.id;
}

/** Updates a game. If the name changed, also updates the copy on its strategies. */
export async function updateGame(id: string, input: GameInput, previousName: string): Promise<void> {
  const data = cleanInput(input);
  trackWrite(updateDoc(doc(games, id), { ...data, updatedAt: serverTimestamp() }), "game");

  if (data.name !== previousName) {
    const strategies = await getDocs(query(collection(db, "strategies"), where("gameId", "==", id)));
    const batch = writeBatch(db);
    strategies.forEach((s) => batch.update(s.ref, { gameName: data.name }));
    trackWrite(batch.commit(), "game name on strategies");
  }
}

export function setGamePhoto(id: string, photo: Photo | null): Promise<void> {
  return trackWrite(updateDoc(doc(games, id), { photo, updatedAt: serverTimestamp() }), "game photo");
}

export async function countStrategiesForGame(id: string): Promise<number> {
  const snap = await getDocs(query(collection(db, "strategies"), where("gameId", "==", id)));
  return snap.size;
}

/** Deletes a game and its photo. Callers must check it has no strategies first. */
export async function deleteGame(game: Game): Promise<void> {
  if (game.photo) await deletePhotoFiles(game.photo);
  await trackWrite(deleteDoc(doc(games, game.id)), "game deletion");
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
