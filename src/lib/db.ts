import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { app, useEmulators } from "./firebase";
// Signed-in requests need Auth registered on the app.
import "./auth";

/**
 * Full Firestore with a persistent offline cache, used by the admin pages:
 * reads work offline and writes are queued in IndexedDB until the device is
 * back online, even across closing the app. The multi-tab manager lets
 * several open tabs share it.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (useEmulators) connectFirestoreEmulator(db, "127.0.0.1", 8080);
