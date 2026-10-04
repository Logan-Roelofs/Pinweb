import { arrayUnion, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/db";
import type { Photo, Strategy, StrategyStatus } from "../lib/types";
import { trackWrite } from "../lib/writes";
import { fromSnap } from "./convert";

/**
 * Strategy pages live at strategies/{gameId}, one per game. They're created
 * and deleted together with their game (see games.ts).
 */
const strategies = collection(db, "strategies");

/** Admin only: live list of every strategy page (drafts included), newest edits first. */
export function subscribeAllStrategies(onChange: (list: Strategy[]) => void, onError?: (err: Error) => void) {
  return onSnapshot(
    query(strategies, orderBy("updatedAt", "desc")),
    (snap) => onChange(snap.docs.map((d) => fromSnap<Strategy>(d))),
    onError,
  );
}

/** Live updates for one game's strategy page. */
export function subscribeStrategy(gameId: string, onChange: (s: Strategy | null) => void) {
  return onSnapshot(doc(strategies, gameId), (snap) => onChange(snap.exists() ? fromSnap<Strategy>(snap) : null));
}

export type StrategyEdits = Partial<Pick<Strategy, "body" | "excerpt">>;

export function updateStrategy(gameId: string, edits: StrategyEdits): Promise<void> {
  return trackWrite(updateDoc(doc(strategies, gameId), { ...edits, updatedAt: serverTimestamp() }), "strategy");
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

export function addStrategyPhoto(gameId: string, photo: Photo): Promise<void> {
  return trackWrite(
    updateDoc(doc(strategies, gameId), { photos: arrayUnion(photo), updatedAt: serverTimestamp() }),
    "photo",
  );
}

/** Replaces the photo list (used for reordering and removing). */
export function setStrategyPhotos(gameId: string, photos: Photo[]): Promise<void> {
  return trackWrite(updateDoc(doc(strategies, gameId), { photos, updatedAt: serverTimestamp() }), "photos");
}
