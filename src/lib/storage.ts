import { connectStorageEmulator, getStorage } from "firebase/storage";
import { app, useEmulators } from "./firebase";

/**
 * Firebase Storage, used only for uploading and deleting photos (admin).
 * Public pages show photos by their download URLs and never load this.
 */
export const storage = getStorage(app);

// Give up on a stalled upload after 1 minute (default: 10) so the upload
// queue can mark it failed and retry later, instead of hanging on bad signal.
storage.maxUploadRetryTime = 60_000;

if (useEmulators) connectStorageEmulator(storage, "127.0.0.1", 9199);
