/* ============================================================
   firebase.js — ژینگەی هاوکاتکردن (sync) + پاراستن (auth)
   ------------------------------------------------------------
   • هەر سەردانکەرێک بەبێ ئەوەی هەست پێبکات، ناسنامەیەکی نهێنیی
     خۆکار (anonymous) وەردەگرێت — بۆیە داتابەیس کراوە نییە بۆ گشت.
   • نەخۆش تەنها داتای خۆی دەبینێت؛ بەڕێوەبەر هەمووی دەبینێت.
   • بەڕێوەبەر بە ئیمەیڵ + وشەی نهێنیی ڕاستەقینە دەچێتە ژوورەوە.

   ئەگەر کلیلەکان دانەنرابن (firebase-config.js)، هیچ ناکات و ماڵپەڕ
   وەک جاران تەنها لەسەر هەمان وێبگەڕ کاردەکات.
   ============================================================ */

window.NAXOSH_DB = (function () {
  const OFF = { active: false, uid: () => null, isAdmin: () => false, whenReady: () => {} };

  if (!window.NAXOSH_FIREBASE_READY || typeof firebase === "undefined" ||
      typeof firebase.auth !== "function") {
    return OFF;
  }

  let auth, db;
  try {
    firebase.initializeApp(window.NAXOSH_FIREBASE);
    auth = firebase.auth();
    db = firebase.firestore();
  } catch (e) {
    console.warn("[naxosh] Firebase init failed — کەوتنەوە بۆ کۆگای ناوخۆیی:", e);
    return OFF;
  }

  const LS = { content: "naxosh_content", adminPw: "naxosh_admin_pw", bookings: "naxosh_bookings" };

  let curUid = null;
  let curIsAdmin = false;
  let staticAttached = false;     // گوێگرە نەگۆڕەکان (content/settings) تەنها جارێک
  let unsubBookings = null;
  const readyQueue = [];          // فەرمانەکان کە چاوەڕێی ناسنامەن

  function emit(name, detail) {
    try { document.dispatchEvent(new CustomEvent(name, { detail })); } catch (_) {}
  }

  /* ---------- گوێگری ناوەڕۆک و ڕێکخستن (تەنها جارێک) ---------- */
  function attachStatic() {
    if (staticAttached) return;
    staticAttached = true;

    db.collection("site").doc("content").onSnapshot(snap => {
      if (!snap.exists) return;
      const c = snap.data();
      try { localStorage.setItem(LS.content, JSON.stringify(c)); } catch (_) {}
      if (window.NAXOSH && typeof NAXOSH.applyContent === "function") NAXOSH.applyContent(c);
      emit("naxosh:content", c);
    }, err => console.warn("[naxosh] content sync:", err));

    db.collection("site").doc("settings").onSnapshot(snap => {
      if (!snap.exists) return;
      const s = snap.data();
      if (s && typeof s.adminPw === "string" && s.adminPw) {
        try { localStorage.setItem(LS.adminPw, s.adminPw); } catch (_) {}
      }
    }, err => console.warn("[naxosh] settings sync:", err));
  }

  /* ---------- گوێگری تۆمارکردن (گۆڕاو بەپێی ناسنامە) ----------
     بەڕێوەبەر: هەموو تۆمارکردنەکان. نەخۆش: تەنها ئەوانەی خۆی. */
  function attachBookings() {
    if (unsubBookings) { unsubBookings(); unsubBookings = null; }
    if (!curUid) return;
    const q = curIsAdmin
      ? db.collection("bookings")
      : db.collection("bookings").where("ownerUid", "==", curUid);
    unsubBookings = q.onSnapshot(snap => {
      const list = [];
      snap.forEach(doc => list.push(doc.data()));
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      try { localStorage.setItem(LS.bookings, JSON.stringify(list)); } catch (_) {}
      emit("naxosh:bookings", list);
    }, err => console.warn("[naxosh] bookings sync:", err));
  }

  /* ---------- گۆڕانی دۆخی ناسنامە ---------- */
  auth.onAuthStateChanged(user => {
    if (!user) {
      // هیچ ناسنامەیەک نییە — بە نهێنی بچۆ ژوورەوە
      auth.signInAnonymously().catch(e => {
        console.warn("[naxosh] چوونەژوورەوەی نهێنی سەرکەوتوو نەبوو — دڵنیابە لە چالاککردنی " +
                     "Anonymous لە Firebase ← Authentication:", e);
      });
      return;
    }
    curUid = user.uid;
    curIsAdmin = !user.isAnonymous;   // ئیمەیڵ = بەڕێوەبەر، نهێنی = نەخۆش

    attachStatic();
    attachBookings();

    // فەرمانە چاوەڕێکراوەکان جێبەجێ بکە
    while (readyQueue.length) { try { readyQueue.shift()(curUid); } catch (_) {} }

    emit("naxosh:auth", { uid: curUid, isAdmin: curIsAdmin });
  });

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
    const rec = { ...b, ownerUid: curUid };
    return db.collection("bookings").doc(String(b.id)).set(rec)
      .catch(e => console.warn("[naxosh] pushBooking:", e));
  }
  function removeBooking(id) {
    return db.collection("bookings").doc(String(id)).delete()
      .catch(e => console.warn("[naxosh] removeBooking:", e));
  }
  function pushUser(u) {
    if (!curUid) return Promise.resolve();
    return db.collection("users").doc(curUid)
      .set({ ...u, ownerUid: curUid, updatedAt: Date.now() }, { merge: true })
      .catch(e => console.warn("[naxosh] pushUser:", e));
  }

  /* ---------- گفتوگۆ (هاوکات) ---------- */
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
    const m = { ...msg, uid: curUid, ts: msg.ts || Date.now() };
    return db.collection("chats").doc(thread).collection("messages").add(m)
      .catch(e => console.warn("[naxosh] sendChat:", e));
  }

  /* ---------- پاراستنی بەڕێوەبەر ---------- */
  function adminSignIn(email, pw) {
    return auth.signInWithEmailAndPassword((email || "").trim(), pw)
      .then(() => true)
      .catch(e => { console.warn("[naxosh] adminSignIn:", e.code || e); return false; });
  }
  function signOutAdmin() {
    // دەرچوون پاشان دووبارە بە نهێنی دەچینەوە ژوورەوە (لە onAuthStateChanged)
    return auth.signOut().catch(e => console.warn("[naxosh] signOut:", e));
  }
  function changeAdminPassword(newPw) {
    const u = auth.currentUser;
    if (!u || u.isAnonymous) return Promise.reject(new Error("not-admin"));
    return u.updatePassword(newPw);
  }

  /* ---------- یارمەتیدەر ---------- */
  function whenReady(cb) {
    if (curUid) { try { cb(curUid); } catch (_) {} }
    else readyQueue.push(cb);
  }

  console.info("[naxosh] Firebase چالاکە — کۆگای هاوبەش + پاراستن کاردەکات ✓");
  return {
    active: true,
    uid: () => curUid,
    isAdmin: () => curIsAdmin,
    whenReady,
    pushContent, pushSettings, pushBooking, removeBooking, pushUser,
    watchChat, sendChat,
    adminSignIn, signOutAdmin, changeAdminPassword
  };
})();
