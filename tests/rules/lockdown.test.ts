import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, it } from "vitest";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadString, getBytes } from "firebase/storage";

// Phase 1 rules deny everything. Phase 2 replaces this file with real tests.
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-pinweb",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
    storage: { rules: readFileSync("storage.rules", "utf8"), host: "127.0.0.1", port: 9199 },
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe("phase 1 lockdown", () => {
  it("blocks anonymous Firestore reads and writes", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "strategies/x")));
    await assertFails(setDoc(doc(db, "strategies/x"), { title: "nope" }));
  });

  it("blocks signed-in Firestore writes", async () => {
    const db = env.authenticatedContext("someone").firestore();
    await assertFails(setDoc(doc(db, "games/x"), { name: "nope" }));
  });

  it("blocks Storage reads and uploads", async () => {
    const storage = env.unauthenticatedContext().storage();
    await assertFails(uploadString(ref(storage, "x.txt"), "nope"));
    await assertFails(getBytes(ref(storage, "x.txt")));
  });
});
