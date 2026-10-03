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

### Local development with the emulators (no real data touched)

The Firebase Emulator Suite runs fake Auth, Firestore, and Storage on your computer.

1. In `.env`, set `VITE_USE_EMULATORS=true`.
2. In one terminal, run `npm run emulators`. The emulator dashboard is at http://localhost:4000.
3. In another terminal, run `npm run dev`.

### Tests

```bash
npm run test:rules    # starts the emulators, runs the security-rules tests, stops them
npm run build         # type-checks and builds to dist/
```

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
src/
  lib/firebase.ts              Firebase initialization
  components/                  Shared UI (layout, etc.)
  pages/public/                Public pages
  pages/admin/                 Admin pages (Phase 2+)
  index.css                    Tailwind + Matrix theme colors/fonts
```
