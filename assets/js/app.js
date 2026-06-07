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
/* کاتە بەردەستەکانی پزیشک — هەر پزیشکە و کاتی تایبەتی خۆی */
function docSlots(d) {
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

function getChat(doctorId) {
  try { return JSON.parse(localStorage.getItem("naxosh_chat_" + doctorId) || "[]"); }
  catch { return []; }
}
function saveChat(doctorId, messages) {
  localStorage.setItem("naxosh_chat_" + doctorId, JSON.stringify(messages));
}

/* ---------- مینۆ و فووتەر و ئاگاداری فریاکەوتن ---------- */

function authArea() {
  if (NAXOSH.isAdmin()) {
    return `
      <a href="admin.html" class="auth-chip auth-admin">🛠️ ${STR.admin.panel}</a>
      <a href="#" class="auth-logout" onclick="NAXOSH.adminLogout();location.reload();return false">${STR.auth.logout}</a>`;
  }
  if (window.NAXOSH_DB && NAXOSH_DB.active && NAXOSH_DB.isDoctor()) {
    return `
      <a href="doctor-panel.html" class="auth-chip auth-admin">🩺 ${STR.dr.panel}</a>
      <a href="#" class="auth-logout" onclick="NAXOSH_DB.signOutAdmin().then(()=>location.reload());return false">${STR.auth.logout}</a>`;
  }
  const user = NAXOSH.getUser();
  if (user) {
    return `
      <span class="auth-chip">👤 ${user.name}</span>
      <a href="#" class="auth-logout" onclick="NAXOSH.userLogout();location.reload();return false">${STR.auth.logout}</a>`;
  }
  return "";
}

function renderChrome(active) {
  const header = document.getElementById("site-header");
  if (header) {
    header.innerHTML = `
      <div class="emergency-bar">⚠️ ${STR.emergency}</div>
      <nav class="navbar">
        <a class="brand" href="index.html">
          <span class="brand-mark">🩺</span>
          <span>${STR.brand} <small>${STR.tagline}</small></span>
        </a>
        <button class="nav-toggle" aria-label="مینۆ" onclick="document.querySelector('.nav-links').classList.toggle('open')">☰</button>
        <div class="nav-links">
          <a href="index.html" class="${active === 'home' ? 'active' : ''}">${STR.nav.home}</a>
          <a href="specialties.html" class="${active === 'specialties' ? 'active' : ''}">${STR.nav.specialties}</a>
          <a href="doctors.html" class="${active === 'doctors' ? 'active' : ''}">${STR.nav.doctors}</a>
          <a href="appointments.html" class="${active === 'appointments' ? 'active' : ''}">${STR.nav.appointments}</a>
          <a href="doctors.html" class="btn-nav">${STR.nav.book}</a>
          <span class="auth-area">${authArea()}</span>
        </div>
      </nav>`;
  }

  const footer = document.getElementById("site-footer");
  if (footer) {
    footer.innerHTML = `
      <div class="footer-inner">
        <div>
          <div class="brand"><span class="brand-mark">🩺</span> ${STR.brand}</div>
          <p>${STR.footer.note}</p>
        </div>
        <div class="footer-links">
          <a href="specialties.html">${STR.nav.specialties}</a>
          <a href="doctors.html">${STR.nav.doctors}</a>
          <a href="appointments.html">${STR.nav.appointments}</a>
          <a href="doctor-panel.html">${STR.footer.doctor}</a>
          <a href="admin.html">${STR.footer.admin}</a>
        </div>
      </div>
      <div class="footer-bottom">${STR.footer.rights}</div>`;
  }
}

/* ---------- چوونەژوورەوەی بەکارهێنەر (ناو + تەلەفۆن) ---------- */

function openAuthModal(onSuccess) {
  const existing = NAXOSH.getUser() || { name: "", phone: "" };
  const overlay = el(`
    <div class="modal-overlay">
      <div class="modal">
        <button class="modal-close" aria-label="${STR.auth.cancel}">✕</button>
        <h2>${STR.auth.loginTitle}</h2>
        <p class="modal-sub">${STR.auth.loginSub}</p>
        <label>${STR.auth.fullName}</label>
        <input type="text" id="auth-name" value="${existing.name}" placeholder="${STR.auth.fullNamePh}">
        <label>${STR.auth.phone}</label>
        <input type="tel" id="auth-phone" value="${existing.phone}" placeholder="${STR.auth.phonePh}" dir="ltr">
        <p class="auth-err" id="auth-err"></p>
        <button class="btn btn-primary btn-block" id="auth-go">${STR.auth.continue}</button>
      </div>
    </div>`);

  function close() { overlay.remove(); }
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  overlay.querySelector(".modal-close").addEventListener("click", close);

  overlay.querySelector("#auth-go").addEventListener("click", () => {
    const name = overlay.querySelector("#auth-name").value.trim();
    const phone = overlay.querySelector("#auth-phone").value.trim();
    const err = overlay.querySelector("#auth-err");
    if (!name) { err.textContent = STR.auth.needName; return; }
    if (phone.replace(/\D/g, "").length < 7) { err.textContent = STR.auth.needPhone; return; }
    NAXOSH.userLogin(name, phone);
    close();
    renderChrome(document.body.dataset.page);
    onSuccess();
  });

  document.body.appendChild(overlay);
  overlay.querySelector("#auth-name").focus();
}

/* ---------- کارتی پزیشک ---------- */

function doctorCard(d) {
  return `
    <article class="doc-card">
      <div class="doc-head">
        ${avatar(d.name, 64)}
        <div>
          <h3>${d.name}</h3>
          <p class="doc-title">${d.title}</p>
          <p class="doc-rating">${stars(d.rating)} <span class="muted">(${toKurdishDigits(d.reviews)})</span></p>
        </div>
      </div>
      <div class="doc-meta">
        <span class="badge ${availableToday(d) ? 'badge-green' : 'badge-gray'}">${availableToday(d) ? STR.common.availableToday : STR.common.notAvailableToday}</span>
        <span class="muted">${toKurdishDigits(d.exp)} ${STR.common.experience}</span>
      </div>
      <div class="doc-price">${formatPrice(d.price)} ${STR.common.currency}</div>
      <div class="doc-actions">
        <a class="btn btn-primary" href="doctor.html?id=${d.id}">${STR.common.book}</a>
        <a class="btn btn-ghost" href="doctor.html?id=${d.id}">${STR.common.viewProfile}</a>
      </div>
    </article>`;
}

/* ---------- پەیجی پزیشکەکان (doctors.html) ---------- */

function initDoctors() {
  const grid = document.getElementById("doc-grid");
  const filterBar = document.getElementById("filter-bar");
  if (!grid) return;

  const preset = qs("spec");
  let current = preset || "all";

  const chips = [{ id: "all", name: STR.common.all }, ...SPECIALTIES.map(s => ({ id: s.id, name: s.name }))];
  filterBar.innerHTML = chips.map(c =>
    `<button class="chip ${c.id === current ? 'chip-active' : ''}" data-id="${c.id}">${c.name}</button>`
  ).join("");

  function render() {
    const list = current === "all" ? DOCTORS : DOCTORS.filter(d => d.spec === current);
    grid.innerHTML = list.length
      ? list.map(doctorCard).join("")
      : `<p class="empty">هیچ پزیشکێک نەدۆزرایەوە.</p>`;
  }

  filterBar.addEventListener("click", e => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    current = btn.dataset.id;
    [...filterBar.children].forEach(c => c.classList.toggle("chip-active", c === btn));
    render();
  });

  render();
}

/* ---------- پەیجی پزیشک + تۆمارکردن (doctor.html) ---------- */

function initDoctorProfile() {
  const wrap = document.getElementById("doctor-detail");
  if (!wrap) return;

  const d = DOCTORS.find(x => x.id === Number(qs("id"))) || DOCTORS[0];
  const spec = SPECIALTIES.find(s => s.id === d.spec);

  wrap.innerHTML = `
    <div class="profile-card">
      <div class="profile-head">
        ${avatar(d.name, 88)}
        <div>
          <h1>${d.name}</h1>
          <p class="doc-title">${d.title}</p>
          <p class="doc-rating">${stars(d.rating)} <span class="muted">(${toKurdishDigits(d.reviews)} ${STR.common.reviews})</span></p>
          <span class="badge ${availableToday(d) ? 'badge-green' : 'badge-gray'}">${availableToday(d) ? STR.common.availableToday : STR.common.notAvailableToday}</span>
        </div>
      </div>
      <p class="bio">${d.bio}</p>
      <ul class="profile-facts">
        <li><strong>${STR.common.experience}:</strong> ${toKurdishDigits(d.exp)}</li>
        <li><strong>${STR.common.languages}:</strong> ${d.langs.join("، ")}</li>
        <li><strong>${STR.common.price}:</strong> ${formatPrice(d.price)} ${STR.common.currency} ${STR.common.perVisit}</li>
      </ul>
      <div class="treats-box">
        <strong>${STR.common.treats}</strong>
        <div class="tags">${spec.treats.map(t => `<span class="tag">${t}</span>`).join("")}</div>
      </div>
    </div>

    <div class="booking-card" id="booking-card">
      <h2>تۆمارکردنی چاوپێکەوتن</h2>
      <label>ڕۆژ هەڵبژێرە</label>
      <div class="days" id="days"></div>
      <label>کات هەڵبژێرە</label>
      <div class="slots" id="slots"></div>
      <label>کورتە باسی نیشانەکانت (ئارەزوومەندانە)</label>
      <textarea id="symptoms" rows="3" placeholder="بۆ نموونە: لە دوو ڕۆژە سەرئێشە و تام هەیە..."></textarea>
      <button class="btn btn-primary btn-block" id="confirm-btn">پشتڕاستکردنەوەی تۆمارکردن</button>
    </div>`;

  // ڕۆژەکان (٧ ڕۆژی داهاتوو) — تەنها ئەو ڕۆژانە بەردەستن کە پزیشک کاری تێدا دەکات
  const dayNames = STR.days || ["یەکشەممە", "دووشەممە", "سێشەممە", "چوارشەممە", "پێنجشەممە", "هەینی", "شەممە"];
  const daysBox = document.getElementById("days");
  const today = new Date();
  const avail = docDays(d);
  let chosenDay = null, chosenSlot = null, firstAvail = null;
  for (let i = 0; i < 7; i++) {
    const dt = new Date(today.getTime() + i * 86400000);
    const ok = avail.includes(dt.getDay());
    if (ok && firstAvail === null) firstAvail = i;
    const label = i === 0 ? "ئەمڕۆ" : dayNames[dt.getDay()];
    daysBox.appendChild(el(`<button class="day ${i === firstAvail ? 'day-active' : ''} ${ok ? '' : 'day-off'}" data-i="${i}" ${ok ? '' : 'disabled'}>
      <span>${label}</span><b>${toKurdishDigits(dt.getDate())}</b></button>`));
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
    const slots = docSlots(d);
    if (!slots.length) {
      slotsBox.innerHTML = `<p class="muted">هیچ کاتێک دانەنراوە بۆ ئەم پزیشکە.</p>`;
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
      const dayLabel = chosenDay === 0 ? "ئەمڕۆ" : dayNames[dt.getDay()];
      const slotKey = d.id + "_" + date + "_" + chosenSlot;
      const rec = {
        id: newBookingId(),
        doctorId: d.id, doctorName: d.name, doctorTitle: d.title,
        spec: d.spec, price: d.price,
        date, slotKey,
        day: `${dayLabel} ${toKurdishDigits(dt.getDate())}`,
        time: chosenSlot,
        symptoms: document.getElementById("symptoms").value.trim(),
        userName: user ? user.name : "",
        userPhone: user ? user.phone : ""
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
      <h2>تۆمارکردنەکەت سەرکەوتوو بوو!</h2>
      <p>چاوپێکەوتنت لەگەڵ <strong>${d.name}</strong></p>
      <p class="success-when">📅 ${booking.day} — 🕐 ${booking.time}</p>
      ${meet
        ? `<p class="success-note">🎥 لە کاتی دیاریکراودا ئەم دوگمەیە دابگرە بۆ چوونە ناو ژووری چاوپێکەوتن.
             هەمیشە لە پەڕەی «چاوپێکەوتنەکانم»یشەوە دەستت دەگات.</p>
           <a class="btn btn-primary btn-block" href="meeting.html?doctor=${d.id}">🎥 چوونە ناو چاوپێکەوتنی ڤیدیۆ</a>`
        : `<p class="success-note">📞 پزیشک لە کاتی دیاریکراودا پەیوەندیت پێوە دەکات.</p>`}
      <a class="btn btn-ghost btn-block" href="appointments.html">بینینی چاوپێکەوتنەکانم</a>
    </div>`;
}

/* ---------- پەیجی ژووری چاوپێکەوتن (meeting.html) ----------
   ئەگەر ژووری پزیشک لە Daily بێت (daily.co) — ڤیدیۆکە ڕاستەوخۆ لەناو
   ماڵپەڕەکەدا دەکرێتەوە. بۆ خزمەتگوزارییەکانی تر (Whereby/Meet کە ڕێگە
   بە دانان لەناو ماڵپەڕ نادەن) دوگمەیەک دەردەکەوێت بۆ کردنەوەی ژوورەکە. */

function initMeeting() {
  const wrap = document.getElementById("meeting-root");
  if (!wrap) return;
  const d = DOCTORS.find(x => x.id === Number(qs("doctor"))) || DOCTORS[0];
  const meet = docMeet(d.id);

  // ئەگەر هەمان ژوور پێشتر کراوەتەوە، دووبارە بارینەکەرەوە (پەیوەندی نەپچڕێت)
  if (wrap.dataset.meet === meet) return;
  wrap.dataset.meet = meet;

  const head = `
    <div class="meet-head">
      ${avatar(d.name, 44)}
      <div><strong>${d.name}</strong><span class="muted"> ${d.title}</span></div>
      <span class="meet-note">🕐 تکایە ڕێک لە کاتی دیاریکراودا بەشداربە</span>
    </div>`;

  if (!meet) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📞</div>
        <h3>ژووری چاوپێکەوتن هێشتا دانەنراوە</h3>
        <p>پزیشک لە کاتی دیاریکراودا پەیوەندیت پێوە دەکات.</p>
        <a class="btn btn-ghost" href="appointments.html">گەڕانەوە بۆ چاوپێکەوتنەکانم</a>
      </div>`;
    return;
  }

  let host = "";
  try { host = new URL(meet).hostname; } catch (_) {}
  const embeddable = /(^|\.)daily\.co$/i.test(host);

  if (embeddable) {
    wrap.innerHTML = `${head}
      <iframe class="meet-frame" src="${meet}"
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        allowfullscreen></iframe>
      <p class="muted meet-tip">ئەگەر داوای ڕێگەپێدانی کامێرا و مایکرۆفۆن کرا، «Allow» دابگرە.</p>`;
  } else {
    wrap.innerHTML = `${head}
      <div class="empty-state">
        <div class="empty-icon">🎥</div>
        <h3>ژووری چاوپێکەوتن ئامادەیە</h3>
        <p>ئەم ژوورە لە پەنجەرەی خۆیدا دەکرێتەوە — پزیشک ڕێگەت پێدەدات بۆ چوونەژوورەوە.</p>
        <a class="btn btn-primary" href="${meet}" target="_blank" rel="noopener">چوونە ناو ژوورەکە</a>
      </div>`;
  }
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
  const list = getBookings().reverse();

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
      </div>
      <div class="appt-side">
        ${meet
          ? `<a class="btn btn-sm btn-primary" href="meeting.html?doctor=${b.doctorId}">🎥 چوونە ناو چاوپێکەوتن</a>
             <span class="muted appt-wait">🕐 تکایە ڕێک لە کاتی دیاریکراودا بچۆ ژوورەوە</span>`
          : `<span class="muted appt-wait">📞 پزیشک لە کاتی دیاریکراودا پەیوەندیت پێوە دەکات</span>`}
        <button class="btn btn-sm btn-ghost" data-cancel="${b.id}">هەڵوەشاندنەوە</button>
      </div>
    </article>`;
  }).join("");

  wrap.addEventListener("click", e => {
    const btn = e.target.closest("[data-cancel]");
    if (!btn) return;
    if (confirm("دڵنیایت لە هەڵوەشاندنەوەی ئەم چاوپێکەوتنە؟")) {
      cancelBooking(btn.dataset.cancel);
      initAppointments();
    }
  });
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
  // دەقەکانی هیرۆ لە STR.home ـەوە (دەکرێت لە داشبۆردەوە بگۆڕدرێن)
  const setText = (id, val) => { const n = document.getElementById(id); if (n && val) n.textContent = val; };
  if (STR.home) {
    setText("hero-title", STR.home.heroTitle);
    setText("hero-lead", STR.home.heroLead);
    setText("hero-cta", STR.home.heroCta);
    setText("hero-scroll", STR.home.heroScroll);
  }

  const grid = document.getElementById("home-spec-grid");
  if (grid) {
    grid.innerHTML = SPECIALTIES.map(s => `
      <a class="spec-mini" href="doctors.html?spec=${s.id}">
        <span class="spec-icon">${s.icon}</span>
        <span>${s.name}</span>
        <small>${s.short}</small>
      </a>`).join("");
  }
  const docs = document.getElementById("home-doctors");
  if (docs) {
    docs.innerHTML = DOCTORS.slice(0, 4).map(doctorCard).join("");
  }
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
  // کاتێک تۆمارکردنەکان دەگۆڕێن، تەنها پەڕەی چاوپێکەوتنەکان نوێ بکەرەوە
  document.addEventListener("naxosh:bookings", () => {
    if (page === "appointments") initAppointments();
  });
  // کاتێک دۆخی ناسنامە دەگۆڕێت (چوونەژوورەوەی نهێنی/بەڕێوەبەر) — مینۆ نوێ بکەرەوە
  document.addEventListener("naxosh:auth", () => renderChrome(page));
});
