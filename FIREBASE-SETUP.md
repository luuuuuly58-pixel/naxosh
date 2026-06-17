# Firebase Setup — Shared Cloud Database + Security for Naxoş

You do this **once**. After it's done:
- All users see the same data (bookings, admin edits, chats).
- The database is **locked** — outsiders can't read or delete your data.
- Each patient sees only **their own** data; only the **admin** sees everything.
- Patients don't create an account — they just enter their name and phone at the
  final booking step (same as before).

> ⚠️ Until you finish these steps, the site still works — but data is saved only in
> each person's own browser. Nothing breaks in the meantime.

All of this is **free** and needs **no credit card**.

---

## Step 1 — Create the project
1. Go to **https://console.firebase.google.com** and sign in with a Google account.
   (Any Google account works — that account becomes the owner of the database.)
2. Click **Add project** → enter a name (e.g. `naxosh`) → **Continue**.
3. If it asks about Google Analytics, you can turn it off → **Create project** → **Continue**.

## Step 2 — Turn on the database (Firestore)
1. Left menu: **Build → Firestore Database** → **Create database**.
2. Choose **Production mode** → **Next**.
3. Pick a location near you (e.g. `eur3`) → **Enable**.

## Step 3 — Turn on Authentication
1. Left menu: **Build → Authentication** → **Get started**.
2. Open the **Sign-in method** tab.
3. Enable **two** providers:
   - **Anonymous** → click it → **Enable** → **Save**
     *(this gives each patient a silent automatic identity)*
   - **Email/Password** → click it → **Enable** → **Save**
     *(this is for the admin)*

## Step 4 — Create the admin account
1. In **Authentication**, open the **Users** tab → **Add user**.
2. Enter an email (e.g. `admin@naxosh.com` — it doesn't have to be a real inbox)
   and a password (at least 6 characters).
3. Click **Add user**.
   👉 This email + password is what you'll use to log into the admin dashboard
   (`admin.html`). The old `naxosh2026` password no longer works.

## Step 5 — Set the locked-down rules
1. Go to **Firestore Database → Rules**.
2. Delete everything and paste this instead:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }

    // Any email/password account listed in doctorAccounts (the admin creates
    // those from the dashboard's Doctors tab) — active OR disabled.
    function isDoctorAccount() {
      return signedIn() &&
        exists(/databases/$(database)/documents/doctorAccounts/$(request.auth.uid));
    }
    // A disabled account belongs to a doctor the admin has deleted: it must
    // not be able to log in or read anything.
    function doctorDisabled() {
      return get(/databases/$(database)/documents/doctorAccounts/$(request.auth.uid)).data.disabled == true;
    }
    // A working doctor = listed AND not disabled. Used for all data access.
    function isDoctor() {
      return isDoctorAccount() && !doctorDisabled();
    }
    function docId() {
      return get(/databases/$(database)/documents/doctorAccounts/$(request.auth.uid)).data.doctorId;
    }
    // The admin is an email/password account that is NOT in doctorAccounts at
    // all. (A disabled doctor is still IN doctorAccounts, so it can never be
    // mistaken for the admin.)
    function isAdmin() {
      return signedIn()
        && request.auth.token.firebase.sign_in_provider == 'password'
        && !isDoctorAccount();
    }

    // Site CONTENT (all texts, doctors, time slots): PUBLIC read so first-time
    // visitors see the real text instantly with no sign-in wait. No secrets here
    // — it's exactly what the website already shows everyone.
    match /site/content {
      allow read:  if true;
      allow write: if isAdmin();
    }
    // Site SETTINGS (admin password): stays PRIVATE — admin only.
    match /site/settings {
      allow read:  if isAdmin();
      allow write: if isAdmin();
    }

    // Doctor login accounts: maps a login to a doctor profile (admin manages)
    match /doctorAccounts/{uid} {
      allow read:  if isAdmin() || (signedIn() && request.auth.uid == uid);
      allow write: if isAdmin();
    }

    // Doctor schedules (working days + times): PUBLIC read so the booking
    // calendar shows correctly on a cold load; only the admin or that doctor
    // can change them.
    match /doctorSettings/{id} {
      allow read:           if true;
      allow create, update: if isAdmin() || (isDoctor() && request.resource.data.doctorId == docId());
      allow delete:         if isAdmin();
    }

    // Bookings: patient sees own; doctor sees their patients'; admin sees all
    match /bookings/{id} {
      allow read, delete: if isAdmin()
        || (isDoctor() && resource.data.doctorId == docId())
        || (signedIn() && resource.data.ownerUid == request.auth.uid);
      allow create: if isAdmin() || (signedIn() && request.resource.data.ownerUid == request.auth.uid);
      allow update: if isAdmin()
        || (isDoctor() && resource.data.doctorId == docId())
        || (signedIn() && resource.data.ownerUid == request.auth.uid
                       && request.resource.data.ownerUid == request.auth.uid);
    }

    // User profiles: each person only their own; admin can read all
    match /users/{uid} {
      allow read:  if isAdmin() || (signedIn() && request.auth.uid == uid);
      allow write: if signedIn() && request.auth.uid == uid;
    }

    // Taken time slots: anyone signed in can see WHICH times are taken
    // (no personal data inside) — and a slot can only ever be created once,
    // so two patients can never book the same doctor at the same time.
    match /taken/{id} {
      allow read:   if signedIn();
      allow create: if signedIn() && request.resource.data.ownerUid == request.auth.uid;
      allow update: if false;
      allow delete: if isAdmin()
        || (isDoctor() && resource.data.doctorId == docId())
        || (signedIn() && resource.data.ownerUid == request.auth.uid);
    }

    // Chats: only the thread owner + the admin
    match /chats/{thread} {
      allow read, write: if isAdmin() || (signedIn() && thread.split('_')[0] == request.auth.uid);
      match /messages/{m} {
        allow read, write: if isAdmin() || (signedIn() && thread.split('_')[0] == request.auth.uid);
      }
    }
  }
}
```

3. Click **Publish**. The red "public" warning will go away ✓

## Step 6 — Get your keys
1. Click the **⚙ (Project settings)** gear at the top-left.
2. Scroll to **Your apps** → click the **`</>`** (Web) icon.
3. Enter a nickname (`naxosh-web`) → **Register app**.
4. It shows a code block — copy just the `firebaseConfig` values:

```js
const firebaseConfig = {
  apiKey: "AIza........",
  authDomain: "naxosh-xxxx.firebaseapp.com",
  projectId: "naxosh-xxxx",
  storageBucket: "naxosh-xxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:1234:web:abcd"
};
```

## Step 7 — Paste the keys into the file
1. Open **`assets/js/firebase-config.js`**.
2. Replace each `PASTE_...` value with your real values.
3. Save.

## Step 8 — Publish and test
- Re-publish the site (Netlify Drop or GitHub Pages).
- In the browser **Console** you should see:
  `[naxosh] Firebase چالاکە — کۆگای هاوبەش + پاراستن کاردەکات ✓`
- Go to `admin.html` → log in with the email + password from Step 4.
- Make a booking on another device → it should appear in the admin dashboard.

---

## Doctor accounts (doctor dashboard)
Each doctor can have their own login and dashboard at **`doctor-panel.html`**
(linked in the site footer as "بۆ پزیشکان"). There they see only **their own**
bookings (patient name, phone, time), can confirm bookings, edit their
**own working days + times + meeting-room link**, and change their password.

**Meeting room (admin sets it):** each doctor gets one permanent room link,
pasted by the **admin** in the Doctors tab (🎥 field). Patients get a 🎥 join
button on their bookings immediately after booking, with a notice to join at
the scheduled time. The site's meeting page (`meeting.html`) behaves
differently depending on which service the link is from:

| Service | What patients experience |
|---|---|
| **Daily** (`yourname.daily.co/room`) | 🏆 Video opens **inside the Naxoş site** — no app, no account. Free ~10,000 min/month. |
| **Whereby Embedded** (`yourname.whereby.com/room`) | 🏆 Also opens **inside the site**, with knock/admit. Free ~2,000 min/month. |
| **Whereby regular** (`whereby.com/room`) | Opens in its own tab; no account needed; doctor admits via knock. |
| **Google Meet** | Opens in its own tab; patients need a Google account; doctor admits. |

**Option A — Daily (most free minutes):**
1. Go to **https://dashboard.daily.co** → sign up free (no credit card; skip
   any paid add-on screens).
2. It gives you a subdomain (e.g. `naxosh.daily.co`).
3. **Rooms → Create room** — name it after the doctor with a random suffix
   (e.g. `dr-lala-k83x` so it can't be guessed), privacy **Public**.
4. Copy the room URL (`https://naxosh.daily.co/dr-lala-k83x`) and paste it
   into the doctor's 🎥 field in the admin dashboard → **Save**.

   Note: a Daily public room has no knock screen — anyone with the exact
   link can enter. Use an unguessable name; if a link leaks, make a new room
   and paste the new link (applies everywhere instantly).

**Option B — Whereby Embedded (has knock/admit, fewer free minutes):**
1. Go to **https://whereby.com/information/embedded/** → start with the free
   **Explore** plan.
2. You get a subdomain (e.g. `naxosh.whereby.com`) — create a room per doctor.
3. In the Whereby Embedded dashboard, add your site to **Allowed domains**:
   `luuuuuly58-pixel.github.io`
   (without this, the video shows a blocked screen inside the site).
4. Paste the room URL (`https://naxosh.whereby.com/dr-lala`) into the
   doctor's 🎥 field in the admin dashboard → **Save**.

- **Create a doctor's login:** Admin dashboard → **Doctors** tab → in the
  doctor's card, fill **email + password** under 🔑 and click
  **دروستکردنی هەژمار**. (The email doesn't need a real inbox.)
- **Doctor forgot their password:** Firebase console → **Authentication →
  Users** → delete that doctor's user → create the account again from the
  admin dashboard with a new password.
- Doctors change their own password from their dashboard's Settings tab.

## Notes
- **The admin password** is now changed from the dashboard's Settings tab — that
  changes the real account password. (If it errors, log out, log back in, and retry.)
- **Any bookings created before this setup** may not show for patients (they have no
  identity attached) — but the admin still sees all of them.
- **Security level:** this is good protection for a demo / small project. Outsiders
  can't read or delete your data. A real, large-scale medical service would later
  need a professional security review.

## What gets stored
| In the cloud (Firestore) | Contents |
|---|---|
| `site/content` | All texts, doctors, and time slots (admin edits) |
| `site/settings` | Settings |
| `bookings/…` | Bookings (each tagged with its owner's `ownerUid`) |
| `taken/…` | Which doctor time slots are already booked (no personal data) |
| `doctorAccounts/…` | Which login belongs to which doctor (admin-managed) |
| `doctorSettings/…` | Each doctor's working days + times + meeting link (doctor-edited) |
| `users/…` | User names and phone numbers |
| `chats/…/messages/…` | Chat messages |
