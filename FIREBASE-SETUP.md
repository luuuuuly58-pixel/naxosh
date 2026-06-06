# ڕێکخستنی Firebase — کۆگای هاوبەش بۆ نەخۆش
### (Connecting Naxoş to a shared cloud database)

ئەمە تەنها **جارێک** دەیکەیت. دوای ئەوە، هەموو بەکارهێنەران هەمان زانیاری دەبینن:
تۆمارکردنەکان، گۆڕانکارییەکانی بەڕێوەبەر، هەژمارەکان و گفتوگۆکان لە هەور (cloud) هەڵدەگیرێن.

> ⚠️ هەتا ئەم هەنگاوانە تەواو نەکەیت، ماڵپەڕ وەک خۆی کاردەکات — بەڵام زانیاری
> تەنها لەسەر هەمان وێبگەڕ هەڵدەگیرێت (وەک پێشتر). هیچ شتێک ناشکێت.

ھەموو ئەمە **بەخۆڕاییە** و پێویستی بە کارتی بانک نییە.

---

## هەنگاو ١ — دروستکردنی پڕۆژە
1. بڕۆ بۆ **https://console.firebase.google.com** و بە هەژماری Google بچۆ ژوورەوە.
2. کلیک لە **Add project** (یان «Create a project») بکە.
3. ناوێک بنووسە، بۆ نموونە `naxosh` ← **Continue**.
4. ئەگەر پرسیاری Google Analytics کرد، دەتوانیت بیکوژێنیتەوە (Disable) ← **Create project**.
5. چاوەڕێ بکە، پاشان **Continue**.

## هەنگاو ٢ — کردنەوەی داتابەیس (Firestore)
1. لە لای چەپ: **Build → Firestore Database**.
2. کلیک **Create database**.
3. **Production mode** هەڵبژێرە ← **Next**.
4. شوێنێک (location) هەڵبژێرە کە لە نزیکتە (بۆ نموونە `eur3` یان `europe-west`) ← **Enable**.

## هەنگاو ٣ — ڕێسا کراوەکان دابنێ (Rules)
1. لە سەرەوەی Firestore، تابی **Rules** بکەرەوە.
2. هەموو دەقەکە بسڕەوە و ئەمەی خوارەوە لەجێیدا دابنێ:

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

3. کلیک **Publish**.

> 🔓 ئەمە بۆ دیمۆیە و کراوەیە (هەرکەس دەتوانێت بخوێنێت و بنووسێت). بۆ بەرهەمی
> ڕاستەقینە دواتر دەبێت پاراستن (Authentication) زیاد بکرێت.

## هەنگاو ٤ — کلیلەکان وەربگرە
1. کلیک لە **⚙ (Project settings)** لای سەرەوەی چەپ.
2. بەرەو خوارەوە بڕۆ بۆ **Your apps**.
3. کلیک لە ئایکۆنی **`</>`** (Web) بکە.
4. نازناوێک بنووسە (بۆ نموونە `naxosh-web`) ← **Register app**.
5. ئێستا کۆدێکت بۆ دەردەکەوێت وەک ئەمە — تەنها ئەو بەشە کۆپی بکە:

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

## هەنگاو ٥ — کلیلەکان دابنێ لە فایلەکە
1. فایلی **`assets/js/firebase-config.js`** بکەرەوە.
2. شوێنی ئەو نرخە `PASTE_...`ـانە، نرخە ڕاستەقینەکانی خۆت دابنێ (لە هەنگاو ٤).
3. پاشەکەوتی بکە.

## هەنگاو ٦ — بڵاوکردنەوە
- ماڵپەڕەکە دووبارە بڵاوبکەرەوە (Netlify Drop یان GitHub Pages).
- بیکەرەوە. ئەگەر هەموو شت دروست بێت، لە **Console**ـی وێبگەڕ ئەم پەیامە دەبینیت:
  `[naxosh] Firebase چالاکە — کۆگای هاوبەش کاردەکات ✓`

---

## تاقیکردنەوە / Quick test
- لە کۆمپیوتەرێک تۆمارکردنێک بکە، پاشان لە مۆبایلێکی جیاواز داشبۆردی بەڕێوەبەر
  (`admin.html`) بکەرەوە — دەبێت هەمان تۆمارکردن ببینیت.
- لە Firebase Console → Firestore → Data، دەبێت `bookings`, `site`, `users`, `chats` ببینیت.

## ئەو زانیارییانەی هەڵدەگیرێن / What gets stored
| لە هەوردا (Firestore) | چی تێدایە |
|---|---|
| `site/content` | هەموو دەق و پزیشک و کاتەکان (دەستکاریی بەڕێوەبەر) |
| `site/settings` | وشەی نهێنیی بەڕێوەبەر |
| `bookings/…` | هەموو تۆمارکردنەکان |
| `users/…` | ناو و ژمارەی بەکارهێنەران |
| `chats/…/messages/…` | نامەکانی گفتوگۆ |
