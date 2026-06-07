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

    // A "doctor" is an email/password account listed in doctorAccounts
    // (the admin creates those from the dashboard's Doctors tab).
    function isDoctor() {
      return signedIn() &&
        exists(/databases/$(database)/documents/doctorAccounts/$(request.auth.uid));
    }
    function docId() {
      return get(/databases/$(database)/documents/doctorAccounts/$(request.auth.uid)).data.doctorId;
    }
    // The admin is an email/password account that is NOT a doctor.
    function isAdmin() {
      return signedIn()
        && request.auth.token.firebase.sign_in_provider == 'password'
        && !isDoctor();
    }

    // Site content: any signed-in visitor can read; only the admin can change it
    match /site/{doc} {
      allow read:  if signedIn();
      allow write: if isAdmin();
    }

    // Doctor login accounts: maps a login to a doctor profile (admin manages)
    match /doctorAccounts/{uid} {
      allow read:  if isAdmin() || (signedIn() && request.auth.uid == uid);
      allow write: if isAdmin();
    }

    // Doctor schedules (working days + times): everyone can read,
    // only the admin or that doctor can change them
    match /doctorSettings/{id} {
      allow read:           if signedIn();
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

**Meeting room:** each doctor creates one permanent room — at
**meet.google.com** (Google Meet) or **whereby.com** (free, patients join in
the browser with no account) — and pastes its link once in their dashboard
("ڕۆژ و کاتەکانم" tab). Patients then get a 🎥 join button on their bookings.
Both services make patients **knock**; the doctor admits only the scheduled
patient, so a saved/shared link can't be used to intrude. If the link is ever
abused, the doctor just creates a fresh room and pastes the new link.

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
