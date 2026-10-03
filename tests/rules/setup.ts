import { readFileSync } from "node:fs";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { ADMIN_UID } from "../../src/lib/admin";

export { ADMIN_UID };

export function createTestEnv() {
  return initializeTestEnvironment({
    projectId: "demo-pinweb",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
    storage: { rules: readFileSync("storage.rules", "utf8"), host: "127.0.0.1", port: 9199 },
  });
}

export function strategyData(overrides: Record<string, unknown> = {}) {
  return {
    gameId: "g1",
    gameName: "Medieval Madness",
    title: "Castle multiball",
    titleLower: "castle multiball",
    body: "",
    excerpt: "",
    photos: [],
    tags: ["multiball"],
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: null,
    ...overrides,
  };
}
