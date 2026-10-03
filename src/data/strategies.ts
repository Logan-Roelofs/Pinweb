import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { deletePhotoFiles } from "../lib/photos";
import type { Photo, Strategy, StrategyStatus } from "../lib/types";
import { trackWrite } from "../lib/writes";
import { fromSnap } from "./convert";

const strategies = collection(db, "strategies");

/** Admin only: live list of every strategy (drafts included), newest edits first. */
export function subscribeAllStrategies(onChange: (list: Strategy[]) => void, onError?: (err: Error) => void) {
  return onSnapshot(
    query(strategies, orderBy("updatedAt", "desc")),
    (snap) => onChange(snap.docs.map((d) => fromSnap<Strategy>(d))),
    onError,
  );
}

export async function getStrategy(id: string): Promise<Strategy | null> {
  const snap = await getDoc(doc(strategies, id));
  return snap.exists() ? fromSnap<Strategy>(snap) : null;
}

/** Live updates for one strategy. */
export function subscribeStrategy(id: string, onChange: (s: Strategy | null) => void) {
  return onSnapshot(doc(strategies, id), (snap) => onChange(snap.exists() ? fromSnap<Strategy>(snap) : null));
}

/** Creates a draft and returns its id immediately (works offline). */
export function createStrategy(input: { gameId: string; gameName: string; title: string }): string {
  const ref = doc(strategies);
  const title = input.title.trim().slice(0, 200);
  trackWrite(
    setDoc(ref, {
      gameId: input.gameId,
      gameName: input.gameName,
      title,
      titleLower: title.toLowerCase(),
      body: "",
      excerpt: "",
      photos: [],
      tags: [],
      status: "draft",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: null,
    }),
    "new strategy",
  );
  return ref.id;
}

export type StrategyEdits = Partial<Pick<Strategy, "gameId" | "gameName" | "title" | "body" | "excerpt" | "tags">>;

export function updateStrategy(id: string, edits: StrategyEdits): Promise<void> {
  const data: Record<string, unknown> = { ...edits, updatedAt: serverTimestamp() };
  if (edits.title !== undefined) {
    data.title = edits.title.slice(0, 200);
    data.titleLower = edits.title.trim().toLowerCase().slice(0, 200);
  }
  return trackWrite(updateDoc(doc(strategies, id), data), "strategy");
}

export function setStrategyStatus(strategy: Strategy, status: StrategyStatus): Promise<void> {
  return trackWrite(
    updateDoc(doc(strategies, strategy.id), {
      status,
      updatedAt: serverTimestamp(),
      // Remember when it was first published.
      ...(status === "published" && !strategy.publishedAt ? { publishedAt: serverTimestamp() } : {}),
    }),
    status === "published" ? "publish" : "unpublish",
  );
}

export function addStrategyPhoto(id: string, photo: Photo): Promise<void> {
  return trackWrite(
    updateDoc(doc(strategies, id), { photos: arrayUnion(photo), updatedAt: serverTimestamp() }),
    "photo",
  );
}

/** Replaces the photo list (used for reordering and removing). */
export function setStrategyPhotos(id: string, photos: Photo[]): Promise<void> {
  return trackWrite(updateDoc(doc(strategies, id), { photos, updatedAt: serverTimestamp() }), "photos");
}

/** Deletes a strategy, its photos, and its notes. */
export async function deleteStrategy(strategy: Strategy): Promise<void> {
  await Promise.all(strategy.photos.map(deletePhotoFiles));
  const notes = await getDocs(collection(strategies, strategy.id, "notes"));
  const batch = writeBatch(db);
  notes.forEach((n) => batch.delete(n.ref));
  batch.delete(doc(strategies, strategy.id));
  await trackWrite(batch.commit(), "strategy deletion");
}
