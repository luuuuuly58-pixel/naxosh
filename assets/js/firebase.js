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
  const OFF = { active: false, uid: () => null, role: () => null, isAdmin: () => false, isDoctor: () => false, doctorId: () => null, whenReady: () => {} };

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

  const LS = { content: "naxosh_content", adminPw: "naxosh_admin_pw", bookings: "naxosh_bookings",
               role: "naxosh_role", doctorId: "naxosh_doctor_id" };

  let curUid = null;
  // ڕۆڵی پێشوو لە localStorage ـەوە بیربهێنەرەوە — تاکو لە کاتی بارکردنی پەڕەیەکی
  // نوێدا مینۆ یەکسەر بە ڕۆڵی دروست (بەڕێوەبەر/پزیشک) پیشان بدرێت، نەک «تەزووی»
  // چوونەدەرەوە پێش ئەوەی ناسنامەی Firebase بگەڕێتەوە (هەمان وێبگەڕ، هەمان هەژمار).
  // ئەگەر هەژمارەکە لەناکاو دەرچووبێت، onAuthStateChanged دواتر ڕاستی دەکاتەوە.
  let curRole = (function () { try { return localStorage.getItem(LS.role) || null; } catch (_) { return null; } })();
  let curDoctorId = (function () {
    try { const v = localStorage.getItem(LS.doctorId); return (v == null || v === "") ? null : (isNaN(v) ? v : Number(v)); }
    catch (_) { return null; }
  })();
  let contentAttached = false;     // گوێگری دەقی ماڵپەڕ — هەڵە؟ دووبارە هەوڵ دەدرێتەوە
  let docSettingsAttached = false; // گوێگری خشتەی پزیشکان — هەڵە؟ دووبارە هەوڵ دەدرێتەوە
  let staticAttached = false;      // گوێگری ڕێکخستن (adminPw) — دوای ناسنامە، تەنها جارێک
  let unsubBookings = null;
  const readyQueue = [];          // فەرمانەکان کە چاوەڕێی ناسنامەن

  function emit(name, detail) {
    try { document.dispatchEvent(new CustomEvent(name, { detail })); } catch (_) {}
  }

  /* ---------- گوێگری ناوەڕۆکی گشتی (خوێندنەوەی ئاشکرا — یەکسەر، بەبێ چاوەڕوانی ناسنامە) ----------
     ناوەڕۆکی ماڵپەڕ (دەق + خشتەی پزیشکان) خوێندنەوەی گشتییە، بۆیە لە کاتی
     بارکردندا یەکسەر گوێی لێدەگرین — بەبێ چاوەڕوانی چوونەژوورەوەی نهێنی. ئەمە
     «تەزووی دەقی سەرەتایی» بۆ یەکەم سەردانکەر لادەبات (پێویستی بە یاسای
     خوێندنەوەی گشتی هەیە لەسەر site/content و doctorSettings — بڕوانە FIREBASE-SETUP.md). */
  function attachPublic() {
    // دەقی ماڵپەڕ
    if (!contentAttached) {
      contentAttached = true;
      db.collection("site").doc("content").onSnapshot(snap => {
        if (!snap.exists) return;
        const c = snap.data();
        try { localStorage.setItem(LS.content, JSON.stringify(c)); } catch (_) {}
        if (window.NAXOSH && typeof NAXOSH.applyContent === "function") NAXOSH.applyContent(c);
        emit("naxosh:content", c);
      }, err => {
        // ئەگەر یاسای خوێندنەوەی گشتی هێشتا بڵاو نەکراوەتەوە، پێش ناسنامە هەڵە دەدات.
        // contentAttached دەکەینەوە false تاکو finishAuth (دوای ناسنامە) دووبارە هەوڵبدات.
        console.warn("[naxosh] content sync:", err); contentAttached = false;
      });
    }

    // خشتەی پزیشکەکان (ڕۆژ و کاتەکان کە پزیشک خۆی دەستکاری دەکات)
    if (!docSettingsAttached) {
      docSettingsAttached = true;
      db.collection("doctorSettings").onSnapshot(snap => {
        const map = {};
        snap.forEach(doc => { map[doc.id] = doc.data(); });
        if (window.NAXOSH && typeof NAXOSH.applyDoctorSettings === "function") {
          NAXOSH.applyDoctorSettings(map);
        }
        emit("naxosh:content", null);
      }, err => { console.warn("[naxosh] doctorSettings sync:", err); docSettingsAttached = false; });
    }
  }

  /* ---------- گوێگری ڕێکخستن (adminPw — نهێنی، تەنها دوای ناسنامە) ---------- */
  function attachSettings() {
    if (staticAttached) return;
    staticAttached = true;

    db.collection("site").doc("settings").onSnapshot(snap => {
      if (!snap.exists) return;
      const s = snap.data();
      if (s && typeof s.adminPw === "string" && s.adminPw) {
        try { localStorage.setItem(LS.adminPw, s.adminPw); } catch (_) {}
      }
    }, err => console.warn("[naxosh] settings sync:", err));
  }

  /* ---------- گوێگری تۆمارکردن (گۆڕاو بەپێی ڕۆڵ) ----------
     بەڕێوەبەر: هەمووی. پزیشک: تەنها هی خۆی. نەخۆش: تەنها ئەوانەی خۆی. */
  function attachBookings() {
    if (unsubBookings) { unsubBookings(); unsubBookings = null; }
    if (!curUid) return;
    let q;
    if (curRole === "admin") q = db.collection("bookings");
    else if (curRole === "doctor") q = db.collection("bookings").where("doctorId", "==", curDoctorId);
    else q = db.collection("bookings").where("ownerUid", "==", curUid);
    unsubBookings = q.onSnapshot(snap => {
      const list = [];
      snap.forEach(doc => list.push(doc.data()));
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      try { localStorage.setItem(LS.bookings, JSON.stringify(list)); } catch (_) {}
      emit("naxosh:bookings", list);
    }, err => console.warn("[naxosh] bookings sync:", err));
  }

  /* ---------- گۆڕانی دۆخی ناسنامە ---------- */
  function finishAuth() {
    // ڕۆڵی ئێستا پاشەکەوت بکە بۆ بارکردنی داهاتوو (تەزووی مینۆ لادەبات)
    try {
      if (curRole) localStorage.setItem(LS.role, curRole); else localStorage.removeItem(LS.role);
      if (curDoctorId != null) localStorage.setItem(LS.doctorId, String(curDoctorId)); else localStorage.removeItem(LS.doctorId);
    } catch (_) {}

    attachSettings();
    attachBookings();
    attachPublic();   // دووبارە هەوڵ بدە — ئەگەر پێش ناسنامە سەرکەوتوو نەبوو (یاسای کۆن)

    // فەرمانە چاوەڕێکراوەکان جێبەجێ بکە
    while (readyQueue.length) { try { readyQueue.shift()(curUid); } catch (_) {} }

    emit("naxosh:auth", { uid: curUid, role: curRole, isAdmin: curRole === "admin" });
  }

  // یەکسەر گوێ لە ناوەڕۆکی گشتی بگرە — بەبێ چاوەڕوانی ناسنامە (تەزووی دەق لادەبات)
  attachPublic();

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
    curDoctorId = null;

    if (user.isAnonymous) {           // نهێنی = نەخۆش
      curRole = "patient";
      finishAuth();
      return;
    }
    // هەژماری ئیمەیڵ: ئەگەر لە doctorAccounts دا بێت پزیشکە، ئەگەرنا بەڕێوەبەرە
    db.collection("doctorAccounts").doc(user.uid).get()
      .then(snap => {
        if (snap.exists) { curRole = "doctor"; curDoctorId = snap.data().doctorId; }
        else curRole = "admin";
      })
      .catch(() => { curRole = "admin"; })
      .then(finishAuth);
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
  function updateBooking(id, fields) {
    return db.collection("bookings").doc(String(id)).set(fields, { merge: true })
      .catch(e => console.warn("[naxosh] updateBooking:", e));
  }

  /* ---------- کاتە گیراوەکان (taken) — ڕێگری لە دووبارە تۆمارکردنی هەمان کات ----------
     هەر کاتێک تۆمار دەکرێت، بەڵگەنامەیەک بە کلیلی doctorId_date_time دروست دەکرێت.
     ڕێساکان ڕێگە نادەن دوو کەس هەمان کلیل دروست بکەن — بۆیە کێبڕکێ ناکرێت. */
  function takeSlot(slotKey, info) {
    if (!curUid) return Promise.resolve(false);
    return db.collection("taken").doc(slotKey)
      .set({ ...info, ownerUid: curUid, createdAt: Date.now() })
      .then(() => true)
      .catch(e => { console.warn("[naxosh] takeSlot:", e.code || e); return false; });
  }
  function freeSlot(slotKey) {
    if (!slotKey) return Promise.resolve();
    return db.collection("taken").doc(slotKey).delete()
      .catch(e => console.warn("[naxosh] freeSlot:", e));
  }
  function watchTaken(doctorId, cb) {
    return db.collection("taken").where("doctorId", "==", doctorId)
      .onSnapshot(snap => {
        const list = [];
        snap.forEach(doc => list.push(doc.data()));
        cb(list);
      }, err => console.warn("[naxosh] taken sync:", err));
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

  /* ---------- چوونەژوورەوەی بەڕێوەبەر / پزیشک (ئیمەیڵ + وشەی نهێنی) ---------- */
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

  /* ---------- هەژمارەکانی پزیشکان ----------
     بەڕێوەبەر لە داشبۆردەوە هەژمار بۆ هەر پزیشکێک دروست دەکات.
     بۆ ئەوەی دانیشتنی بەڕێوەبەر نەپچڕێت، هەژمارەکە لە ئەپێکی لاوەکیدا
     دروست دەکرێت (secondary app) و یەکسەر دەرچوونی لێدەکرێت. */
  function createDoctorAccount(email, pw, doctorId) {
    email = (email || "").trim();
    let second;
    try { second = firebase.app("naxosh-second"); }
    catch (_) { second = firebase.initializeApp(window.NAXOSH_FIREBASE, "naxosh-second"); }
    return second.auth().createUserWithEmailAndPassword(email, pw)
      .then(cred => {
        const uid = cred.user.uid;
        return second.auth().signOut().then(() =>
          db.collection("doctorAccounts").doc(uid)
            .set({ doctorId, email, createdAt: Date.now() })
        );
      })
      .then(() => ({ ok: true }))
      .catch(e => ({ ok: false, code: e.code || String(e) }));
  }
  function listDoctorAccounts() {
    // بۆ بەڕێوەبەر: نەخشەی doctorId → ئیمەیڵ
    return db.collection("doctorAccounts").get()
      .then(snap => {
        const m = {};
        snap.forEach(doc => { const a = doc.data(); m[String(a.doctorId)] = a.email; });
        return m;
      })
      .catch(e => { console.warn("[naxosh] listDoctorAccounts:", e); return {}; });
  }
  function saveDoctorSettings(doctorId, data) {
    // هەڵە ناشاردرێتەوە — بانگکەر خۆی بڕیار دەدات چۆن پیشانی بدات
    return db.collection("doctorSettings").doc(String(doctorId))
      .set({ ...data, doctorId, updatedAt: Date.now() }, { merge: true });
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
    role: () => curRole,
    isAdmin: () => curRole === "admin",
    isDoctor: () => curRole === "doctor",
    doctorId: () => curDoctorId,
    whenReady,
    pushContent, pushSettings, pushBooking, removeBooking, updateBooking, pushUser,
    takeSlot, freeSlot, watchTaken,
    createDoctorAccount, listDoctorAccounts, saveDoctorSettings,
    watchChat, sendChat,
    adminSignIn, signOutAdmin, changeAdminPassword
  };
})();
