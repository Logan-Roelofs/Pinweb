/**
 * The one admin account's Firebase Auth UID. A UID isn't a secret; it's
 * only an identifier. The real enforcement is the identical check in
 * firestore.rules and storage.rules. This copy only decides what the UI shows.
 *
 * If you ever change admin accounts, update all three places.
 */
export const ADMIN_UID = "coSz3U5jiVaLysbqclMsuXPGAqi2";
