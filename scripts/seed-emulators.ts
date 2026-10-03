/**
 * Fills the LOCAL emulators with a test admin account and sample data.
 * Never touches real Firebase (it only talks to the "demo-pinweb" emulator project).
 *
 *   npm run emulators      (terminal 1)
 *   npm run seed           (terminal 2)
 *
 * Then log in at http://localhost:5173/admin with the test login below.
 */
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { ADMIN_UID } from "../src/lib/admin.ts";

const PROJECT = "demo-pinweb";
const TEST_ADMIN = { email: "admin@pinweb.test", password: "pinball-local-only" };

// 1. Create the admin account with the real admin UID, so the rules recognise it.
const res = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
  body: JSON.stringify({ localId: ADMIN_UID, ...TEST_ADMIN }),
});
if (!res.ok && !(await res.text()).includes("DUPLICATE")) throw new Error(`Auth emulator: ${res.status}`);

// 2. Sample games and strategies.
const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: "127.0.0.1", port: 8080 } });
const now = Timestamp.now();
const ago = (days: number) => Timestamp.fromMillis(now.toMillis() - days * 86400000);

const games = [
  { id: "medieval-madness", name: "Medieval Madness", manufacturer: "Williams", year: 1997 },
  { id: "attack-from-mars", name: "Attack from Mars", manufacturer: "Bally", year: 1995 },
  { id: "godzilla", name: "Godzilla", manufacturer: "Stern", year: 2021 },
];

const body = (...blocks: object[]) => JSON.stringify({ type: "doc", content: blocks });
const h2 = (text: string) => ({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] });
const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const bullets = (...items: string[]) => ({
  type: "bulletList",
  content: items.map((t) => ({ type: "listItem", content: [p(t)] })),
});

const strategies = [
  {
    id: "mm-castle",
    gameId: "medieval-madness",
    title: "Destroy the castle fast",
    tags: ["multiball", "beginner"],
    status: "published",
    days: 1,
    body: body(
      h2("The plan"),
      p("Raise the drawbridge, then hit the castle gate until it breaks."),
      bullets("Skill shot: plunge softly for the left ramp", "Trap up on the right flipper before shooting the gate"),
    ),
  },
  {
    id: "afm-total",
    gameId: "attack-from-mars",
    title: "Stroke of Luck and Total Annihilation",
    tags: ["wizard-mode", "advanced"],
    status: "published",
    days: 5,
    body: body(h2("Getting there"), p("Destroy every saucer and conquer all the cities.")),
  },
  {
    id: "godzilla-draft",
    gameId: "godzilla",
    title: "Building the mechagodzilla route",
    tags: ["multiball"],
    status: "draft",
    days: 0,
    body: body(p("Rough notes: the building shots light super jackpot?")),
  },
];

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  for (const g of games) {
    const { id, ...data } = g;
    await setDoc(doc(db, "games", id), { ...data, nameLower: data.name.toLowerCase(), photo: null, createdAt: now, updatedAt: now });
  }
  for (const s of strategies) {
    const { id, days, ...data } = s;
    const game = games.find((g) => g.id === data.gameId)!;
    await setDoc(doc(db, "strategies", id), {
      ...data,
      gameName: game.name,
      titleLower: data.title.toLowerCase(),
      excerpt: [...data.body.matchAll(/"text":"([^"]*)"/g)].map((m) => m[1]).join(" "),
      photos: [],
      createdAt: ago(days + 1),
      updatedAt: ago(days),
      publishedAt: data.status === "published" ? ago(days) : null,
    });
  }
});
await env.cleanup();

console.log(`Seeded ${games.length} games and ${strategies.length} strategies.`);
console.log(`Admin login: ${TEST_ADMIN.email} (password in scripts/seed-emulators.ts)`);
