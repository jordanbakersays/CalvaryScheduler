# Volunteer Schedule — setup guide

Two files do the work:
- `index.html` — the whole app (schedule view, manage view, reminders view)
- `functions/send-reminders.js` — a small Cloudflare Pages Function that sends the reminder emails when you press the button

Texts are handled inside the app itself: "Copy #" and "Copy msg" buttons put the number and a pre-filled message on your clipboard so you can paste into your phone's messenger.

You don't need to know how to code to do any of this — it's all clicking through web dashboards, plus one spot where you paste some text into a file.

---

## Step 1 — Create a Firebase project (this stores your volunteers & schedule)

1. Go to **console.firebase.google.com** and sign in with your Google account.
2. Click **Add project** (or **Create a project**, wording varies).
3. Type a project name — e.g. `calvary-volunteers` — click **Continue**.
4. It'll ask about Google Analytics for this project. Toggle it **off** (you don't need it) → click **Create project**.
5. Wait ~30 seconds for it to provision, then click **Continue** to land in the project dashboard.
6. On the left-hand sidebar, find **Build** and click it to expand → click **Firestore Database**.
7. Click **Create database**.
   - It'll ask for a mode — choose **Start in production mode**.
   - It'll ask for a location — pick whatever's closest to Michigan (e.g. `us-east1` or `nam5`). Doesn't need to be exact.
   - Click **Enable** / **Create**. Wait for it to finish setting up.
8. Now go back to the left sidebar → click the **gear icon** near the top (next to "Project Overview") → click **Project settings**.
9. Scroll down to the **Your apps** section. Click the icon that looks like `</>` (this means "add a web app").
10. It'll ask for an app nickname — type anything, e.g. `scheduler` → click **Register app**.
11. It'll show you a box of code that includes something like this:
    ```js
    const firebaseConfig = {
      apiKey: "AIzaSy...",
      authDomain: "calvary-volunteers.firebaseapp.com",
      projectId: "calvary-volunteers",
      storageBucket: "calvary-volunteers.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abc123"
    };
    ```
    **Keep this page open** — you'll copy these values in the next step. Click **Continue to console** when you're done (don't worry, the values stay visible in Project Settings if you need them again later).

### Now put those values into the app file

12. Open `index.html` in any text editor (Notepad, TextEdit, VS Code — whatever you have).
13. Use **Find** (Ctrl+F / Cmd+F) and search for `REPLACE_ME`. You'll land on this block near the top of the file:
    ```js
    const firebaseConfig = {
      apiKey: "REPLACE_ME",
      authDomain: "REPLACE_ME.firebaseapp.com",
      projectId: "REPLACE_ME",
      storageBucket: "REPLACE_ME.appspot.com",
      messagingSenderId: "REPLACE_ME",
      appId: "REPLACE_ME"
    };
    ```
14. Replace each `"REPLACE_ME..."` with the matching value from Firebase (Step 11). When you're done it should look like your real project's values, no `REPLACE_ME` left anywhere.
15. Save the file.

### Turn on write access (Firestore rules)

16. Back in the Firebase console, left sidebar → **Firestore Database** → click the **Rules** tab at the top.
17. Delete everything in the box and paste this in:
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if true;
        }
      }
    }
    ```
18. Click **Publish**.

That's Firebase done — your data storage is live.

---

## Step 2 — Create a Resend account (this sends the automatic emails)

1. Go to **resend.com** → click **Sign up** → create an account (email or GitHub/Google login).
2. Once you're in the dashboard, look at the left sidebar → click **API Keys**.
3. Click **Create API Key**.
   - Name it anything, e.g. `volunteer-scheduler`.
   - Permission: **Full access** is fine (or "Sending access" if offered).
   - Click **Create/Add**.
4. It'll show you the key **once** — click the copy icon and paste it somewhere safe temporarily (a Notes app, a draft email to yourself). You can't view it again after leaving this screen.
5. Decide what "from" address to use:
   - **Easiest, works right now:** you don't need to do anything — you'll use `onboarding@resend.dev` in Step 4.
   - **Looks more official (optional, can do later):** left sidebar → **Domains** → **Add Domain** → type a domain you control → Resend gives you 2–3 DNS records (TXT/MX) → log into wherever your domain's DNS is managed (GoDaddy, Cloudflare, church's website host, etc.) and add those records → back in Resend click **Verify**. This can take a few minutes to a few hours depending on DNS.

You can skip the domain part entirely for now and add it later — nothing else depends on it.

---

## Step 3 — Get the project onto GitHub

**If you already use git day-to-day**, the short version:
```
git init
git add .
git commit -m "Initial volunteer scheduler"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/volunteer-scheduler.git
git push -u origin main
```

**If you'd rather not touch the command line**, here's the click-by-click way:

1. Go to **github.com** → sign in.
2. Click the **+** icon top-right → **New repository**.
3. Name it `volunteer-scheduler` → leave it **Public** or **Private** (either is fine) → do **not** check "Add a README" → click **Create repository**.
4. On the next page, look for a link that says **uploading an existing file** → click it.
5. Drag in `index.html` and `README.md` from this folder.
6. For the `functions` folder: GitHub's drag-and-drop needs the folder structure preserved. Drag the whole `functions` folder (containing `send-reminders.js`) into the same upload box — most browsers will preserve the folder path automatically. If it doesn't, you can instead click **Create new file**, type `functions/send-reminders.js` as the filename (the `/` automatically creates the folder), and paste the file's contents in.
7. Scroll down, click **Commit changes**.

Either way, you should end up with a repo containing `index.html`, `README.md`, and a `functions` folder with `send-reminders.js` inside it.

---

## Step 4 — Deploy to Cloudflare Pages

1. Go to **dash.cloudflare.com** → sign in (or create a free account).
2. Left sidebar → **Workers & Pages**.
3. Click **Create** → choose the **Pages** tab → **Connect to Git**.
4. Authorize Cloudflare to access your GitHub if it asks → select the `volunteer-scheduler` repo → click **Begin setup**.
5. On the build settings screen:
   - **Project name:** whatever you want your URL to start with, e.g. `calvary-volunteers`.
   - **Production branch:** `main`.
   - **Framework preset:** leave as **None**.
   - **Build command:** leave blank.
   - **Build output directory:** type `/`.
6. Before clicking deploy, click **Environment variables (advanced)** to expand it, and add two variables:
   - Variable name: `RESEND_API_KEY` — Value: paste the key from Step 2.
   - Variable name: `FROM_EMAIL` — Value: `onboarding@resend.dev` (or your verified address if you set one up).
7. Click **Save and Deploy**.
8. Wait for the build/deploy to finish (usually under a minute since there's no build step) — you'll see a green "Success" and a link like `https://calvary-volunteers.pages.dev`.

If you forgot the environment variables or need to change them later: go to the Pages project → **Settings** → **Environment variables** → add/edit → then go to **Deployments** tab → click the three dots on the latest deployment → **Retry deployment** (env var changes need a redeploy to take effect).

---

## Step 5 — First run

1. Open your `.pages.dev` URL from Step 4.
2. Click the **Manage** or **Reminders** tab.
3. You'll be asked to set an admin passcode — type one and submit. This becomes the passcode going forward (share it with any co-leaders who need admin access).
4. Under **Manage**:
   - Fill in the "Volunteers" section with each person's name, phone, and email → **Add volunteer**.
   - Fill in the "Add a shift" section with a date, time, optional role/notes, and assign a volunteer → **Add shift**. Repeat for each shift.
5. Click the **Schedule** tab to see the public view — this is the link you can share with volunteers so they can check their shifts (no passcode needed to view).
6. Click the **Reminders** tab:
   - Anyone with an assigned shift in the next few days shows up here (use the dropdown to widen/narrow the window).
   - **Copy #** and **Copy msg** per person → paste into your phone's Messages app → send.
   - **Send emails** button at the top sends everyone's email reminder at once via Resend — no copy/paste.

---

## Running two ministries off one deploy (you + children's ministry)

You don't need a second Firebase project, a second Cloudflare deploy, or a second codebase. One deploy serves both — the data is kept separate by a `?org=` link:

- Your link: `https://YOUR-SITE.pages.dev/?org=students`
- Children's ministry director's link: `https://YOUR-SITE.pages.dev/?org=kids`

Each one gets its own volunteers, its own shifts, and its own admin passcode (set the first time each of you opens your Manage/Reminders tab) — they don't see or affect each other's data at all, even though they're the same app and same Firebase project.

If you want to add a third ministry later (or rename these), open `index.html`, find the `MINISTRIES` object near the top of the script:
```js
const MINISTRIES = {
  students: { label: "Calvary Students" },
  kids: { label: "Calvary Kids" },
};
```
add or edit entries there, and do the same names in `functions/send-reminders.js` (`MINISTRY_LABELS`) so the reminder emails sign off with the right name. Then commit + push — Cloudflare will redeploy automatically.

One thing to send the children's ministry director along with her link: bookmark it, since there's nothing that links the two views together in the app itself — `?org=students` and `?org=kids` are just two doors into the same building.

---

## Notes

- Everything after deploy is just using the app through the browser — no more file editing needed for day-to-day use.
- If you ever want emails to go out automatically on a schedule instead of a button press, that's a small addition (a Cloudflare Cron Trigger calling the same function) — just ask.
- If **Send emails** ever fails: double-check `RESEND_API_KEY` and `FROM_EMAIL` are set correctly in Cloudflare (Step 4.6) and that you redeployed after adding/changing them.
- If the app loads but nothing saves: double check the `firebaseConfig` values in `index.html` (Step 1.14) match exactly what Firebase gave you, and that you republished the Firestore rules (Step 1.18).
