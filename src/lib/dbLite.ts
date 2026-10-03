import { connectFirestoreEmulator, getFirestore } from "firebase/firestore/lite";
import { app, useEmulators } from "./firebase";

/**
 * Firestore "lite" for the public pages: a much smaller download that does
 * simple one-off reads (no offline cache or live updates, which visitors
 * don't need). If the admin is signed in, its requests carry the sign-in,
 * so drafts can be previewed.
 */
export const dbLite = getFirestore(app);

if (useEmulators) connectFirestoreEmulator(dbLite, "127.0.0.1", 8080);
