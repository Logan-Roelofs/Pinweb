import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Note } from "../lib/types";
import { trackWrite } from "../lib/writes";
import { fromSnap } from "./convert";

/**
 * Quick Capture notes: strategies/{gameId}/notes/{noteId}. Each capture
 * visit is its own note. Admin only; never shown publicly.
 */
const notesOf = (gameId: string) => collection(db, "strategies", gameId, "notes");

export function newNoteId(): string {
  return doc(notesOf("_")).id;
}

/** Live list of a game's notes, newest first. */
export function subscribeNotes(gameId: string, onChange: (notes: Note[]) => void) {
  return onSnapshot(query(notesOf(gameId), orderBy("createdAt", "desc")), (snap) =>
    onChange(snap.docs.map((d) => fromSnap<Note>(d))),
  );
}

/** Live updates for one note (null until it exists). */
export function subscribeNote(gameId: string, noteId: string, onChange: (note: Note | null) => void) {
  return onSnapshot(doc(notesOf(gameId), noteId), (snap) => onChange(snap.exists() ? fromSnap<Note>(snap) : null));
}

/**
 * Creates or updates a note's text, and bumps the game's page so it shows
 * first under "Pick up where you left off". Works offline (queued by Firestore).
 */
export function saveNote(gameId: string, noteId: string, text: string, createdAt: number): Promise<void> {
  const batch = writeBatch(db);
  batch.set(
    doc(notesOf(gameId), noteId),
    { text, createdAt: Timestamp.fromMillis(createdAt), updatedAt: serverTimestamp() },
    { merge: true },
  );
  batch.update(doc(db, "strategies", gameId), { updatedAt: serverTimestamp() });
  return trackWrite(batch.commit(), "note");
}

/** Marks a note as added to the strategy text (it stays, dimmed, until deleted). */
export function markNoteMerged(gameId: string, noteId: string): Promise<void> {
  return trackWrite(updateDoc(doc(notesOf(gameId), noteId), { mergedAt: serverTimestamp() }), "note");
}

export function deleteNote(gameId: string, noteId: string): Promise<void> {
  return trackWrite(deleteDoc(doc(notesOf(gameId), noteId)), "note deletion");
}
