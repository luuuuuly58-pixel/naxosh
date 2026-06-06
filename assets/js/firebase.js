/* ============================================================
   firebase.js — ژینگەی هاوکاتکردن (sync) لەگەڵ Firebase Firestore
   ------------------------------------------------------------
   ئەمە کۆگای هاوبەشە: تۆمارکردن، ناوەڕۆکی بەڕێوەبەر، هەژمار و گفتوگۆ
   لە هەورەوە (cloud) هەڵدەگیرێن، بۆیە هەموو وێبگەڕەکان هەمان شت دەبینن.

   ستراتیژی: localStorage وەک «کۆپی خێرا» دەمێنێتەوە بۆ پیشاندانی یەکسەر،
   Firestore سەرچاوەی ڕاستەقینەیە و بە onSnapshot نوێ دەکاتەوە.

   ئەگەر کلیلەکان دانەنرابن (firebase-config.js)، ئەم فایلە هیچ ناکات و
   ماڵپەڕ وەک جاران تەنها لەسەر هەمان وێبگەڕ کاردەکات.
   ============================================================ */

window.NAXOSH_DB = (function () {
  const OFF = { active: false };

  // ئەگەر کلیلەکان ئامادە نین، یان SDK بار نەبووە — هیچ مەکە
  if (!window.NAXOSH_FIREBASE_READY || typeof firebase === "undefined") {
    return OFF;
  }

  let db;
  try {
    firebase.initializeApp(window.NAXOSH_FIREBASE);
    db = firebase.firestore();
  } catch (e) {
    console.warn("[naxosh] Firebase init failed — کەوتنەوە بۆ کۆگای ناوخۆیی:", e);
    return OFF;
  }

  const LS = {
    content:  "naxosh_content",
    adminPw:  "naxosh_admin_pw",
    bookings: "naxosh_bookings"
  };

  function emit(name, detail) {
    try { document.dispatchEvent(new CustomEvent(name, { detail })); } catch (_) {}
  }

  /* ---------- ناوەڕۆک (texts/doctors/specialties/slots) ---------- */
  db.collection("site").doc("content").onSnapshot(snap => {
    if (!snap.exists) return;
    const c = snap.data();
    try { localStorage.setItem(LS.content, JSON.stringify(c)); } catch (_) {}
    if (window.NAXOSH && typeof NAXOSH.applyContent === "function") NAXOSH.applyContent(c);
    emit("naxosh:content", c);
  }, err => console.warn("[naxosh] content sync:", err));

  /* ---------- ڕێکخستن (وشەی نهێنیی بەڕێوەبەر) ---------- */
  db.collection("site").doc("settings").onSnapshot(snap => {
    if (!snap.exists) return;
    const s = snap.data();
    if (s && typeof s.adminPw === "string" && s.adminPw) {
      try { localStorage.setItem(LS.adminPw, s.adminPw); } catch (_) {}
    }
  }, err => console.warn("[naxosh] settings sync:", err));

  /* ---------- تۆمارکردنەکان ---------- */
  db.collection("bookings").onSnapshot(snap => {
    const list = [];
    snap.forEach(doc => list.push(doc.data()));
    list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    try { localStorage.setItem(LS.bookings, JSON.stringify(list)); } catch (_) {}
    emit("naxosh:bookings", list);
  }, err => console.warn("[naxosh] bookings sync:", err));

  /* ---------- نووسین بۆ هەور ---------- */
  function pushContent(c) {
    return db.collection("site").doc("content").set(c)
      .catch(e => console.warn("[naxosh] pushContent:", e));
  }
  function pushSettings(obj) {
    return db.collection("site").doc("settings").set(obj, { merge: true })
      .catch(e => console.warn("[naxosh] pushSettings:", e));
  }
  function pushBooking(b) {
    return db.collection("bookings").doc(String(b.id)).set(b)
      .catch(e => console.warn("[naxosh] pushBooking:", e));
  }
  function removeBooking(id) {
    return db.collection("bookings").doc(String(id)).delete()
      .catch(e => console.warn("[naxosh] removeBooking:", e));
  }
  function pushUser(u) {
    const key = (u.phone || "").replace(/\D/g, "") || ("u" + Date.now());
    return db.collection("users").doc(key).set({ ...u, updatedAt: Date.now() }, { merge: true })
      .catch(e => console.warn("[naxosh] pushUser:", e));
  }

  /* ---------- گفتوگۆ (هاوکات / realtime) ---------- */
  function watchChat(thread, cb) {
    return db.collection("chats").doc(thread).collection("messages")
      .orderBy("ts")
      .onSnapshot(snap => {
        const msgs = [];
        snap.forEach(doc => msgs.push(doc.data()));
        cb(msgs);
      }, err => console.warn("[naxosh] chat sync:", err));
  }
  function sendChat(thread, msg) {
    const m = { ...msg, ts: msg.ts || Date.now() };
    return db.collection("chats").doc(thread).collection("messages").add(m)
      .catch(e => console.warn("[naxosh] sendChat:", e));
  }

  console.info("[naxosh] Firebase چالاکە — کۆگای هاوبەش کاردەکات ✓");
  return {
    active: true,
    pushContent, pushSettings, pushBooking, removeBooking, pushUser,
    watchChat, sendChat
  };
})();
