# Pinweb

A pinball strategy site with a dark, subtle "Matrix" look. Public visitors read published strategies. The admin (one person) writes them, including from a phone while standing at the machine.

**Stack:** React + TypeScript + Vite, React Router, Tailwind CSS, Firebase (Auth, Firestore, Storage, Hosting). There is no separate server.

---

## Run it locally

You need Node.js 22+ and Java 21+ (the Firebase emulators run on Java).

```bash
npm install
cp .env.example .env     # then fill in the values (see "Firebase setup" step 4)
npm run dev              # http://localhost:5173
```

`npm run dev` talks to your **real** Firebase project, so anything you create there is real.

### Local development with the emulators (no real data touched)

The Firebase Emulator Suite runs fake Auth, Firestore, and Storage on your computer. It's safe for experimenting.

1. Terminal 1: run `npm run emulators`. The emulator dashboard is at http://localhost:4000.
2. Terminal 2: run `npm run seed`. This creates a test admin login and sample games and strategies. The test login is at the top of [scripts/seed-emulators.ts](scripts/seed-emulators.ts).
3. Terminal 2: run `npm run dev:emulators`, then open http://localhost:5173/admin.

The emulators start empty each time, so run `npm run seed` again after restarting them.

### Tests

```bash
npm run test:rules    # starts the emulators, runs the security-rules tests, stops them
npm run build         # type-checks and builds to dist/
```

To try the **installable/offline app** locally: with the emulators running and seeded, run `npm run preview:emulators` and open http://localhost:4173. The offline service worker only runs in production builds, not in `npm run dev`.

---

## Firebase setup (one time)

Do these steps in the [Firebase console](https://console.firebase.google.com).

### 1. Create the project
1. Click **Create a project** (or **Add project**).
2. Name it, e.g. `pinweb`. Firebase shows a **Project ID** under the name, e.g. `pinweb-1a2b3`. Write it down, because you'll need it a lot.
3. Google Analytics isn't needed, so you can turn it off. Click **Create project**.

### 2. Upgrade to the Blaze plan and add a budget alert
New projects need Blaze to use Cloud Storage. Blaze still has a free allowance, and a site like this should cost $0.

1. Bottom-left of the console: click **Upgrade** (next to "Spark"), then choose **Blaze**.
2. Create or link a Cloud Billing account (this needs a card).
3. When it offers a **budget alert**, set it to something like **$1**. This only *emails* you when spending passes that amount; it doesn't stop anything.
   If you missed that screen: go to [Google Cloud console → Billing → Budgets & alerts](https://console.cloud.google.com/billing/budgets), click **Create budget**, pick this project, and set the amount to $1.

### 3. Turn on the services
**Authentication**
1. Go to **Build → Authentication → Get started**.
2. Under **Sign-in method**, choose **Email/Password**, turn on the first toggle only, and click **Save**.
3. Open the **Users** tab and click **Add user**. Enter your email and a strong password.
4. Copy the **User UID** shown in the list. Phase 2 puts it into the security rules.
5. There is no sign-up page on the site, so this is the only account.
6. **Block sign-ups completely.** Even without a sign-up page, anyone could create an account by calling Firebase directly.
   - Go to **Authentication → Settings → User actions**, uncheck **Enable create (sign-up)**, and click **Save**.
   - The security rules already ignore every account except yours. This step just keeps out junk accounts.
7. If you ever replace your admin account, put the new UID in `firestore.rules`, `storage.rules`, and `src/lib/admin.ts`.

**Firestore**
1. Go to **Build → Firestore Database → Create database**.
2. Choose **Standard edition**.
3. Pick a location close to you, e.g. `nam5 (United States)`. **You can't change this later.**
4. Choose **Start in production mode**. The real rules get deployed from this repo.

**Storage**
1. Go to **Build → Storage → Get started**.
2. Choose the same region as Firestore.
3. Choose **Start in production mode**.

### 4. Register the web app (gets the config values)
1. Click the **gear icon → Project settings → General**. Scroll to **Your apps** and click the web icon **`</>`**.
2. Give it a nickname, e.g. `pinweb-web`. Leave "Firebase Hosting" unchecked. Click **Register app**.
3. You'll see a `firebaseConfig = { apiKey: ..., ... }` block. Copy each value into `.env`:

| firebaseConfig key | .env variable |
|---|---|
| apiKey | `VITE_FIREBASE_API_KEY` |
| authDomain | `VITE_FIREBASE_AUTH_DOMAIN` |
| projectId | `VITE_FIREBASE_PROJECT_ID` |
| storageBucket | `VITE_FIREBASE_STORAGE_BUCKET` |
| messagingSenderId | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| appId | `VITE_FIREBASE_APP_ID` |

These values aren't secret, since every visitor's browser receives them. The security rules are what protect your data. They stay out of git so the repo isn't tied to one project.

### 5. Create a service account for GitHub Actions to deploy with
1. In **Project settings → Service accounts**, click **Manage service account permissions**. This opens Google Cloud console in a new tab.
2. Click **+ Create service account** and name it `github-deploy`. Click **Create and continue**.
3. Add these two roles (type in the "Select a role" box), then click **Done**:
   - **Firebase Admin**
   - **Service Usage Consumer**
4. Click the new `github-deploy@...` account, open the **Keys** tab, and choose **Add key → Create new key → JSON**. A `.json` file downloads.
5. Treat that file like a password:
   - Paste it into GitHub (next step).
   - Then **delete the file** from your Downloads folder.
   - Never commit it. The `.gitignore` also blocks common service-account filenames.

### 6. Let Storage rules check Firestore (one time)
A strategy's photos are only public once the strategy is published. To check that, the Storage rules look at the strategy in Firestore. Google needs a one-time permission for this. The automatic deploy can't grant it, so do it once by hand:

1. Open [Google Cloud console → IAM](https://console.cloud.google.com/iam-admin/iam) and pick your project at the top.
2. Tick **Include Google-provided role grants** (top right of the table).
3. Find the principal named `service-<numbers>@gcp-sa-firebasestorage.iam.gserviceaccount.com` and click its pencil icon.
4. Click **Add another role**, choose **Firebase Rules Firestore Service Agent**, and click **Save**.

You'll know it's missing if photos on *published* strategies show as broken images for logged-out visitors.

---

## GitHub setup (one time)

Open the repo on GitHub and go to **Settings → Secrets and variables → Actions**.

**Secrets tab → New repository secret**

| Name | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | The **entire contents** of the downloaded JSON key file, `{` to `}` |

**Variables tab → New repository variable** (add all six, with the same values as your `.env`)

`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`

---

## Deployment

Every push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

1. `npm ci`
2. **Security-rules tests**. If any fail, nothing is deployed.
3. `npm run build`, using the repository variables above.
4. `firebase deploy --only hosting,firestore,storage`: the site, the Firestore rules and indexes, and the Storage rules.

You can follow each run in the repo's **Actions** tab, and also start one by hand there (**Deploy → Run workflow**).

The site is served at `https://<project-id>.web.app` (and `https://<project-id>.firebaseapp.com`).

**If a deploy fails with a permission error**, the service account is usually missing a role. Re-check step 5. For a "Cloud Storage for Firebase API not enabled" error, make sure you clicked **Get started** under Storage.

---

## Project layout

```
.github/workflows/deploy.yml   CI: test rules → build → deploy
firebase.json                  Hosting, rules, and emulator config
firestore.rules                Firestore security rules
storage.rules                  Storage security rules
firestore.indexes.json         Firestore composite indexes
tests/rules/                   Security-rules tests (run against the emulators)
scripts/seed-emulators.ts      Test admin + sample data for the local emulators
src/
  lib/firebase.ts              Firebase app + config (services split per page below)
  lib/auth.ts, db.ts,          Auth (loaded in background), full offline Firestore (admin),
    dbLite.ts, storage.ts        small read-only Firestore (public), photo uploads (admin)
  lib/uploadQueue.ts           On-device photo upload queue (IndexedDB)
  lib/admin.ts                 Admin UID (the UI's copy; the rules enforce it)
  lib/photos.ts                Compress + upload images
  lib/richText.ts              Allowed text formatting (editor + public pages)
  data/                        All Firestore reads/writes (games, strategies)
  hooks/                       useAuth, useAutosave, live data hooks
  components/                  Shared UI (editor, photo manager, game picker…)
  pages/public/                Public pages
  pages/admin/                 Admin pages, served at /admin
  index.css                    Tailwind + Matrix theme colors/fonts
```

## Quick Capture (admin, on your phone)

Tap **⚡ Quick Capture** on the admin home screen (or **⚡ Capture** next to any draft):

1. Pick the game (most recently edited first), or type a new name and tap **+ Add new game**. You can also start typing or taking photos *before* picking the game.
2. **📷 Camera** opens the phone camera; **🖼 Gallery** picks existing photos.
3. Type in the **Note** box. There's no save button: it saves as you type.

Each capture visit becomes its own timestamped note on that game. In the game's full editor, the **Capture notes** panel shows them; **↓ Add to strategy** copies a note into the strategy text (marked "✓ added"), and **Continue** reopens a note to add more. "Pick up where you left off" on the admin home lists your drafts, most recently touched first.

### What survives closing the app (or losing signal)

| Situation | Survives? |
|---|---|
| Note text you typed | **Yes.** Copied to the phone instantly on every keystroke, and saved to Firestore's offline queue within a second. Synced when you're next online with the app open. |
| A game you quick-added offline | **Yes.** Created on the phone and synced later. |
| A photo, once the camera/gallery has handed it to the app | **Yes.** The original is saved on the phone *first*, then compressed (max 2000px, under about 1 MB). The **⇪ N** badge in the header counts photos still waiting. |
| A photo whose upload was interrupted | **Yes, but it restarts from 0%** next time the app is open. Firebase can't resume a half-finished upload after the app closes. |
| Uploading while the app is closed | **No.** Phones don't let websites upload in the background. Open the app with signal and the queue continues by itself (also on reconnect, and every 30 seconds). |
| Closing the app while the camera is still open | **No.** The photo never reached the app. |
| Signing out with photos waiting | They stay on the phone but can't upload until you sign back in (you'll get a warning). |
| iPhone storage clean-up | Installing the site to your home screen (see below) protects its storage; the app also asks the browser to keep it. A plain Safari tab unused for weeks may be cleared by iOS. |

## Photo rows inside the text

In a game's editor, put the cursor where you want photos (e.g. right under an H2 section), tap **▦ Photos** in the toolbar, and tap the photos in the order they should appear. The row appears in the text as a block: **Edit** changes its photos, **✕** removes it, and **⠿** drags it elsewhere. Photos must be uploaded to the game first (Photos section or Quick Capture).

On the public page, a row is a side-scrolling strip; tapping a photo opens it full screen and swipes through that row only. Photos placed in rows aren't repeated in the gallery at the bottom (which becomes "More photos"). **↓ Add to strategy** on a capture note brings the note's photos along as a row.

## Install it on your phone

The site is a PWA (progressive web app): it can be added to your home screen and then opens full-screen like an app, even with no signal (the app itself is stored on the phone; content you've already viewed is available offline).

- **iPhone (Safari):** open the site, tap **Share** (square with an up arrow), then **Add to Home Screen**. Note: the home-screen app has its own storage, separate from Safari, so **sign in once inside the installed app** at `/admin`, and use Quick Capture from there.
- **Android (Chrome):** open the site and tap **Install** on the card on the admin home screen, or use the ⋮ menu → **Install app**.
- Long-press the icon for a **Quick Capture** shortcut (Android).

After a deploy, the app shows **"new version available"** with a **Reload** button. It never reloads by itself, so an update can't interrupt a capture.

Icons are generated from `public/icon.svg`. After editing it, run `npx @vite-pwa/assets-generator` (settings in `pwa-assets.config.mjs`).

## Data model

**One game = one strategy page.** A game's strategy is stored at `strategies/{gameId}`, under the same ID as the game, and the security rules reject any other ID. Creating a game creates its (draft) strategy page at the same time; deleting a game deletes both. Game info lives separately from the strategy so that unpublished drafts can stay private.

| Collection | Fields | Who can read |
|---|---|---|
| `games/{gameId}` | name, nameLower, manufacturer, year, photo (cover), createdAt, updatedAt | Everyone |
| `strategies/{gameId}` | gameId, gameName, body (TipTap JSON), excerpt, photos[], tags[], status, createdAt, updatedAt, publishedAt | Everyone if `status == "published"`, otherwise admin only |
| `strategies/{gameId}/notes/{id}` | text, photoIds[], createdAt, updatedAt | Admin only |

Public URLs: `/games` (all published games, with search and tag filter) and `/games/{gameId}` (a game's strategy page). Admin: `/admin/games/{gameId}` edits the game info and its strategy on one page. `/admin/games/new` opens the same editor empty; the game is saved as soon as it has a name (manufacturer, year, cover, and tags are optional and can be filled in any time).

Photos are stored in Storage at `games/{gameId}/…` (cover) and `strategies/{gameId}/{photoId}.jpg` (+ `_thumb.jpg`). They're compressed on the device to at most 2000px (under about 1 MB) before uploading.
