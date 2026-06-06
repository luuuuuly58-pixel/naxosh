/* ============================================================
   firebase-config.js — لێرە کلیلەکانی Firebase دابنێ
   ------------------------------------------------------------
   ١. بڕۆ بۆ  https://console.firebase.google.com
   ٢. پڕۆژەیەکی نوێ دروست بکە ← Build ← Firestore Database ← Create
   ٣. لە  Project settings ⚙  ←  "Your apps" ← Web (</>) ←
      کلیلەکانت کۆپی بکە و لێرە دایبنێ (شوێنی ئەوانەی خوارەوە).
   ٤. ئەو فایلە پاشەکەوت بکە و ماڵپەڕەکە دووبارە بڵاو بکەرەوە.

   هەتا کلیلەکان دانەنرێن، ماڵپەڕ وەک خۆی کاردەکات (تەنها لەسەر هەمان
   وێبگەڕ هەڵدەگیرێت). دوای دانانیان، هەمووان هەمان زانیاری دەبینن.
   ============================================================ */

window.NAXOSH_FIREBASE = {
  apiKey:            "PASTE_API_KEY",
  authDomain:        "PASTE_PROJECT.firebaseapp.com",
  projectId:         "PASTE_PROJECT_ID",
  storageBucket:     "PASTE_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId:             "PASTE_APP_ID"
};

/* ئایا کلیلەکان بەڕاستی دانراون؟ (بۆ ناوخۆ بەکاردێت — دەستکاری مەکە) */
window.NAXOSH_FIREBASE_READY =
  !!window.NAXOSH_FIREBASE &&
  typeof window.NAXOSH_FIREBASE.apiKey === "string" &&
  window.NAXOSH_FIREBASE.apiKey.indexOf("PASTE_") !== 0;
