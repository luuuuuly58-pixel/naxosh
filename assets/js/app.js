/* ============================================================
   app.js — لۆجیکی سەرەکی: مینۆ، فووتەر، تۆمارکردن، گفتوگۆ
   ============================================================ */

/* ---------- یارمەتیدەرە گشتییەکان ---------- */

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

/* ئایکۆنی فلتەر (سلایدەرەکان) — ڕەنگەکەی لە دوگمەکەوە وەردەگرێت */
const FILTER_ICON = `<svg class="filter-svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><circle cx="9" cy="9" r="2.6" fill="#fff"/><circle cx="15" cy="15" r="2.6" fill="#fff"/></svg>`;

/* ئایکۆنی گەڕانەوە (چیڤرۆن بۆ لای ڕاست — ئاراستەی گەڕانەوە لە RTL) */
const BACK_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 5 16 12 9 19"/></svg>`;

/* تۆمارکردنی سێرڤیس وۆرکەر — تاکو ماڵپەڕ ببێتە ئەپێکی دامەزراندنی (PWA) */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* ئەڤاتاری ڕەنگاوڕەنگ بە یەکەم پیتی ناو (بێ پێویستی بە وێنە) */
function avatar(name, size = 56) {
  const colors = ["#0d9488", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0891b2", "#16a34a"];
  const initial = (name || "?").replace("د. ", "").trim().charAt(0);
  const color = colors[(name || "").length % colors.length];
  return `<div class="avatar" style="width:${size}px;height:${size}px;background:${color};font-size:${size * 0.4}px">${initial}</div>`;
}

function specName(id) {
  const s = SPECIALTIES.find(x => x.id === id);
  return s ? s.name : "";
}

function stars(rating) {
  return `<span class="stars">★</span> ${toKurdishDigits(rating)}`;
}

/* ڕۆژەکانی بەردەستی پزیشک (٠=یەکشەممە ... ٦=شەممە) */
function docDays(d) {
  if (Array.isArray(d.days)) return d.days;
  return d.today ? [0, 1, 2, 3, 4, 5, 6] : [];   // گونجاندن لەگەڵ داتای کۆن
}
/* ئایا پزیشک ئەمڕۆ بەردەستە؟ */
function availableToday(d) {
  return docDays(d).includes(new Date().getDay());
}
/* کاتە بەردەستەکانی پزیشک — هەر پزیشکە و کاتی تایبەتی خۆی.
   ئەگەر weekday (٠=یەکشەممە ... ٦=شەممە) بدرێت و پزیشک کاتی تایبەتی ئەو
   ڕۆژەی دانابێت (daySlots)، ئەوە دەگەڕێنرێتەوە — بۆیە دەکرێت هەر ڕۆژێک کاتی
   جیاوازی هەبێت. ئەگەرنا دەکەوێتەوە سەر کاتە گشتییەکان (slots). */
function docSlots(d, weekday) {
  if (d && d.daySlots && weekday != null) {
    const ds = d.daySlots[weekday] != null ? d.daySlots[weekday] : d.daySlots[String(weekday)];
    if (Array.isArray(ds) && ds.length) return ds;
  }
  if (Array.isArray(d.slots) && d.slots.length) return d.slots;
  return (typeof TIME_SLOTS !== "undefined") ? TIME_SLOTS : [];
}
/* بەستەری ژووری چاوپێکەوتنی پزیشک (Google Meet / Whereby / ...) — هەمیشە
   لە پڕۆفایلی ئێستای پزیشکەوە دەخوێنرێتەوە، بۆیە گۆڕینی بەستەر یەکسەر
   لە هەموو تۆمارکردنە کۆنەکانیشدا کاردەکات. */
function docMeet(doctorId) {
  const d = DOCTORS.find(x => x.id === Number(doctorId));
  return (d && typeof d.meet === "string") ? d.meet.trim() : "";
}
/* ڕێکەوت بە شێوەی 2026-06-07 (بە کاتی ناوخۆیی، نەک UTC) */
function isoDate(dt) {
  const p = n => String(n).padStart(2, "0");
  return dt.getFullYear() + "-" + p(dt.getMonth() + 1) + "-" + p(dt.getDate());
}

/* ============================================================
   پەنجەرەی کاتی چاوپێکەوتن
   ------------------------------------------------------------
   • دوگمەی چوونەژوورەوە ٥ خولەک پێش کاتی دیاریکراو دەردەکەوێت.
   • ١٥ خولەک دوای دەستپێک دوگمەکە نامێنێت (کەس ناتوانێت بچێتە ژوورەوە).
   • ٢٠ خولەک دوای دەستپێک ژوورەکە بە زۆر دادەخرێت — هیچ چاوپێکەوتنێک
     لەوە درێژتر نابێت.
   ئەمە پاراستنی ڕاستەقینە نییە (کۆدی لای بەکارهێنەرە) بەڵکو ڕێگری لە
   تێکەڵبوون دەکات: کەس ناتوانێت بچێتە ناو چاوپێکەوتنی کاتێکی تردا.
   ============================================================ */
// ⚠️ TEMP-TEST: کاتەکان کورتکراونەتەوە بۆ تاقیکردنەوە. دوای تاقیکردنەوە
// بگەڕێنەرەوە بۆ: BTN=15min, HARD=20min.
const MEET_OPEN_BEFORE_MS = 5 * 60000;   // ٥ خولەک پێش کاتەکە
const MEET_BTN_AFTER_MS    = 2 * 60000;  // ⚠️ TEMP-TEST (نۆرماڵ: 15min)
const MEET_HARD_AFTER_MS   = 3 * 60000;  // ⚠️ TEMP-TEST (نۆرماڵ: 20min)

/* ژمارە کوردی/عەرەبی/فارسییەکان بگەڕێنەرەوە بۆ ئینگلیزی */
function fromKurdishDigits(s) {
  return String(s)
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
}

/* کاتی دەستپێکی تۆمارێک وەک Date — لە b.date (2026-06-14) و b.time (١٩:٠٠) */
function bookingStart(b) {
  if (!b || !b.date) return null;
  const m = fromKurdishDigits(b.time || "").match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const parts = String(b.date).split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2], Number(m[1]), Number(m[2]), 0, 0);
}

/* دۆخی پەنجەرەی چاوپێکەوتن بۆ تۆمارێک لە کاتی ئێستادا:
   "before" پێش کاتەکە | "open" دوگمە بەردەستە | "live" ژوور کراوەیە بەڵام
   دوگمە نەماوە (١٥–٢٠ خولەک) | "ended" تەواوبووە | "unknown" کات نەزانراوە */
function meetWindow(b, now) {
  const start = bookingStart(b);
  if (!start) return { state: "unknown", start: null };
  const t = (now || new Date()).getTime();
  const s = start.getTime();
  const openAt = s - MEET_OPEN_BEFORE_MS;
  const btnUntil = s + MEET_BTN_AFTER_MS;
  const hardAt = s + MEET_HARD_AFTER_MS;
  let state;
  if (t < openAt) state = "before";
  else if (t < btnUntil) state = "open";
  else if (t < hardAt) state = "live";
  else state = "ended";
  return { state, start, openAt, btnUntil, hardAt };
}

/* کاتەکە بە کوردی-دیجیتی HH:MM */
function clockLabel(dt) {
  const p = n => String(n).padStart(2, "0");
  return toKurdishDigits(p(dt.getHours()) + ":" + p(dt.getMinutes()));
}

/* تۆماری چالاکی ئەم بەکارهێنەرە بۆ ئەم پزیشکە لە کاتی ئێستادا.
   دەگەڕێتەوە: {booking, window} ئەگەر دوگمە/ژوور کراوە بێت، یان
   {booking, window, onlyUpcoming:true} ئەگەر تەنها تۆمارێکی داهاتوو هەبێت،
   یان null ئەگەر هیچ تۆمارێکی پەیوەندیدار نەبێت. */
function activeBookingFor(doctorId, now) {
  const me = (typeof NAXOSH !== "undefined" && NAXOSH.getUser) ? NAXOSH.getUser() : null;
  const mine = getBookings().filter(b =>
    Number(b.doctorId) === Number(doctorId) &&
    // ناسنامە: ئەگەر بەکارهێنەر چووبێتە ژوورەوە، تەنها تۆمارەکانی خۆی؛
    // تۆمارە کۆنەکان بەبێ phoneKey بۆ هەمووان دەردەکەون (وەک پێشتر).
    (!me || !me.phoneKey || !b.phoneKey || b.phoneKey === me.phoneKey));

  let upcoming = null;
  for (const b of mine) {
    const w = meetWindow(b, now);
    if (w.state === "open" || w.state === "live") return { booking: b, window: w };
    if (w.state === "before" && (!upcoming || w.start < upcoming.window.start)) {
      upcoming = { booking: b, window: w };
    }
  }
  return upcoming ? { booking: upcoming.booking, window: upcoming.window, onlyUpcoming: true } : null;
}

/* دۆخی تۆمارکردن (تەنها بۆ داتا — پشتڕاستکردنەوە نەماوە، دوگمەی ژوور یەکسەر دەردەکەوێت) */
const STATUS_PENDING = "چاوەڕوان";

/* ---------- کۆگای ناوخۆیی (localStorage) ---------- */

function getBookings() {
  try { return JSON.parse(localStorage.getItem("naxosh_bookings") || "[]"); }
  catch { return []; }
}
function newBookingId() {
  return String(Date.now()) + "_" + Math.random().toString(36).slice(2, 7);
}
function saveBooking(b) {
  const list = getBookings();
  if (!b.id) b.id = newBookingId();
  b.createdAt = Date.now();
  b.status = STATUS_PENDING;
  list.push(b);
  localStorage.setItem("naxosh_bookings", JSON.stringify(list));
  if (window.NAXOSH_DB && NAXOSH_DB.active) NAXOSH_DB.pushBooking(b);
  return b;
}
function cancelBooking(id) {
  id = String(id);
  const all = getBookings();
  const gone = all.find(b => String(b.id) === id);
  const list = all.filter(b => String(b.id) !== id);
  localStorage.setItem("naxosh_bookings", JSON.stringify(list));
  if (window.NAXOSH_DB && NAXOSH_DB.active) {
    NAXOSH_DB.removeBooking(id);
    // کاتەکە ئازاد بکەرەوە تاکو کەسێکی تر بتوانێت بیگرێت
    if (gone && gone.slotKey) NAXOSH_DB.freeSlot(gone.slotKey);
  }
}

/* ---------- پەڕگەکانی پزیشکی (هاوپێچ) ----------
   هاوپێچەکان لەناو خودی تۆماری چاوپێکەوتنەکەدا (booking.attachments)
   هەڵدەگیرێن وەک دەقی base64. بۆیە بەبێ هیچ ڕێکخستنێکی زیادە، هەمان
   تۆمار هاوکات بۆ نەخۆش و پزیشک و بەڕێوەبەر دەگوازرێتەوە لە هەورەوە —
   واتە پزیشک هاوپێچەکان دەبینێت لەو ساتەوەی نەخۆش زیادی دەکات، پێش
   دەستپێکی چاوپێکەوتنەکەش. وێنەکان بچووک دەکرێنەوە تاکو لە سنووری
   ١MB ـی هەر بەڵگەنامەیەکی Firestore نەترازێن. */
const ATTACH_MAX_DIM     = 1400;          // درێژترین لای وێنە (px)
const ATTACH_IMG_QUALITY = 0.7;           // کوالێتیی JPEG
const ATTACH_MAX_BYTES   = 900 * 1024;    // زۆرترین قەبارەی هەر پەڕگەیەک (≈٩٠٠KB)

function escAttr(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* وێنە بچووک بکەرەوە (canvas) و وەک JPEG بیگەڕێنەرەوە — قەبارە کەم دەکاتەوە */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      const scale = Math.min(1, ATTACH_MAX_DIM / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      try { resolve(c.toDataURL("image/jpeg", ATTACH_IMG_QUALITY)); }
      catch (e) { reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}

/* پەڕگەیەک بکە بە ئۆبجێکتی هاوپێچ. وێنە بچووک دەکرێتەوە؛ ئەگەر دوای
   ئەوەش هێشتا گەورە بێت {tooBig:true} دەگەڕێتەوە. */
async function fileToAttachment(file, by) {
  const isImg = /^image\//.test(file.type || "");
  let data;
  if (isImg) {
    try { data = await compressImage(file); }
    catch { data = await readFileAsDataURL(file); }
  } else {
    data = await readFileAsDataURL(file);
  }
  // درێژیی دەقی base64 ≈ ٤/٣ ـی ژمارەی بایتەکان
  if (typeof data !== "string" || data.length > ATTACH_MAX_BYTES * 1.37) {
    return { tooBig: true, name: file.name };
  }
  return {
    id: newBookingId(),
    name: file.name || (isImg ? "وێنە.jpg" : "پەڕگە"),
    type: isImg ? "image/jpeg" : (file.type || "application/octet-stream"),
    data, by: by || "patient", at: Date.now()
  };
}

/* لیستێک پەڕگە بکە بە هاوپێچ — ئەوانەی زۆر گەورەن ئاگادارکردنەوەیان بۆ دەکرێت */
async function filesToAttachments(fileList, by) {
  const out = [], tooBig = [];
  for (const f of Array.from(fileList || [])) {
    try {
      const a = await fileToAttachment(f, by);
      if (a.tooBig) tooBig.push(a.name); else out.push(a);
    } catch (_) { tooBig.push(f.name); }
  }
  if (tooBig.length) {
    alert("ئەم پەڕگانە زۆر گەورەن و زیاد نەکران:\n• " + tooBig.join("\n• ") +
          "\n\nتکایە وێنەیەکی بچووکتر یان پەڕگەیەکی بچووکتر هەڵبژێرە.");
  }
  return out;
}

/* پیشاندانی هاوپێچەکان — وێنە وەک تەسبیحەی بچووک، پەڕگەی تر وەک بەستەر.
   opts.removable=true → دوگمەی سڕینەوە (لە فۆڕمی تۆمارکردندا).
   کرتە لەسەر هەر یەکێک لە تابێکی نوێ دەیکاتەوە. */
function attachmentsHtml(list, opts) {
  opts = opts || {};
  if (!Array.isArray(list) || !list.length) return "";
  const items = list.map(a => {
    const isImg = /^image\//.test(a.type || "");
    const thumb = isImg
      ? `<img src="${a.data}" alt="${escAttr(a.name)}" loading="lazy">`
      : `<span class="attach-file-ico">📄</span>`;
    const rm = opts.removable
      ? `<button type="button" class="attach-rm" data-attach="${escAttr(a.id)}" aria-label="سڕینەوە">✕</button>` : "";
    return `<div class="attach-item">
      <a class="attach-thumb" href="${a.data}" target="_blank" rel="noopener"
         data-att-name="${escAttr(a.name)}" data-att-type="${escAttr(a.type || "")}">${thumb}</a>
      <span class="attach-name">${escAttr(a.name)}</span>
      ${rm}
    </div>`;
  }).join("");
  return `<div class="attach-list">${items}</div>`;
}

/* داتا-URI بگۆڕە بۆ Blob — وەبگەڕانی نوێ بۆ data: لە زۆر براوزەردا
   بلۆک دەکرێت، بەڵام Blob URL کار دەکات. */
function dataUriToBlobUrl(dataUri) {
  const parts = String(dataUri).split(",");
  const mime = (parts[0].match(/data:([^;]+)/) || [, "application/octet-stream"])[1];
  const bin = atob(parts[1] || "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

/* هاوپێچ یەکسەر لەناو لاپەڕەدا پیشان بدە — وێنە و PDF بەبێ داگرتن. */
function openAttachmentViewer(att) {
  const type = att.type || "";
  const name = att.name || "پەڕگە";
  const isImg = /^image\//.test(type);
  const isPdf = /pdf/i.test(type) || /\.pdf$/i.test(name);
  let blobUrl = "";
  let inner;

  if (isImg) {
    inner = `<img class="viewer-img" src="${att.data}" alt="${escAttr(name)}">`;
  } else if (isPdf) {
    blobUrl = dataUriToBlobUrl(att.data);
    inner = `<iframe class="viewer-frame" src="${blobUrl}" title="${escAttr(name)}"></iframe>`;
  } else {
    inner = `<div class="viewer-fallback">
      <span class="attach-file-ico">📄</span>
      <p>${escAttr(name)}</p>
      <p class="muted">ئەم جۆرە پەڕگەیە ناتوانرێت لێرە پیشان بدرێت.</p>
    </div>`;
  }

  const overlay = document.createElement("div");
  overlay.className = "viewer-overlay";
  overlay.innerHTML = `
    <div class="viewer-box">
      <div class="viewer-head">
        <span class="viewer-title">${escAttr(name)}</span>
        <a class="viewer-dl" href="${att.data}" download="${escAttr(name)}" title="داگرتن">⬇</a>
        <button class="viewer-close" type="button" aria-label="داخستن">✕</button>
      </div>
      <div class="viewer-body">${inner}</div>
    </div>`;
  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape") close(); }
  overlay.querySelector(".viewer-close").addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", onKey);
}

/* کرتە لەسەر هەر هاوپێچێک → بینەری ناوخۆیی بکەرەوە (لە جیاتی داگرتن). */
document.addEventListener("click", function (e) {
  const a = e.target.closest && e.target.closest(".attach-thumb");
  if (!a) return;
  e.preventDefault();
  openAttachmentViewer({
    data: a.getAttribute("href"),
    name: a.getAttribute("data-att-name") || "",
    type: a.getAttribute("data-att-type") || ""
  });
});

/* هاوپێچی نوێ زیاد بکە بۆ تۆمارێکی هەبوو — ناوخۆیی پاشەکەوتی بکە و بۆ
   هەوریش بینێرە (بۆیە پزیشک یەکسەر دەیبینێت). لیستی نوێ دەگەڕێنێتەوە. */
function addAttachmentsToBooking(bookingId, newAtts) {
  bookingId = String(bookingId);
  const list = getBookings();
  const b = list.find(x => String(x.id) === bookingId);
  if (!b) return null;
  b.attachments = (Array.isArray(b.attachments) ? b.attachments : []).concat(newAtts || []);
  localStorage.setItem("naxosh_bookings", JSON.stringify(list));
  if (window.NAXOSH_DB && NAXOSH_DB.active) NAXOSH_DB.updateBooking(bookingId, { attachments: b.attachments });
  return b.attachments;
}

function getChat(doctorId) {
  try { return JSON.parse(localStorage.getItem("naxosh_chat_" + doctorId) || "[]"); }
  catch { return []; }
}
function saveChat(doctorId, messages) {
  localStorage.setItem("naxosh_chat_" + doctorId, JSON.stringify(messages));
}

/* ---------- مینۆ و فووتەر و ئاگاداری فریاکەوتن ---------- */

/* زانیاری هەر پەڕەیەک: ناونیشانی سەرەوە، دوگمەی گەڕانەوە، و تابی چالاک لە خوارەوە */
const PAGE_META = {
  home:         { title: "نەخۆشم", back: false, tab: "home", logo: true },
  doctors:      { title: "دکتۆر ببینە", back: true, tab: "home" },
  doctor:       { title: "تۆمارکردنی چاوپێکەوتن", back: true, tab: "home" },
  specialties:  { title: "خزمەتگوزارییەکان", back: true, tab: "home" },
  appointments: { title: "چاوپێکەوتنەکانم", back: false, tab: "appts" },
  meeting:      { title: "چاوپێکەوتنی ڤیدیۆ", back: true, tab: "appts" },
  chat:         { title: "گفتوگۆ", back: true, tab: "appts" }
};

/* ناونیشانی تابی هەژمار — بەپێی ئەوەی کێ چووەتە ژوورەوە */
function accountLabel() {
  if (NAXOSH.isAdmin()) return "داشبۆرد";
  if (window.NAXOSH_DB && NAXOSH_DB.active && NAXOSH_DB.isDoctor()) return "داشبۆرد";
  return "هەژمار";
}

/* کرتە لەسەر تابی هەژمار: بەڕێوەبەر/پزیشک → داشبۆرد، نەخۆش → دەرچوون، بەتاڵ → چوونەژوورەوە */
function openAccount() {
  if (NAXOSH.isAdmin()) { location.href = "admin.html"; return; }
  if (window.NAXOSH_DB && NAXOSH_DB.active && NAXOSH_DB.isDoctor()) { location.href = "doctor-panel.html"; return; }
  const u = NAXOSH.getUser();
  if (u) {
    if (confirm((u.name || "") + "\n\nدەرچوون لە هەژمار؟")) { NAXOSH.userLogout(); location.reload(); }
    return;
  }
  openAuthModal();
}

function goBack() {
  if (history.length > 1) history.back();
  else location.href = "index.html";
}

/* تابی خوارەوە — لە هەموو پەڕەکاندا (لەوانە داشبۆردی بەڕێوەبەر/پزیشک)
   بۆ ئەوەی هەمیشە بتوانرێت بگەڕێیتەوە سەرەتا یان چاوپێکەوتنەکان. */
function tabbarHtml(activeTab) {
  const tab = id => activeTab === id ? "tab tab-active" : "tab";
  return `
    <nav class="tabbar">
      <a href="index.html" class="${tab('home')}">
        <span class="tab-ico">🏠</span><span>سەرەتا</span>
      </a>
      <a href="appointments.html" class="${tab('appts')}">
        <span class="tab-ico">📅</span><span>چاوپێکەوتنەکانم</span>
      </a>
      <a href="#" class="${tab('account')}" onclick="openAccount();return false">
        <span class="tab-ico">👤</span><span>${accountLabel()}</span>
      </a>
    </nav>`;
}

function renderChrome(active) {
  const header = document.getElementById("site-header");
  const footer = document.getElementById("site-footer");

  // پەڕەکانی بەڕێوەبەر/پزیشک باری تایبەتی خۆیان هەیە — سەردێڕیان پێ نادرێت،
  // بەڵام تابی خوارەوە دەهێڵدرێتەوە بۆ گەڕانەوە بۆ سەرەتا/چاوپێکەوتنەکان
  const isPanel = document.getElementById("admin-root") || document.getElementById("dr-root");
  if (isPanel) {
    if (header) header.innerHTML = "";
    if (footer) footer.innerHTML = tabbarHtml("account");
    document.body.classList.add("has-tabbar");
    return;
  }

  const meta = PAGE_META[active] || { title: "نەخۆشم", back: false, tab: "home" };
  document.body.classList.add("has-tabbar");

  const center = meta.logo
    ? `<img class="appbar-logo" src="assets/img/logo-teal.svg" alt="نەخۆشم">`
    : `<span class="app-title">${meta.title}</span>`;
  if (header) {
    header.innerHTML = `
      <div class="app-bar">
        ${meta.back
          ? `<button class="app-back" aria-label="${STR.common.back}" onclick="goBack()">${BACK_ICON}</button>`
          : `<span></span>`}
        ${center}
        <span></span>
      </div>`;
  }

  if (footer) footer.innerHTML = tabbarHtml(meta.tab);
}

/* ---------- چوونەژوورەوەی بەکارهێنەر (ناو + تەلەفۆن) ---------- */

function openAuthModal(onSuccess) {
  onSuccess = typeof onSuccess === "function" ? onSuccess : function () {};
  const existing = NAXOSH.getUser() || { name: "", phone: "" };
  const online = window.NAXOSH_DB && NAXOSH_DB.active;

  const overlay = el(`
    <div class="modal-overlay">
      <div class="modal">
        <button class="modal-close" aria-label="${STR.auth.cancel}">✕</button>

        <!-- چوونەژوورەوەی نەخۆش -->
        <div id="auth-patient">
          <h2>${STR.auth.loginTitle}</h2>
          <p class="modal-sub">${STR.auth.loginSub}</p>
          <label>${STR.auth.fullName}</label>
          <input type="text" id="auth-name" value="${existing.name}" placeholder="${STR.auth.fullNamePh}">
          <label>${STR.auth.phone}</label>
          <input type="tel" id="auth-phone" value="${existing.phone}" placeholder="0750 123 4567" dir="ltr" inputmode="tel">
          <p class="auth-err" id="auth-err"></p>
          <button class="btn btn-primary btn-block" id="auth-go">${STR.auth.continue}</button>
          <a href="#" class="auth-switch" id="to-staff">${STR.auth.staffLink}</a>
        </div>

        <!-- چوونەژوورەوەی پزیشک / بەڕێوەبەر -->
        <div id="auth-staff" hidden>
          <h2>${STR.auth.staffTitle}</h2>
          <p class="modal-sub">${STR.auth.staffSub}</p>
          ${online ? `<label>${STR.admin.email}</label>
          <input type="email" id="staff-email" dir="ltr" autocomplete="username">` : ``}
          <label>${STR.admin.password}</label>
          <input type="password" id="staff-pw" dir="ltr" autocomplete="current-password">
          <p class="auth-err" id="staff-err"></p>
          <button class="btn btn-primary btn-block" id="staff-go">${STR.admin.enter}</button>
          <a href="#" class="auth-switch" id="to-patient">${STR.auth.patientLink}</a>
        </div>
      </div>
    </div>`);

  function close() { overlay.remove(); }
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  overlay.querySelector(".modal-close").addEventListener("click", close);

  const patientBox = overlay.querySelector("#auth-patient");
  const staffBox = overlay.querySelector("#auth-staff");
  overlay.querySelector("#to-staff").addEventListener("click", e => {
    e.preventDefault(); patientBox.hidden = true; staffBox.hidden = false;
    (overlay.querySelector("#staff-email") || overlay.querySelector("#staff-pw")).focus();
  });
  overlay.querySelector("#to-patient").addEventListener("click", e => {
    e.preventDefault(); staffBox.hidden = true; patientBox.hidden = false;
    overlay.querySelector("#auth-name").focus();
  });

  /* --- چوونەژوورەوەی نەخۆش --- */
  function patientGo() {
    const name = overlay.querySelector("#auth-name").value.trim();
    const phone = overlay.querySelector("#auth-phone").value.trim();
    const err = overlay.querySelector("#auth-err");
    if (name.split(/\s+/).filter(Boolean).length < 2) { err.textContent = STR.auth.needName; return; }
    if (!validPhone(phone)) { err.textContent = STR.auth.needPhone; return; }
    NAXOSH.userLogin(name, phone);
    close();
    renderChrome(document.body.dataset.page);
    onSuccess();
  }
  overlay.querySelector("#auth-go").addEventListener("click", patientGo);
  overlay.querySelector("#auth-phone").addEventListener("keydown", e => { if (e.key === "Enter") patientGo(); });

  /* --- چوونەژوورەوەی پزیشک / بەڕێوەبەر --- */
  function staffGo() {
    const pw = overlay.querySelector("#staff-pw").value;
    const err = overlay.querySelector("#staff-err");
    const btn = overlay.querySelector("#staff-go");
    if (online) {
      const email = overlay.querySelector("#staff-email").value;
      btn.disabled = true; err.textContent = "";
      NAXOSH_DB.adminSignIn(email, pw).then(ok => {
        btn.disabled = false;
        if (ok) { close(); /* naxosh:auth مینۆ نوێ دەکاتەوە */ }
        else err.textContent = STR.auth.staffWrong;
      });
    } else {
      if (NAXOSH.adminLogin(pw)) { close(); renderChrome(document.body.dataset.page); }
      else err.textContent = STR.auth.staffWrong;
    }
  }
  overlay.querySelector("#staff-go").addEventListener("click", staffGo);
  overlay.querySelector("#staff-pw").addEventListener("keydown", e => { if (e.key === "Enter") staffGo(); });

  document.body.appendChild(overlay);
  overlay.querySelector("#auth-name").focus();
}

/* ---------- کارتی پزیشک ---------- */

function doctorCard(d) {
  // کارتی سادە و گەورە — هەموو کارتەکە کرتەکراوە بۆ تۆمارکردن (بێ دوگمەی دووانە)
  const spec = SPECIALTIES.find(s => s.id === d.spec);
  return `
    <a class="doc-card" href="doctor.html?id=${d.id}">
      <div class="doc-head">
        ${avatar(d.name, 60)}
        <div class="doc-head-info">
          <h3>${d.name}</h3>
          <p class="doc-title">${spec ? spec.name : d.title}</p>
        </div>
        <span class="doc-chevron">‹</span>
      </div>
      <div class="doc-foot">
        <span class="doc-price">${formatPrice(d.price)} ${STR.common.currency}</span>
      </div>
    </a>`;
}

/* ---------- پەیجی پزیشکەکان (doctors.html) ---------- */

function initDoctors() {
  const grid = document.getElementById("doc-grid");
  const filterBar = document.getElementById("filter-bar");
  const toggle = document.getElementById("filter-toggle");
  const toggleLabel = document.getElementById("filter-toggle-label");
  if (!grid) return;

  const preset = qs("spec");
  let current = preset || "all";

  const chips = [{ id: "all", name: STR.common.all }, ...SPECIALTIES.map(s => ({ id: s.id, name: s.name }))];
  filterBar.innerHTML = chips.map(c =>
    `<button class="chip ${c.id === current ? 'chip-active' : ''}" data-id="${c.id}">${c.name}</button>`
  ).join("");

  // ناوی فلتەری ئێستا لەسەر دوگمەکە پیشان بدە
  function refreshLabel() {
    if (!toggleLabel) return;
    const active = chips.find(c => c.id === current);
    toggleLabel.textContent = (current === "all" || !active) ? "فلتەر" : active.name;
  }

  function render() {
    const list = current === "all" ? DOCTORS : DOCTORS.filter(d => d.spec === current);
    grid.innerHTML = list.length
      ? list.map(doctorCard).join("")
      : `<p class="empty">هیچ پزیشکێک نەدۆزرایەوە.</p>`;
  }

  // دوگمەی فلتەر — فلتەرەکان داپۆشراون تاکو دابگیردرێن
  if (toggle) {
    toggle.addEventListener("click", () => {
      const open = filterBar.hasAttribute("hidden");
      if (open) { filterBar.removeAttribute("hidden"); toggle.setAttribute("aria-expanded", "true"); toggle.classList.add("open"); }
      else { filterBar.setAttribute("hidden", ""); toggle.setAttribute("aria-expanded", "false"); toggle.classList.remove("open"); }
    });
  }

  filterBar.addEventListener("click", e => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    current = btn.dataset.id;
    [...filterBar.children].forEach(c => c.classList.toggle("chip-active", c === btn));
    render();
    refreshLabel();
    // پاش هەڵبژاردن، لیستی فلتەر دابپۆشە
    if (toggle) { filterBar.setAttribute("hidden", ""); toggle.setAttribute("aria-expanded", "false"); toggle.classList.remove("open"); }
  });

  refreshLabel();
  render();
}

/* ---------- پەیجی پزیشک + تۆمارکردن (doctor.html) ---------- */

function initDoctorProfile() {
  const wrap = document.getElementById("doctor-detail");
  if (!wrap) return;

  const d = DOCTORS.find(x => x.id === Number(qs("id"))) || DOCTORS[0];
  const spec = SPECIALTIES.find(s => s.id === d.spec);

  // پڕۆفایلێکی ساکار: ناو، پسپۆڕی، دۆخی ئەمڕۆ، نرخ — بێ دەقی زیاد
  wrap.innerHTML = `
    <div class="profile-card">
      <div class="profile-head">
        ${avatar(d.name, 64)}
        <div>
          <h1>${d.name}</h1>
          <p class="doc-title">${spec ? spec.name : d.title}</p>
        </div>
      </div>
      <div class="doc-price">${formatPrice(d.price)} ${STR.common.currency}</div>
    </div>

    <div class="booking-card" id="booking-card">
      <label class="book-label">ڕۆژ</label>
      <div class="days" id="days"></div>
      <label class="book-label">کات</label>
      <div class="slots" id="slots"></div>
      <a href="#" class="note-toggle" id="note-toggle">＋ تێبینی و پەڕگەی پزیشکی زیاد بکە</a>
      <div id="note-extra" hidden>
        <textarea id="symptoms" rows="3" placeholder="نیشانەکانت بنووسە..."></textarea>
        <label class="attach-label">📎 پەڕگەی پزیشکی (تۆماری پێشوو، وێنەی پشکنین، ...)</label>
        <input type="file" id="attach-input" accept="image/*,application/pdf" multiple hidden>
        <button type="button" class="btn btn-ghost btn-block attach-btn" id="attach-btn">📎 هەڵبژاردنی پەڕگە</button>
        <p class="muted attach-hint">دکتۆرەکەت پێش چاوپێکەوتنەکە دەیبینێت.</p>
        <div class="attach-preview" id="attach-preview"></div>
      </div>
      <button class="btn btn-primary btn-block btn-lg" id="confirm-btn">تۆمارکردنی ڤیدیۆچات</button>
    </div>`;

  // تێبینی و پەڕگەکان شاراوەن تاکو پەڕە ساکار بێت — کرتە لێبکە بۆ کردنەوەی
  const noteToggle = document.getElementById("note-toggle");
  const noteExtra = document.getElementById("note-extra");
  const symBox = document.getElementById("symptoms");
  noteToggle.addEventListener("click", e => {
    e.preventDefault(); noteExtra.hidden = false; noteToggle.style.display = "none"; symBox.focus();
  });

  // هاوپێچەکان (پەڕگەی پزیشکی) — لە کاتی تۆمارکردندا کۆ دەکرێنەوە
  let pendingAttach = [];
  const attachInput = document.getElementById("attach-input");
  const attachBtn = document.getElementById("attach-btn");
  const attachPreview = document.getElementById("attach-preview");
  function renderPendingAttach() {
    attachPreview.innerHTML = attachmentsHtml(pendingAttach, { removable: true });
  }
  attachBtn.addEventListener("click", () => attachInput.click());
  attachInput.addEventListener("change", async () => {
    attachBtn.disabled = true;
    const prev = attachBtn.textContent; attachBtn.textContent = "...چاوەڕێ بکە";
    const added = await filesToAttachments(attachInput.files, "patient");
    attachInput.value = "";
    pendingAttach = pendingAttach.concat(added);
    attachBtn.disabled = false; attachBtn.textContent = prev;
    renderPendingAttach();
  });
  attachPreview.addEventListener("click", e => {
    const rm = e.target.closest(".attach-rm"); if (!rm) return;
    pendingAttach = pendingAttach.filter(a => a.id !== rm.dataset.attach);
    renderPendingAttach();
  });

  // ڕۆژەکان (٧ ڕۆژی داهاتوو) — تەنها ئەو ڕۆژانە بەردەستن کە پزیشک کاری تێدا دەکات
  const dayNames = STR.days || ["یەکشەممە", "دووشەممە", "سێشەممە", "چوارشەممە", "پێنجشەممە", "هەینی", "شەممە"];
  const daysBox = document.getElementById("days");
  const today = new Date();
  const avail = docDays(d);
  // تۆمارکردن لانیکەم ١ ڕۆژ پێشتر دەکرێت — ئەمڕۆ ناکرێت. بۆیە لە سبەینێوە
  // (i=1) تا ٧ ڕۆژی داهاتوو پیشان دەدرێن.
  // ⚠️ TEMP-TEST: i=0 ئەمڕۆش ڕێگەپێدراوە بۆ تاقیکردنەوەی دوگمەی ڤیدیۆ — دواتر بگەڕێنەرەوە بۆ i=1.
  let chosenDay = null, chosenSlot = null, firstAvail = null;
  for (let i = 0; i <= 7; i++) {
    const dt = new Date(today.getTime() + i * 86400000);
    const ok = avail.includes(dt.getDay());
    if (ok && firstAvail === null) firstAvail = i;
    const label = dayNames[dt.getDay()];
    daysBox.appendChild(el(`<button class="day ${i === firstAvail ? 'day-active' : ''} ${ok ? '' : 'day-off'}" data-i="${i}" ${ok ? '' : 'disabled'}>
      <span>${label}</span><span class="day-date">${toKurdishDigits(dt.getDate())}ی مانگ</span></button>`));
  }
  chosenDay = firstAvail;
  if (firstAvail === null) {
    daysBox.insertAdjacentHTML("afterend", `<p class="muted" style="margin-top:8px">ئەم پزیشکە لەم ٧ ڕۆژەی داهاتوودا بەردەست نییە.</p>`);
  }

  /* --- کاتەکان: کاتی تایبەتی ئەم پزیشکە + داخستنی کاتە گیراوەکان --- */
  const slotsBox = document.getElementById("slots");
  let takenSet = new Set();   // "date|time" بۆ هەر کاتێکی گیراو

  function dateForOffset(i) { return isoDate(new Date(today.getTime() + i * 86400000)); }

  function renderSlots() {
    // ڕۆژی هەفتەی ئەو ڕۆژەی هەڵبژێردراوە — تاکو کاتە تایبەتەکانی ئەو ڕۆژە بهێنرێن
    const weekday = chosenDay === null ? null : new Date(today.getTime() + chosenDay * 86400000).getDay();
    const slots = docSlots(d, weekday);
    if (!slots.length) {
      slotsBox.innerHTML = `<p class="muted">هیچ کاتێک دانەنراوە بۆ ئەم ڕۆژە.</p>`;
      return;
    }
    const date = chosenDay === null ? null : dateForOffset(chosenDay);
    slotsBox.innerHTML = slots.map(t => {
      const taken = date !== null && takenSet.has(date + "|" + t);
      return `<button class="slot ${taken ? 'slot-taken' : ''} ${t === chosenSlot ? 'slot-active' : ''}" data-t="${t}" ${taken ? "disabled" : ""}>${taken ? t + " — گیراوە" : t}</button>`;
    }).join("");
  }
  renderSlots();

  // کاتە گیراوەکان: لە هەورەوە (هاوکات) یان لە کۆگای ناوخۆییەوە
  if (window.NAXOSH_DB && NAXOSH_DB.active) {
    NAXOSH_DB.whenReady(() => {
      NAXOSH_DB.watchTaken(d.id, list => {
        takenSet = new Set(list.map(t => t.date + "|" + t.time));
        renderSlots();
      });
    });
  } else {
    takenSet = new Set(getBookings()
      .filter(b => b.doctorId === d.id && b.date && b.time)
      .map(b => b.date + "|" + b.time));
    renderSlots();
  }

  daysBox.addEventListener("click", e => {
    const b = e.target.closest(".day"); if (!b || b.disabled) return;
    chosenDay = Number(b.dataset.i);
    chosenSlot = null;   // گۆڕینی ڕۆژ، هەڵبژاردنی کات دەسڕێتەوە
    [...daysBox.children].forEach(c => c.classList.toggle("day-active", c === b));
    renderSlots();
  });

  slotsBox.addEventListener("click", e => {
    const b = e.target.closest(".slot"); if (!b || b.disabled) return;
    chosenSlot = b.dataset.t;
    [...slotsBox.children].forEach(c => c.classList.toggle("slot-active", c === b));
  });

  document.getElementById("confirm-btn").addEventListener("click", () => {
    if (chosenDay === null) { alert("ئەم پزیشکە ڕۆژی بەردەستی نییە."); return; }
    if (!chosenSlot) { alert("تکایە کاتێک هەڵبژێرە."); return; }

    const finalize = () => {
      const user = NAXOSH.getUser();
      const dt = new Date(today.getTime() + chosenDay * 86400000);
      const date = isoDate(dt);
      const dayLabel = dayNames[dt.getDay()];
      const slotKey = d.id + "_" + date + "_" + chosenSlot;
      const rec = {
        id: newBookingId(),
        doctorId: d.id, doctorName: d.name, doctorTitle: d.title,
        spec: d.spec, price: d.price,
        date, slotKey,
        day: `${dayLabel} ${toKurdishDigits(dt.getDate())}ی مانگ`,
        time: chosenSlot,
        symptoms: document.getElementById("symptoms").value.trim(),
        attachments: pendingAttach.slice(),
        userName: user ? user.name : "",
        userPhone: user ? user.phone : "",
        phoneKey: user ? user.phoneKey : ""
      };
      const slotJustTaken = () => {
        alert("ببورە، ئەم کاتە هەر ئێستا لەلایەن کەسێکی ترەوە گیرا. تکایە کاتێکی تر هەڵبژێرە.");
        takenSet.add(date + "|" + chosenSlot);
        chosenSlot = null;
        renderSlots();
      };
      if (window.NAXOSH_DB && NAXOSH_DB.active) {
        // سەرەتا کاتەکە بگرە — ئەگەر کەسێکی تر پێش تۆ گرتبووی، تۆمارکردن ناکرێت
        NAXOSH_DB.takeSlot(slotKey, { doctorId: d.id, date, time: chosenSlot, bookingId: rec.id }).then(ok => {
          if (!ok) { slotJustTaken(); return; }
          showBookingSuccess(d, saveBooking(rec));
        });
      } else {
        if (takenSet.has(date + "|" + chosenSlot)) { slotJustTaken(); return; }
        showBookingSuccess(d, saveBooking(rec));
      }
    };

    // پێش تۆمارکردنی کۆتایی، پێویستە بەکارهێنەر ناو و ژمارەی بنووسێت
    if (!NAXOSH.getUser()) { openAuthModal(finalize); return; }
    finalize();
  });
}

function showBookingSuccess(d, booking) {
  const card = document.getElementById("booking-card");
  const meet = docMeet(d.id);
  card.innerHTML = `
    <div class="success">
      <div class="success-icon">✅</div>
      <h2>تۆمار کرا</h2>
      <p class="success-when">📅 ${booking.day} — 🕐 ${booking.time}</p>
      ${meet
        ? `<p class="success-note">🕐 لە کاتی دیاریکراودا، دوگمەی «چوونە ناو چاوپێکەوتن» لە بەشی «چاوپێکەوتنەکانم» دەردەکەوێت — دەتوانیت ٥ خولەک پێش کاتەکە بچیتە ژوورەوە. ژوورەکە ٢٠ خولەک دوای دەستپێک دادەخرێت.</p>
           <a class="btn btn-primary btn-block btn-lg" href="appointments.html">📅 چاوپێکەوتنەکانم</a>`
        : `<p class="success-note">📞 پزیشک پەیوەندیت پێوە دەکات.</p>`}
    </div>`;
}

/* ---------- پەیجی ژووری چاوپێکەوتن (meeting.html) ----------
   ئەگەر ژووری پزیشک لە Daily بێت (daily.co) — ڤیدیۆکە ڕاستەوخۆ لەناو
   ماڵپەڕەکەدا دەکرێتەوە. بۆ خزمەتگوزارییەکانی تر (Whereby/Meet کە ڕێگە
   بە دانان لەناو ماڵپەڕ نادەن) دوگمەیەک دەردەکەوێت بۆ کردنەوەی ژوورەکە. */

/* تایمەرەکانی پەنجەرەی کات — لە ئاستی مۆدیوڵدا تاکو نوێکردنەوەی پەڕە
   (بۆ نموونە لە ڕووداوی naxosh:content) تایمەرەکان کۆ نەکاتەوە. */
let _meetHardTimer = null, _meetOpenTimer = null;
function clearMeetTimers() {
  if (_meetHardTimer) { clearTimeout(_meetHardTimer); _meetHardTimer = null; }
  if (_meetOpenTimer) { clearTimeout(_meetOpenTimer); _meetOpenTimer = null; }
}

function initMeeting() {
  const wrap = document.getElementById("meeting-root");
  if (!wrap) return;
  const d = DOCTORS.find(x => x.id === Number(qs("doctor"))) || DOCTORS[0];
  const meet = docMeet(d.id);
  clearMeetTimers();

  const head = `
    <div class="meet-head">
      ${avatar(d.name, 44)}
      <div><strong>${d.name}</strong><span class="muted"> ${d.title}</span></div>
      <span class="meet-note">🕐 تکایە ڕێک لە کاتی دیاریکراودا بەشداربە</span>
    </div>`;

  const notice = (icon, title, body) => {
    wrap.dataset.meet = "";   // ڕێگە بدە دواتر دووبارە دروست بکرێتەوە
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <h3>${title}</h3>
        <p>${body}</p>
        <a class="btn btn-ghost" href="appointments.html">گەڕانەوە بۆ چاوپێکەوتنەکانم</a>
      </div>`;
  };

  if (!meet) {
    notice("📞", "ژووری چاوپێکەوتن هێشتا دانەنراوە",
      "پزیشک لە کاتی دیاریکراودا پەیوەندیت پێوە دەکات.");
    return;
  }

  // پشکنینی ناسنامە + کات: تەنها بەکارهێنەرێک کە تۆمارێکی چالاکی هەیە
  // لەگەڵ ئەم پزیشکەدا و لە پەنجەرەی کاتیدایە دەتوانێت بچێتە ژوورەوە.
  const active = activeBookingFor(d.id);

  if (!active) {
    notice("🔒", "ئەم چاوپێکەوتنە بۆ تۆ نییە",
      "هیچ چاوپێکەوتنێکی چالاکت لەگەڵ ئەم پزیشکەدا نییە لە کاتی ئێستادا. تکایە لە کاتی تۆمارکراودا بگەڕێوە، یان چاوپێکەوتنێک تۆمار بکە.");
    return;
  }

  // تۆمارەکە هەیە بەڵام هێشتا کاتی نەهاتووە — تا کاتەکە چاوەڕێ بکە و
  // پاشان خۆکارانە ژوورەکە بکەرەوە (بەبێ نوێکردنەوەی دەستی).
  if (active.onlyUpcoming) {
    const w = active.window;
    notice("🕐", `چاوپێکەوتنەکەت لە کاتی ${clockLabel(w.start)} دەستپێدەکات`,
      `دەتوانیت ٥ خولەک پێش کاتەکە بچیتە ژوورەوە. ئەم پەڕەیە خۆی دەکرێتەوە کاتێک کاتەکە دێت.`);
    const ms = w.openAt - Date.now();
    _meetOpenTimer = setTimeout(initMeeting, Math.max(1000, ms + 500));
    return;
  }

  // چالاک (open یان live) — ژوورەکە پیشان بدە و تایمەری داخستن دابنێ
  showMeetRoom(wrap, head, meet, active.booking);
  const ms = active.window.hardAt - Date.now();
  _meetHardTimer = setTimeout(() => endMeetingInPlace(wrap), Math.max(1000, ms));
}

/* ژوورەکە پیشان بدە (iframe بۆ Daily/Whereby Embedded، ئەگەرنا دوگمەی کردنەوە).
   ئەگەر هەمان ژوور پێشتر کراوەتەوە، دووبارە دروستی ناکەینەوە (پەیوەندی نەپچڕێت). */
function showMeetRoom(wrap, head, meet, booking) {
  // ئەگەر هەمان ژوور پێشتر کراوەتەوە، iframe دووبارە دروست ناکەینەوە (پەیوەندی
  // نەپچڕێت) — بەڵام لیستی هاوپێچەکان نوێ دەکەینەوە (لەوانەیە گۆڕابن).
  if (wrap.dataset.meet === meet && wrap.querySelector(".meet-frame, .meet-room")) {
    renderMeetAttach(booking);
    return;
  }
  wrap.dataset.meet = meet;

  let host = "";
  try { host = new URL(meet).hostname.toLowerCase(); } catch (_) {}
  // Daily (xxx.daily.co) و Whereby Embedded (xxx.whereby.com — بە ژێردۆمەین)
  // ڕێگە بە پیشاندان لەناو ماڵپەڕدا دەدەن؛ whereby.com ی ئاسایی و Meet نا.
  const isDaily = /(^|\.)daily\.co$/.test(host);
  const isWherebyEmbedded = /\.whereby\.com$/.test(host) && host !== "www.whereby.com";
  const embeddable = isDaily || isWherebyEmbedded;

  if (embeddable) {
    let src = meet;
    const addParam = (u, kv) => u + (u.includes("?") ? "&" : "?") + kv;
    if (isWherebyEmbedded) {
      // ناوی نەخۆش پێشوەخت بنێرە — بۆیە Whereby پەڕەی «Your name» تێناپەڕێنێت
      const u = (typeof NAXOSH !== "undefined" && NAXOSH.getUser) ? NAXOSH.getUser() : null;
      const nm = (u && u.name) ? u.name : "میوان";
      if (!/[?&]embed\b/.test(src)) src = addParam(src, "embed");
      if (!/[?&]displayName=/.test(src)) src = addParam(src, "displayName=" + encodeURIComponent(nm));
      // پەڕەی پێش‌چوونەژوورەوە (precall) لاببە تاکو ڕاستەوخۆ بچێتە ژوورەوە
      if (!/[?&]precallReview=/.test(src)) src = addParam(src, "precallReview=off");
    }
    wrap.innerHTML = `${head}
      <iframe class="meet-frame" src="${src}"
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        allowfullscreen></iframe>
      <p class="muted meet-tip">ئەگەر داوای ڕێگەپێدانی کامێرا و مایکرۆفۆن کرا، «Allow» دابگرە.</p>
      <div class="meet-attach" id="meet-attach"></div>`;
  } else {
    wrap.innerHTML = `${head}
      <div class="empty-state meet-room">
        <div class="empty-icon">🎥</div>
        <h3>ژووری چاوپێکەوتن ئامادەیە</h3>
        <p>ئەم ژوورە لە پەنجەرەی خۆیدا دەکرێتەوە — پزیشک ڕێگەت پێدەدات بۆ چوونەژوورەوە.</p>
        <a class="btn btn-primary" href="${meet}" target="_blank" rel="noopener">چوونە ناو ژوورەکە</a>
      </div>
      <div class="meet-attach" id="meet-attach"></div>`;
  }
  renderMeetAttach(booking);
}

/* پانێڵی هاوپێچەکان لەناو ژووری چاوپێکەوتندا — نەخۆش (یان پزیشک) دەتوانێت
   لە کاتی چاوپێکەوتنەکەدا پەڕگەی نوێ زیاد بکات (بۆ نموونە کاتێک پزیشک
   داوای تۆمارێکی پزیشکی دەکات). دواتر یەکسەر بۆ هەور دەنێردرێت. */
function renderMeetAttach(booking) {
  const box = document.getElementById("meet-attach");
  if (!box || !booking) return;
  const list = Array.isArray(booking.attachments) ? booking.attachments : [];
  box.innerHTML = `
    <div class="meet-attach-head">📎 پەڕگە و تۆمارە پزیشکییەکان</div>
    ${list.length ? attachmentsHtml(list) : `<p class="muted attach-empty">هێشتا هیچ پەڕگەیەک زیاد نەکراوە.</p>`}
    <input type="file" id="meet-attach-input" accept="image/*,application/pdf" multiple hidden>
    <button type="button" class="btn btn-ghost btn-sm" id="meet-attach-btn">📎 پەڕگە زیاد بکە</button>`;
  const input = box.querySelector("#meet-attach-input");
  const btn = box.querySelector("#meet-attach-btn");
  btn.addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    btn.disabled = true; const prev = btn.textContent; btn.textContent = "...چاوەڕێ بکە";
    const added = await filesToAttachments(input.files, "patient");
    input.value = "";
    if (added.length) {
      const updated = addAttachmentsToBooking(booking.id, added);
      if (updated) booking.attachments = updated;
    }
    renderMeetAttach(booking);   // دووبارە پیشاندان (لیست + دوگمەی نوێ)
  });
}

/* ٢٠ خولەک دوای دەستپێک — ژوورەکە لە شوێنی خۆیدا دابخە (iframe لاببە تاکو
   کامێرا/مایک بوەستێت) و پەیامێک پیشان بدە. نوێکردنەوەی پەڕە سوودی نییە
   چونکە هەمان پشکنینی کات دیسان دەیداخات. */
function endMeetingInPlace(wrap) {
  clearMeetTimers();
  wrap.dataset.meet = "";
  wrap.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🕐</div>
      <h3>کاتی چاوپێکەوتنەکە تەواو بوو</h3>
      <p>هیچ چاوپێکەوتنێک ناتوانێت لە ٢٠ خولەک درێژتر بێت. ئەگەر پێویستت بە کاتێکی تر هەیە، تکایە چاوپێکەوتنێکی نوێ تۆمار بکە. سوپاس بۆ بەکارهێنانی نەخۆشم.</p>
      <a class="btn btn-primary" href="appointments.html">گەڕانەوە بۆ چاوپێکەوتنەکانم</a>
    </div>`;
}

/* ---------- پەیجی گفتوگۆ (chat.html) ---------- */

/* ناسنامەیەکی نەگۆڕ بۆ ئەم وێبگەڕە — بۆ دیاریکردنی زنجیرەی گفتوگۆ */
function clientUid() {
  let id = localStorage.getItem("naxosh_uid");
  if (!id) { id = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); localStorage.setItem("naxosh_uid", id); }
  return id;
}

function initChat() {
  const box = document.getElementById("chat-box");
  if (!box) return;

  const d = DOCTORS.find(x => x.id === Number(qs("doctor"))) || DOCTORS[0];
  document.getElementById("chat-doctor").innerHTML =
    `${avatar(d.name, 44)}<div><strong>${d.name}</strong><span class="muted">${d.title} • ئۆنلاین 🟢</span></div>`;

  const online = window.NAXOSH_DB && NAXOSH_DB.active;
  let thread = online ? null : (clientUid() + "_" + d.id);
  let messages = online ? [] : getChat(d.id);
  let seeded = false;

  function replyIndex() {
    return Math.min(messages.filter(m => m.from === "doc").length, CHAT_REPLIES.length - 1);
  }

  function paint() {
    box.innerHTML = messages.map(m =>
      `<div class="msg ${m.from === 'me' ? 'msg-me' : 'msg-doc'}">
         ${m.from === 'doc' ? avatar(d.name, 32) : ''}
         <div class="bubble">${m.text}<span class="time">${m.time}</span></div>
       </div>`).join("");
    box.scrollTop = box.scrollHeight;
  }

  // ناردنی نامە — بۆ هەور ئەگەر بەردەست بێت، ئەگەرنا بۆ localStorage
  function push(msg) {
    if (online) { if (thread) NAXOSH_DB.sendChat(thread, msg); }
    else { messages.push(msg); saveChat(d.id, messages); paint(); }
  }

  // پزیشک سڵاو دەکات ئەگەر گفتوگۆکە بەتاڵ بێت (تەنها جارێک)
  function seedGreeting() {
    if (seeded || messages.length) return;
    seeded = true;
    push({ from: "doc", text: CHAT_REPLIES[0], time: nowTime() });
  }

  if (online) {
    // چاوەڕێی ناسنامەی نهێنی بکە، پاشان زنجیرەی گفتوگۆ بە ناسنامەکەوە ببەستە
    NAXOSH_DB.whenReady(uid => {
      thread = uid + "_" + d.id;
      // هاوکات: هەر گۆڕانێک لە هەور یەکسەر دەردەکەوێت
      NAXOSH_DB.watchChat(thread, msgs => {
        messages = msgs;
        paint();
        seedGreeting();
      });
    });
  } else {
    messages = getChat(d.id);
    seedGreeting();
    paint();
  }

  const input = document.getElementById("chat-input");
  const form = document.getElementById("chat-form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    push({ from: "me", text, time: nowTime() });

    // وەڵامی پزیشک بە دواکەوتنێکی کەم (نموونەیی — دواتر دەکرێت بە پزیشکی ڕاستەقینە بگۆڕدرێت)
    const ri = replyIndex();
    const typing = el(`<div class="msg msg-doc">${avatar(d.name, 32)}<div class="bubble typing">●●●</div></div>`);
    box.appendChild(typing); box.scrollTop = box.scrollHeight;
    setTimeout(() => {
      push({ from: "doc", text: CHAT_REPLIES[Math.min(ri, CHAT_REPLIES.length - 1)], time: nowTime() });
    }, 1100);
  });
}

function nowTime() {
  const d = new Date();
  return toKurdishDigits(String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"));
}

/* ---------- پەیجی چاوپێکەوتنەکانم (appointments.html) ---------- */

function initAppointments() {
  const wrap = document.getElementById("appt-list");
  if (!wrap) return;
  // تەنها چاوپێکەوتنەکانی ئەم نەخۆشە پیشان بدە (بەپێی ژمارەی نۆرماڵکراو).
  // ئەگەر بەکارهێنەر چووبێتە ژوورەوە، فلتەر بکە؛ ئەگەرنا هەمووی پیشان بدە.
  const me = NAXOSH.getUser();
  let list = getBookings();
  if (me && me.phoneKey) {
    list = list.filter(b => !b.phoneKey || b.phoneKey === me.phoneKey);
  }
  list = list.reverse();

  if (list.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>هێشتا هیچ چاوپێکەوتنێکت نییە</h3>
        <p>پزیشکێک هەڵبژێرە و یەکەم چاوپێکەوتنت تۆمار بکە.</p>
        <a class="btn btn-primary" href="doctors.html">${STR.nav.book}</a>
      </div>`;
    return;
  }

  wrap.innerHTML = list.map(b => {
    const meet = docMeet(b.doctorId);
    return `
    <article class="appt-card">
      ${avatar(b.doctorName, 56)}
      <div class="appt-info">
        <h3>${b.doctorName}</h3>
        <p class="muted">${specName(b.spec)}</p>
        <p class="appt-when">📅 ${b.day} — 🕐 ${b.time}</p>
        ${b.symptoms ? `<p class="appt-sym">📝 ${b.symptoms}</p>` : ""}
        ${b.attachments && b.attachments.length ? `<div class="appt-attach">📎 ${attachmentsHtml(b.attachments)}</div>` : ""}
      </div>
      <div class="appt-side">
        ${apptJoinCell(b, meet)}
        <button class="btn btn-sm btn-ghost" data-cancel="${b.id}">هەڵوەشاندنەوە</button>
      </div>
    </article>`;
  }).join("");

  // لیسنەری کلیک تەنها جارێک پەیوەست دەکرێت (نەک هەر جارەی نوێکردنەوە)
  if (!wrap.dataset.bound) {
    wrap.dataset.bound = "1";
    wrap.addEventListener("click", e => {
      const btn = e.target.closest("[data-cancel]");
      if (!btn) return;
      if (confirm("دڵنیایت لە هەڵوەشاندنەوەی ئەم چاوپێکەوتنە؟")) {
        cancelBooking(btn.dataset.cancel);
        initAppointments();
      }
    });
    // دوگمەی چوونەژوورەوە لە کاتی دیاریکراودا خۆی دەردەکەوێت/نامێنێت —
    // بۆیە لیست هەر خولەکێک نوێ دەکەینەوە بەبێ پێویستی نوێکردنەوەی دەستی.
    setInterval(initAppointments, 60000);
  }
}

/* خانەی دوگمەی چوونەژوورەوە لە لیستی چاوپێکەوتنەکان — بەپێی پەنجەرەی کات */
function apptJoinCell(b, meet) {
  if (!meet) {
    return `<span class="muted appt-wait">📞 پزیشک لە کاتی دیاریکراودا پەیوەندیت پێوە دەکات</span>`;
  }
  const joinBtn = `<a class="btn btn-sm btn-primary" href="meeting.html?doctor=${b.doctorId}">🎥 چوونە ناو چاوپێکەوتن</a>`;
  const w = meetWindow(b);
  switch (w.state) {
    case "open":
      return `${joinBtn}<span class="muted appt-wait">🟢 ئێستا دەتوانیت بچیتە ژوورەوە</span>`;
    case "before":
      return `<span class="muted appt-wait">🕐 دوگمەکە لە کاتی ${clockLabel(w.start)} دەردەکەوێت</span>`;
    case "live":
      return `<span class="muted appt-wait">🔴 چاوپێکەوتنەکە بەردەوامە — کاتەکە لە کۆتایی نزیکە</span>`;
    case "ended":
      return `<span class="muted appt-wait">✓ ئەم چاوپێکەوتنە تەواو بوو</span>`;
    default:
      // کاتی تۆمارەکە نەزانراوە (تۆماری کۆن) — وەک پێشتر دوگمەکە پیشان بدە
      return joinBtn;
  }
}

/* ---------- پەیجی خزمەتگوزارییەکان (specialties.html) ---------- */

function initSpecialties() {
  const grid = document.getElementById("spec-grid");
  if (grid) {
    grid.innerHTML = SPECIALTIES.map(s => `
      <article class="spec-card">
        <div class="spec-icon">${s.icon}</div>
        <h3>${s.name}</h3>
        <p>${s.desc}</p>
        <div class="tags">${s.treats.map(t => `<span class="tag">${t}</span>`).join("")}</div>
        <a class="btn btn-ghost btn-block" href="doctors.html?spec=${s.id}">بینینی پزیشکەکان</a>
      </article>`).join("");
  }
  const notBox = document.getElementById("not-online");
  if (notBox) {
    notBox.innerHTML = NOT_ONLINE.map(n => `<li><span>${n.icon}</span> ${n.text}</li>`).join("");
  }
}

/* ---------- پەیجی سەرەتا (index.html) ---------- */

function initHome() {
  const root = document.getElementById("home-root");
  if (!root) return;
  // پەڕەی سەرەتا = ناونیشان + فلتەر (بە پیشاندراوی لە سەرەتاوە) + ناونیشانی
  // «دکتۆرەکان» + لیستی دکتۆرەکان لە خوارەوە
  root.innerHTML = `
    <h2 class="home-title">دکتۆرێک لە خوارەوە هەڵبژێرە و ڤیدیۆچات لەگەڵی تۆمار بکە</h2>
    <div class="filter-wrap">
      <button class="filter-toggle open" id="filter-toggle" aria-expanded="true" aria-label="فلتەرکردن بەپێی پسپۆڕی">${FILTER_ICON}</button>
      <div class="filter-bar" id="filter-bar"></div>
    </div>
    <h3 class="section-label">دکتۆرەکان</h3>
    <div class="doc-grid" id="doc-grid"></div>`;
  // هەمان لۆجیکی فلتەرکردن و لیستکردنی پەڕەی پزیشکەکان بەکاردەهێنینەوە
  initDoctors();
}

/* ---------- ڕێکخەری گشتی ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  const initFn = {
    home: initHome,
    specialties: initSpecialties,
    doctors: initDoctors,
    doctor: initDoctorProfile,
    chat: initChat,
    appointments: initAppointments,
    meeting: initMeeting
  }[page] || (() => {});

  renderChrome(page);
  initFn();

  // کاتێک ناوەڕۆکی نوێ لە هەورەوە دێت — مینۆ و پەڕە نوێ بکەرەوە
  // (پەڕەی چاوپێکەوتنەکانیش — چونکە بەستەری ژووری پزیشک لە ناوەڕۆکەوە دێت)
  document.addEventListener("naxosh:content", () => {
    renderChrome(page);
    if (page !== "chat") initFn();
  });
  // کاتێک تۆمارکردنەکان دەگۆڕێن (یان لە هەورەوە دێن دوای بارکردنی پەڕە)،
  // پەڕەی چاوپێکەوتنەکان و پەڕەی ژووری چاوپێکەوتن نوێ بکەرەوە — پەڕەی ژوور
  // پێویستی بە تۆمارەکان هەیە بۆ پشکنینی ناسنامە و کات.
  document.addEventListener("naxosh:bookings", () => {
    if (page === "appointments") initAppointments();
    else if (page === "meeting") initMeeting();
  });
  // کاتێک دۆخی ناسنامە دەگۆڕێت (چوونەژوورەوەی نهێنی/بەڕێوەبەر) — مینۆ نوێ بکەرەوە
  document.addEventListener("naxosh:auth", () => renderChrome(page));
});
