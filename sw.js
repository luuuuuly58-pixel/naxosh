/* ============================================================
   sw.js — سێرڤیس وۆرکەری نەخۆشم (PWA)
   ------------------------------------------------------------
   ستراتیژی: NETWORK-FIRST — هەمیشە نوێترین لە ئینتەرنێتەوە دەهێنرێت،
   بۆیە هەر گۆڕانکارییەک لە ماڵپەڕ یەکسەر لە ئەپیشدا دەردەکەوێت.
   تەنها کاتێک ئینتەرنێت نەبێت، لە کاشەوە (offline) پیشان دەدرێت.
   تەنها فایلەکانی هەمان origin مامەڵەیان لەگەڵ دەکرێت — CDN/Firebase
   بەئازادی بۆ وێبگەڕ دەهێڵرێنەوە.
   ============================================================ */
const CACHE = "naxoshm-v1";
const SHELL = [
  "./", "./index.html", "./doctors.html", "./doctor.html",
  "./appointments.html", "./meeting.html", "./specialties.html",
  "./assets/css/styles.css",
  "./assets/js/data.js", "./assets/js/i18n.js", "./assets/js/store.js",
  "./assets/js/app.js", "./assets/js/firebase.js",
  "./assets/img/logo-teal.svg", "./assets/img/logo-white.svg", "./assets/img/app-icon.svg"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  // هەر فایلێک بە جیا کاش بکە — ئەگەر یەکێکیان نەبوو، ئەوانی تر نافەوتێن
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // CDN/Firebase: وەک خۆی بهێڵە

  // Network-first: سەرەتا لە ئینتەرنێت، ئەگەر نەبوو لە کاش
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
