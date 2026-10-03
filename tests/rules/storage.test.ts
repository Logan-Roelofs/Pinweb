import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";
import { ADMIN_UID, createTestEnv, strategyData } from "./setup";

let env: RulesTestEnvironment;

const jpeg = (bytes = 1024) => new Uint8Array(bytes);
const asJpeg = { contentType: "image/jpeg" };

beforeAll(async () => {
  env = await createTestEnv();
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "strategies/pub"), strategyData("pub", { status: "published" }));
    await setDoc(doc(ctx.firestore(), "strategies/draft"), strategyData("draft", { status: "draft" }));
    const storage = ctx.storage();
    await uploadBytes(ref(storage, "strategies/pub/p1.jpg"), jpeg(), asJpeg);
    await uploadBytes(ref(storage, "strategies/draft/p1.jpg"), jpeg(), asJpeg);
    await uploadBytes(ref(storage, "games/g1/cover.jpg"), jpeg(), asJpeg);
  });
});

const publicStorage = () => env.unauthenticatedContext().storage();
const strangerStorage = () => env.authenticatedContext("someone-else").storage();
const adminStorage = () => env.authenticatedContext(ADMIN_UID).storage();

describe("public visitors", () => {
  it("can view game photos and published strategy photos", async () => {
    await assertSucceeds(getBytes(ref(publicStorage(), "games/g1/cover.jpg")));
    await assertSucceeds(getBytes(ref(publicStorage(), "strategies/pub/p1.jpg")));
  });

  it("cannot view draft strategy photos", async () => {
    await assertFails(getBytes(ref(publicStorage(), "strategies/draft/p1.jpg")));
  });

  it("cannot upload or delete", async () => {
    await assertFails(uploadBytes(ref(publicStorage(), "strategies/pub/p2.jpg"), jpeg(), asJpeg));
    await assertFails(deleteObject(ref(publicStorage(), "games/g1/cover.jpg")));
  });

  it("cannot read files outside the known folders", async () => {
    await assertFails(getBytes(ref(publicStorage(), "other/file.jpg")));
  });
});

describe("signed-in users who are not the admin", () => {
  it("cannot upload or see drafts", async () => {
    await assertFails(uploadBytes(ref(strangerStorage(), "games/g1/x.jpg"), jpeg(), asJpeg));
    await assertFails(getBytes(ref(strangerStorage(), "strategies/draft/p1.jpg")));
  });
});

describe("admin", () => {
  it("can view draft photos", async () => {
    await assertSucceeds(getBytes(ref(adminStorage(), "strategies/draft/p1.jpg")));
  });

  it("can upload images and delete them", async () => {
    const photo = ref(adminStorage(), "strategies/draft/p2.jpg");
    await assertSucceeds(uploadBytes(photo, jpeg(), asJpeg));
    await assertSucceeds(uploadBytes(ref(adminStorage(), "games/g1/x.webp"), jpeg(), { contentType: "image/webp" }));
    await assertSucceeds(deleteObject(photo));
  });

  it("cannot upload non-images", async () => {
    await assertFails(uploadBytes(ref(adminStorage(), "strategies/draft/x.html"), jpeg(), { contentType: "text/html" }));
    await assertFails(uploadBytes(ref(adminStorage(), "games/g1/x.svg"), jpeg(), { contentType: "image/svg+xml" }));
  });

  it("cannot upload images of 5 MB or more", async () => {
    await assertFails(uploadBytes(ref(adminStorage(), "strategies/draft/big.jpg"), jpeg(5 * 1024 * 1024), asJpeg));
  });

  it("cannot write outside the known folders", async () => {
    await assertFails(uploadBytes(ref(adminStorage(), "other/file.jpg"), jpeg(), asJpeg));
  });
});
