# ڕێکخستنی Firebase — کۆگای هاوبەش + پاراستن بۆ نەخۆش
### (Shared cloud database + security for Naxoş)

ئەمە تەنها **جارێک** دەیکەیت. دوای ئەوە:
- هەموو بەکارهێنەران هەمان زانیاری دەبینن (تۆمارکردن، گۆڕانکاری، گفتوگۆ).
- داتابەیس **داخراوە** — کەسی دەرەکی ناتوانێت زانیارییەکان ببینێت یان بسڕێتەوە.
- هەر نەخۆشێک تەنها زانیاری **خۆی** دەبینێت؛ تەنها **بەڕێوەبەر** هەمووی دەبینێت.
- نەخۆش پێویست ناکات هیچ هەژمارێک دروست بکات — تەنها لە کاتی تۆمارکردنی کۆتاییدا
  ناو و ژمارەی دەنووسێت (وەک جاران).

> ⚠️ هەتا ئەم هەنگاوانە تەواو نەکەیت، ماڵپەڕ وەک خۆی کاردەکات — بەڵام زانیاری
> تەنها لەسەر هەمان وێبگەڕ هەڵدەگیرێت. هیچ شتێک ناشکێت.

ھەموو ئەمە **بەخۆڕاییە** و پێویستی بە کارتی بانک نییە.

---

## هەنگاو ١ — دروستکردنی پڕۆژە
1. بڕۆ بۆ **https://console.firebase.google.com** و بە هەژماری Google بچۆ ژوورەوە.
   (دەتوانیت هەر هەژمارێکی Google بەکاربهێنیت — ئەو هەژمارە دەبێتە خاوەنی داتابەیسەکە.)
2. کلیک لە **Add project** ← ناوێک بنووسە (بۆ نموونە `naxosh`) ← **Continue**.
3. ئەگەر پرسیاری Google Analytics کرد، بیکوژێنیتەوە ← **Create project** ← **Continue**.

## هەنگاو ٢ — کردنەوەی داتابەیس (Firestore)
1. لای چەپ: **Build → Firestore Database** ← **Create database**.
2. **Production mode** ← **Next**.
3. شوێنێکی نزیک هەڵبژێرە (بۆ نموونە `eur3`) ← **Enable**.

## هەنگاو ٣ — چالاککردنی پاراستن (Authentication)
1. لای چەپ: **Build → Authentication** ← **Get started**.
2. تابی **Sign-in method**.
3. **دوو** شێواز چالاک بکە:
   - **Anonymous** ← کلیکی بکە ← **Enable** ← **Save**.
     *(ئەمە بۆ نەخۆشانە — ناسنامەیەکی نهێنیی خۆکاریان دەداتێ.)*
   - **Email/Password** ← کلیکی بکە ← **Enable** ← **Save**.
     *(ئەمە بۆ بەڕێوەبەرە.)*

## هەنگاو ٤ — دروستکردنی هەژماری بەڕێوەبەر
1. لە **Authentication**، تابی **Users** ← **Add user**.
2. ئیمەیڵێک بنووسە (بۆ نموونە `admin@naxosh.com` — پێویست نییە ئیمەیڵی ڕاستەقینە بێت)
   و وشەیەکی نهێنی (لانیکەم ٦ پیت).
3. **Add user**.
   👈 ئەمە ئەو ئیمەیڵ و وشەیەیە کە بۆ چوونەژوورەوەی داشبۆردی بەڕێوەبەر (`admin.html`)
   بەکاری دەهێنیت. وشەی نهێنیی کۆنی `naxosh2026` چیتر کارناکات.

## هەنگاو ٥ — ڕێسا داخراوەکان دابنێ (Rules)
1. بڕۆ بۆ **Firestore Database → Rules**.
2. هەموو دەقەکە بسڕەوە و ئەمەی خوارەوە لەجێیدا دابنێ:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function isAdmin()  { return signedIn() && request.auth.token.firebase.sign_in_provider == 'password'; }

    // ناوەڕۆکی ماڵپەڕ: هەرکەسێکی چووەژوورەوە دەیخوێنێتەوە، تەنها بەڕێوەبەر دەیگۆڕێت
    match /site/{doc} {
      allow read:  if signedIn();
      allow write: if isAdmin();
    }

    // تۆمارکردن: هەر نەخۆش تەنها هی خۆی؛ بەڕێوەبەر هەمووی
    match /bookings/{id} {
      allow read, delete: if isAdmin() || (signedIn() && resource.data.ownerUid == request.auth.uid);
      allow create:       if isAdmin() || (signedIn() && request.resource.data.ownerUid == request.auth.uid);
      allow update:       if isAdmin() || (signedIn() && resource.data.ownerUid == request.auth.uid
                                                      && request.resource.data.ownerUid == request.auth.uid);
    }

    // هەژماری بەکارهێنەر: هەرکەس تەنها هی خۆی؛ بەڕێوەبەر دەیانخوێنێتەوە
    match /users/{uid} {
      allow read:  if isAdmin() || (signedIn() && request.auth.uid == uid);
      allow write: if signedIn() && request.auth.uid == uid;
    }

    // گفتوگۆ: تەنها خاوەنی زنجیرەکە + بەڕێوەبەر
    match /chats/{thread} {
      allow read, write: if isAdmin() || (signedIn() && thread.split('_')[0] == request.auth.uid);
      match /messages/{m} {
        allow read, write: if isAdmin() || (signedIn() && thread.split('_')[0] == request.auth.uid);
      }
    }
  }
}
```

3. کلیک **Publish**. ئەو ئاگادارییە سووورە (public) نامێنێت ✓

## هەنگاو ٦ — کلیلەکان وەربگرە
1. کلیک لە **⚙ (Project settings)** لای سەرەوەی چەپ.
2. بەرەو خوارەوە بۆ **Your apps** ← کلیک لە ئایکۆنی **`</>`** (Web).
3. نازناوێک بنووسە (`naxosh-web`) ← **Register app**.
4. ئەو کۆدەی دەردەکەوێت، تەنها بەشی `firebaseConfig` کۆپی بکە:

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

## هەنگاو ٧ — کلیلەکان دابنێ لە فایلەکە
1. فایلی **`assets/js/firebase-config.js`** بکەرەوە.
2. شوێنی نرخە `PASTE_...`ـەکان، نرخە ڕاستەقینەکانی خۆت دابنێ.
3. پاشەکەوتی بکە.

## هەنگاو ٨ — بڵاوکردنەوە و تاقیکردنەوە
- ماڵپەڕەکە دووبارە بڵاوبکەرەوە (Netlify Drop یان GitHub Pages).
- لە **Console**ـی وێبگەڕ دەبێت ببینیت:
  `[naxosh] Firebase چالاکە — کۆگای هاوبەش + پاراستن کاردەکات ✓`
- بڕۆ بۆ `admin.html` ← بە ئیمەیڵ و وشەی نهێنیی هەنگاو ٤ بچۆ ژوورەوە.
- لە ئامێرێکی تر تۆمارکردنێک بکە ← لە داشبۆردی بەڕێوەبەر دەبێت دەربکەوێت.

---

## تێبینی گرنگ / Notes
- **وشەی نهێنیی بەڕێوەبەر** ئێستا لە تابی Settings ـی داشبۆردەوە دەگۆڕدرێت — ئەمە وشەی
  نهێنیی هەژمارە ڕاستەقینەکە دەگۆڕێت. (ئەگەر کێشەی هەبوو، بچۆ دەرەوە، دووبارە بچۆ ژوورەوە و هەوڵبدەرەوە.)
- **هەر تۆمارکردنێکی کۆن** کە پێش ئەم ڕێکخستنە دروستکرابێت، ڕەنگە بۆ نەخۆش دیار نەبێت
  (چونکە ناسنامەی پێوە نییە) — بەڵام بەڕێوەبەر هەمووی دەبینێت.
- **ئاستی پاراستن:** ئەمە پاراستنێکی باشە بۆ دیمۆ/پڕۆژەی بچووک. کەسی دەرەکی ناتوانێت
  زانیاری ببینێت یان بسڕێتەوە. بۆ خزمەتگوزاری پزیشکی ڕاستەقینەی گەورە، دواتر پێداچوونەوەی
  پسپۆڕی پاراستن پێویستە.

## ئەو زانیارییانەی هەڵدەگیرێن / What gets stored
| لە هەوردا (Firestore) | چی تێدایە |
|---|---|
| `site/content` | هەموو دەق و پزیشک و کاتەکان (دەستکاریی بەڕێوەبەر) |
| `site/settings` | ڕێکخستنەکان |
| `bookings/…` | تۆمارکردنەکان (هەرکام `ownerUid`ی خاوەنەکەی پێوەیە) |
| `users/…` | ناو و ژمارەی بەکارهێنەران |
| `chats/…/messages/…` | نامەکانی گفتوگۆ |
