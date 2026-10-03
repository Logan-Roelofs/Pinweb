/**
 * Instant on-device copies of Quick Capture notes, in localStorage.
 *
 * Firestore's offline cache saves writes too, but asynchronously and only
 * after the autosave delay. localStorage writes finish immediately, so even
 * the last few characters typed before the app is closed survive. Backups
 * are replayed into Firestore on the next app open, and removed once the
 * server has confirmed the note.
 */
export interface NoteBackup {
  noteId: string;
  /** "" until a game has been chosen for this capture. */
  gameId: string;
  text: string;
  createdAt: number;
}

const PREFIX = "pinweb:note:";

export function writeBackup(b: NoteBackup) {
  try {
    localStorage.setItem(PREFIX + b.noteId, JSON.stringify(b));
  } catch {
    // Storage full or blocked (private mode): Firestore's own cache still has it.
  }
}

export function readBackup(noteId: string): NoteBackup | null {
  try {
    const raw = localStorage.getItem(PREFIX + noteId);
    return raw ? (JSON.parse(raw) as NoteBackup) : null;
  } catch {
    return null;
  }
}

export function allBackups(): NoteBackup[] {
  const out: NoteBackup[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const b = readBackup(key.slice(PREFIX.length));
      if (b) out.push(b);
    }
  } catch {
    // ignore
  }
  return out;
}

/** Removes the backup, but only if it still holds `text` (no newer typing since). */
export function clearBackup(noteId: string, text: string) {
  try {
    if (readBackup(noteId)?.text === text) localStorage.removeItem(PREFIX + noteId);
  } catch {
    // ignore
  }
}

/** Drops a backup unconditionally (e.g. an empty capture that was abandoned). */
export function dropBackup(noteId: string) {
  try {
    localStorage.removeItem(PREFIX + noteId);
  } catch {
    // ignore
  }
}
