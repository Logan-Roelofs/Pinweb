import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { ADMIN_UID, createTestEnv, strategyData } from "./setup";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createTestEnv();
});

afterAll(async () => {
  await env.cleanup();
});

// "pub" and "draft" are both game ids and strategy ids (one strategy per game).
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "games/pub"), { name: "Medieval Madness", nameLower: "medieval madness" });
    await setDoc(doc(db, "games/draft"), { name: "Godzilla", nameLower: "godzilla" });
    await setDoc(doc(db, "strategies/pub"), strategyData("pub", { status: "published" }));
    await setDoc(doc(db, "strategies/draft"), strategyData("draft", { status: "draft" }));
    await setDoc(doc(db, "strategies/draft/notes/n1"), { text: "secret note", photoIds: [] });
  });
});

const publicDb = () => env.unauthenticatedContext().firestore();
const strangerDb = () => env.authenticatedContext("someone-else").firestore();
const adminDb = () => env.authenticatedContext(ADMIN_UID).firestore();

describe("public visitors", () => {
  it("can read games", async () => {
    await assertSucceeds(getDoc(doc(publicDb(), "games/pub")));
  });

  it("can read a published strategy", async () => {
    await assertSucceeds(getDoc(doc(publicDb(), "strategies/pub")));
  });

  it("cannot read a draft strategy", async () => {
    await assertFails(getDoc(doc(publicDb(), "strategies/draft")));
  });

  it("can list strategies only when filtering to published", async () => {
    const strategies = collection(publicDb(), "strategies");
    await assertSucceeds(getDocs(query(strategies, where("status", "==", "published"))));
    await assertFails(getDocs(strategies));
    await assertFails(getDocs(query(strategies, where("status", "==", "draft"))));
  });

  it("cannot read notes, even on published strategies", async () => {
    await assertFails(getDoc(doc(publicDb(), "strategies/draft/notes/n1")));
    await assertFails(getDocs(collection(publicDb(), "strategies/pub/notes")));
  });

  it("cannot write anything", async () => {
    const db = publicDb();
    await assertFails(setDoc(doc(db, "games/new"), { name: "Hacked", nameLower: "hacked" }));
    await assertFails(updateDoc(doc(db, "strategies/pub"), { body: "Hacked" }));
    await assertFails(deleteDoc(doc(db, "strategies/pub")));
    await assertFails(setDoc(doc(db, "strategies/x"), strategyData("x")));
  });
});

describe("signed-in users who are not the admin", () => {
  it("are treated like the public", async () => {
    const db = strangerDb();
    await assertFails(getDoc(doc(db, "strategies/draft")));
    await assertFails(setDoc(doc(db, "games/new"), { name: "Hacked", nameLower: "hacked" }));
    await assertFails(updateDoc(doc(db, "strategies/pub"), { status: "draft" }));
    await assertFails(setDoc(doc(db, "strategies/draft/notes/n2"), { text: "x", photoIds: [] }));
  });
});

describe("admin", () => {
  it("can read drafts and notes, and list everything", async () => {
    const db = adminDb();
    await assertSucceeds(getDoc(doc(db, "strategies/draft")));
    await assertSucceeds(getDoc(doc(db, "strategies/draft/notes/n1")));
    await assertSucceeds(getDocs(collection(db, "strategies")));
  });

  it("can create, update, publish, and delete a game's strategy", async () => {
    const db = adminDb();
    await assertSucceeds(setDoc(doc(db, "strategies/new"), strategyData("new")));
    await assertSucceeds(updateDoc(doc(db, "strategies/new"), { body: "Better text" }));
    await assertSucceeds(updateDoc(doc(db, "strategies/new"), { status: "published", publishedAt: new Date() }));
    await assertSucceeds(deleteDoc(doc(db, "strategies/new")));
  });

  it("can manage games", async () => {
    const db = adminDb();
    const game = { name: "Attack from Mars", nameLower: "attack from mars", manufacturer: "Bally", year: 1995, photo: null };
    await assertSucceeds(setDoc(doc(db, "games/afm"), game));
    await assertSucceeds(deleteDoc(doc(db, "games/afm")));
  });

  it("can write notes, link photos, and mark them merged", async () => {
    const db = adminDb();
    const note = doc(db, "strategies/draft/notes/n2");
    await assertSucceeds(setDoc(note, { text: "hit the castle", createdAt: new Date(), updatedAt: new Date() }, { merge: true }));
    await assertSucceeds(updateDoc(note, { photoIds: ["p1"], updatedAt: new Date() }));
    await assertSucceeds(updateDoc(note, { mergedAt: new Date() }));
    await assertFails(updateDoc(note, { somethingElse: true }));
  });
});

describe("validation (even for admin)", () => {
  it("allows only one strategy per game (id must match gameId)", async () => {
    const db = adminDb();
    await assertFails(setDoc(doc(db, "strategies/second-one"), strategyData("pub")));
    await assertFails(updateDoc(doc(db, "strategies/pub"), { gameId: "draft" }));
  });

  it("rejects unknown strategy status", async () => {
    await assertFails(setDoc(doc(adminDb(), "strategies/bad"), strategyData("bad", { status: "secret" })));
  });

  it("rejects unexpected strategy fields", async () => {
    await assertFails(setDoc(doc(adminDb(), "strategies/bad"), strategyData("bad", { isAdmin: true })));
  });

  it("rejects games with no name or a silly year", async () => {
    const db = adminDb();
    await assertFails(setDoc(doc(db, "games/bad"), { name: "", nameLower: "" }));
    await assertFails(setDoc(doc(db, "games/bad"), { name: "X", nameLower: "x", year: 12 }));
  });
});
