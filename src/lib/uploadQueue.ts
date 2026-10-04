import { createStore, del, entries, get, set } from "idb-keyval";
import { arrayUnion, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { db } from "./db";
import { storage } from "./storage";
import { compressImage, newPhotoId } from "./photos";
import type { Photo } from "./types";

/**
 * A durable photo upload queue, kept in IndexedDB on the device.
 *
 * 1. As soon as a photo is picked, the ORIGINAL file is saved here, before
 *    anything else, so closing the app right after taking it loses nothing.
 * 2. It's then compressed on the device (the original is dropped).
 * 3. When online, it's uploaded (with progress) and added to the game's page.
 *    Only then is it removed from the queue.
 *
 * Uploads can't continue while the app is closed (browsers don't allow
 * that), and an interrupted upload restarts from the beginning next time the
 * app is open. The queue retries when the app opens, when the connection
 * comes back, and every 30 seconds while anything is waiting.
 *
 * Items captured before a game is chosen have gameId "" and wait until
 * assignGame() is called.
 */
export interface QueueItem {
  id: string;
  gameId: string;
  /** Quick Capture note this photo belongs to, if any. */
  noteId: string;
  createdAt: number;
  original?: Blob;
  full?: Blob;
  thumb?: Blob;
  width?: number;
  height?: number;
  attempts: number;
  error?: string;
}

export interface QueueState {
  items: QueueItem[];
  /** Upload progress 0–1 for the item currently uploading. */
  progress: Record<string, number>;
  online: boolean;
}

const store = createStore("pinweb-uploads", "items");
let state: QueueState = { items: [], progress: {}, online: navigator.onLine };
const listeners = new Set<(s: QueueState) => void>();
let running = false;
let rerun = false;
let retryTimer: number | undefined;
let started = false;

function emit(patch: Partial<QueueState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

async function reload() {
  const all = (await entries<string, QueueItem>(store)).map(([, item]) => item);
  emit({ items: all.sort((a, b) => a.createdAt - b.createdAt) });
}

export function subscribeQueue(listener: (s: QueueState) => void): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

/** Starts processing (call once when the admin is signed in). Safe to call again. */
export function startQueue() {
  if (!started) {
    started = true;
    window.addEventListener("online", () => {
      emit({ online: true });
      kick();
    });
    window.addEventListener("offline", () => emit({ online: false }));
    // Ask the browser not to clear our stored data under storage pressure.
    navigator.storage?.persist?.().catch(() => {});
  }
  reload().then(kick);
}

/** Saves the picked photo on the device right away, then processes the queue. */
export async function enqueuePhoto(file: Blob, target: { gameId: string; noteId?: string }): Promise<string> {
  const item: QueueItem = {
    id: newPhotoId(),
    gameId: target.gameId,
    noteId: target.noteId ?? "",
    createdAt: Date.now(),
    original: file,
    attempts: 0,
  };
  await set(item.id, item, store);
  await reload();
  kick();
  return item.id;
}

/** Gives photos captured before a game was chosen their game. */
export async function assignGame(noteId: string, gameId: string) {
  for (const item of state.items.filter((i) => i.noteId === noteId && !i.gameId)) {
    await set(item.id, { ...item, gameId }, store);
  }
  await reload();
  kick();
}

/** Removes a waiting photo without uploading it. */
export async function discardQueued(id: string) {
  await del(id, store);
  await reload();
}

/** Process the queue now (e.g. after a new photo or the connection returning). */
export function kick() {
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  window.clearTimeout(retryTimer);
  process()
    .catch((err) => console.error("Upload queue", err))
    .finally(() => {
      running = false;
      if (rerun) {
        rerun = false;
        kick();
      } else if (state.items.length > 0) {
        retryTimer = window.setTimeout(kick, 30_000);
      }
    });
}

async function process() {
  for (const { id } of [...state.items]) {
    let item = await get<QueueItem>(id, store);
    if (!item) continue;

    // Compress first, even offline (it all happens on the device).
    if (!item.full && item.original) {
      try {
        const original = new File([item.original], "photo", { type: item.original.type });
        const { full, thumb, width, height } = await compressImage(original);
        item = { ...item, full, thumb, width, height, original: undefined };
        await set(id, item, store);
        await reload();
      } catch (err) {
        await fail(item, `Couldn't read this image: ${String(err)}`);
        continue;
      }
    }

    if (!item.gameId || !navigator.onLine || !item.full || !item.thumb) continue;

    try {
      const photo = await uploadItem(item);
      await attachPhoto(item, photo);
      await del(id, store);
      const { [id]: _done, ...progress } = state.progress;
      emit({ progress });
      await reload();
    } catch (err) {
      await fail(item, String((err as { code?: string }).code ?? err));
    }
  }
}

async function fail(item: QueueItem, error: string) {
  await set(item.id, { ...item, attempts: item.attempts + 1, error }, store);
  const { [item.id]: _failed, ...progress } = state.progress;
  emit({ progress });
  await reload();
}

function uploadBlob(path: string, blob: Blob, onBytes: (n: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), blob, {
      contentType: "image/jpeg",
      cacheControl: "public, max-age=31536000, immutable",
    });
    task.on(
      "state_changed",
      (snap) => onBytes(snap.bytesTransferred),
      reject,
      () => getDownloadURL(task.snapshot.ref).then(resolve, reject),
    );
  });
}

/** Uploads to fixed paths, so a retried upload just overwrites the same files. */
async function uploadItem(item: QueueItem): Promise<Photo> {
  const full = item.full!;
  const thumb = item.thumb!;
  const folder = `strategies/${item.gameId}`;
  const path = `${folder}/${item.id}.jpg`;
  const thumbPath = `${folder}/${item.id}_thumb.jpg`;
  const total = full.size + thumb.size;
  let a = 0;
  let b = 0;
  const report = () => emit({ progress: { ...state.progress, [item.id]: (a + b) / total } });
  const [url, thumbUrl] = await Promise.all([
    uploadBlob(path, full, (n) => ((a = n), report())),
    uploadBlob(thumbPath, thumb, (n) => ((b = n), report())),
  ]);
  return { id: item.id, path, url, thumbPath, thumbUrl, width: item.width ?? 0, height: item.height ?? 0 };
}

/** Adds the uploaded photo to the game's page (once) and to its capture note. */
async function attachPhoto(item: QueueItem, photo: Photo) {
  const strategyRef = doc(db, "strategies", item.gameId);
  const current = await getDoc(strategyRef);
  const photos = (current.data()?.photos ?? []) as Photo[];
  if (!photos.some((p) => p.id === photo.id)) {
    // Not awaited past the local write: Firestore keeps it queued if the signal drops now.
    void updateDoc(strategyRef, { photos: arrayUnion(photo), updatedAt: serverTimestamp() }).catch((err) =>
      console.error("Couldn't add photo to page", err),
    );
  }
  if (item.noteId) {
    void updateDoc(doc(db, "strategies", item.gameId, "notes", item.noteId), {
      photoIds: arrayUnion(photo.id),
      updatedAt: serverTimestamp(),
    }).catch(() => {
      // The note may have been deleted; the photo is still on the page.
    });
  }
}
