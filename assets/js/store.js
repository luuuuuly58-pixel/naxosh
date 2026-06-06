/* ============================================================
   store.js — ناوەڕۆکی دەستکاریکراو + هەژماری بەکارهێنەر/بەڕێوەبەر
   هەموو شتەکان لە localStorage ی هەمان وێبگەڕدا هەڵدەگیرێن.
   ئەمە دیمۆیە — بێ سێرڤەر. وشەی نهێنیی بەڕێوەبەر پاراستنی ڕاستەقینە نییە.
   ============================================================ */

const NAXOSH = (function () {
  const LS = {
    content: "naxosh_content",
    admin: "naxosh_admin",
    adminPw: "naxosh_admin_pw",
    user: "naxosh_user"
  };

  /* وشەی نهێنیی بنەڕەتی بۆ بەڕێوەبەر — دەکرێت لە داشبۆردەوە بگۆڕدرێت */
  const DEFAULT_ADMIN_PW = "naxosh2026";

  /* ---------- یارمەتیدەری گشتی ---------- */
  function deepMerge(target, src) {
    for (const k in src) {
      if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k])) {
        target[k] = (target[k] && typeof target[k] === "object") ? target[k] : {};
        deepMerge(target[k], src[k]);
      } else {
        target[k] = src[k];
      }
    }
    return target;
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  /* ---------- ناوەڕۆک (texts + doctors + ...) ---------- */
  function loadOverrides() {
    try { return JSON.parse(localStorage.getItem(LS.content) || "null"); }
    catch { return null; }
  }

  /* جێبەجێکردنی override لەسەر گۆڕاوە جیهانییەکان (STR/DOCTORS/...) */
  function applyContent(c) {
    if (!c) return;
    if (c.texts && typeof STR !== "undefined") deepMerge(STR, c.texts);
    if (Array.isArray(c.specialties) && typeof SPECIALTIES !== "undefined") {
      SPECIALTIES.length = 0; c.specialties.forEach(s => SPECIALTIES.push(s));
    }
    if (Array.isArray(c.doctors) && typeof DOCTORS !== "undefined") {
      DOCTORS.length = 0; c.doctors.forEach(d => DOCTORS.push(d));
    }
    if (Array.isArray(c.timeSlots) && typeof TIME_SLOTS !== "undefined") {
      TIME_SLOTS.length = 0; c.timeSlots.forEach(t => TIME_SLOTS.push(t));
    }
    if (Array.isArray(c.notOnline) && typeof NOT_ONLINE !== "undefined") {
      NOT_ONLINE.length = 0; c.notOnline.forEach(n => NOT_ONLINE.push(n));
    }
  }

  /* وێنەیەکی ئێستای ناوەڕۆک — بۆ دەستکاری و هەناردن */
  function snapshot() {
    const s = {};
    if (typeof STR !== "undefined") s.texts = clone(STR);
    if (typeof SPECIALTIES !== "undefined") s.specialties = clone(SPECIALTIES);
    if (typeof DOCTORS !== "undefined") s.doctors = clone(DOCTORS);
    if (typeof TIME_SLOTS !== "undefined") s.timeSlots = clone(TIME_SLOTS);
    if (typeof NOT_ONLINE !== "undefined") s.notOnline = clone(NOT_ONLINE);
    return s;
  }

  function saveContent(c) {
    localStorage.setItem(LS.content, JSON.stringify(c));
    applyContent(c);
    if (window.NAXOSH_DB && NAXOSH_DB.active) NAXOSH_DB.pushContent(c);
  }
  function resetContent() { localStorage.removeItem(LS.content); }

  /* ---------- بەڕێوەبەر ---------- */
  function adminPw() { return localStorage.getItem(LS.adminPw) || DEFAULT_ADMIN_PW; }
  function setAdminPw(pw) {
    localStorage.setItem(LS.adminPw, pw);
    if (window.NAXOSH_DB && NAXOSH_DB.active) NAXOSH_DB.pushSettings({ adminPw: pw });
  }
  function isAdmin() { return localStorage.getItem(LS.admin) === "1"; }
  function adminLogin(pw) {
    if (pw === adminPw()) { localStorage.setItem(LS.admin, "1"); return true; }
    return false;
  }
  function adminLogout() { localStorage.removeItem(LS.admin); }

  /* ---------- بەکارهێنەر ---------- */
  function getUser() {
    try { return JSON.parse(localStorage.getItem(LS.user) || "null"); }
    catch { return null; }
  }
  function userLogin(name, phone) {
    const u = { name: (name || "").trim(), phone: (phone || "").trim() };
    localStorage.setItem(LS.user, JSON.stringify(u));
    if (window.NAXOSH_DB && NAXOSH_DB.active) NAXOSH_DB.pushUser(u);
    return u;
  }
  function userLogout() { localStorage.removeItem(LS.user); }

  /* جێبەجێکردنی ناوەڕۆکی نووسراو لە کاتی بارکردندا */
  applyContent(loadOverrides());

  return {
    snapshot, saveContent, resetContent, loadOverrides, applyContent,
    isAdmin, adminLogin, adminLogout, adminPw, setAdminPw,
    getUser, userLogin, userLogout
  };
})();
