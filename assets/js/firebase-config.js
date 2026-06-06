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
  apiKey:            "AIzaSyAKBZyNXZPjNw7Ql9D0IXVGggACGlm0D1M",
  authDomain:        "naxosh.firebaseapp.com",
  projectId:         "naxosh",
  storageBucket:     "naxosh.firebasestorage.app",
  messagingSenderId: "542156255134",
  appId:             "1:542156255134:web:afad36c3106a861591b08f",
  measurementId:     "G-7ZQ91F3QTG"
};




/* ئایا کلیلەکان بەڕاستی دانراون؟ (بۆ ناوخۆ بەکاردێت — دەستکاری مەکە) */
window.NAXOSH_FIREBASE_READY =
  !!window.NAXOSH_FIREBASE &&
  typeof window.NAXOSH_FIREBASE.apiKey === "string" &&
  window.NAXOSH_FIREBASE.apiKey.indexOf("PASTE_") !== 0;
