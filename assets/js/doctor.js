/* ============================================================
   doctor.js — داشبۆردی پزیشک (تەنها لە doctor-panel.html)
   ------------------------------------------------------------
   پزیشک بە ئیمەیڵ + وشەی نهێنی (کە بەڕێوەبەر دروستی کردووە)
   دەچێتە ژوورەوە و تەنها شتەکانی خۆی دەبینێت:
   • چاوپێکەوتنەکانی خۆی (ناوی نەخۆش، تەلەفۆن، کات، ژووری ڤیدیۆ)
   • ڕۆژ و کاتە بەردەستەکانی خۆی (خۆی دەستکاریان دەکات)
   • گۆڕینی وشەی نهێنی
   ئەم بەشە پێویستی بە Firebase هەیە (هەژماری ڕاستەقینە).
   ============================================================ */

(function () {
  const root = document.getElementById("dr-root");
  if (!root) return;

  let activeTab = "bookings";

  function online() { return window.NAXOSH_DB && NAXOSH_DB.active; }
  function myDoctor() {
    const id = NAXOSH_DB.doctorId();
    return DOCTORS.find(d => d.id === id) || null;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function flash(msg) {
    let n = document.getElementById("dr-flash");
    if (n) { n.textContent = msg; n.classList.add("show"); setTimeout(() => n.classList.remove("show"), 1800); }
  }

  /* ---------- چوونەژوورەوە ---------- */
  function renderLogin() {
    if (!online()) {
      root.innerHTML = `
        <div class="container"><div class="adm-login">
          <div class="hero-logo adm-login-logo">🩺</div>
          <h1>${STR.dr.loginTitle}</h1>
          <p class="muted">${STR.dr.needCloud}</p>
        </div></div>`;
      return;
    }
    root.innerHTML = `
      <div class="container">
        <div class="adm-login">
          <div class="hero-logo adm-login-logo">🩺</div>
          <h1>${STR.dr.loginTitle}</h1>
          <p class="modal-sub">${STR.dr.loginSub}</p>
          <label>${STR.admin.email}</label>
          <input type="email" id="dr-email" dir="ltr" autocomplete="username">
          <label>${STR.admin.password}</label>
          <input type="password" id="dr-pw" dir="ltr" autocomplete="current-password">
          <p class="auth-err" id="dr-err"></p>
          <button class="btn btn-primary btn-block" id="dr-enter">${STR.admin.enter}</button>
        </div>
      </div>`;
    const setErr = m => { root.querySelector("#dr-err").textContent = m; };
    const go = () => {
      const email = root.querySelector("#dr-email").value;
      const pw = root.querySelector("#dr-pw").value;
      const btn = root.querySelector("#dr-enter");
      btn.disabled = true; setErr("");
      NAXOSH_DB.adminSignIn(email, pw).then(ok => {
        btn.disabled = false;
        if (!ok) setErr(STR.admin.wrongPw);
        // ئەگەر سەرکەوتوو بێت، naxosh:auth خۆی داشبۆرد پیشان دەدات
      });
    };
    root.querySelector("#dr-enter").addEventListener("click", go);
    root.querySelector("#dr-pw").addEventListener("keydown", e => { if (e.key === "Enter") go(); });
  }

  /* ---------- چوارچێوەی داشبۆرد ---------- */
  function renderPanel() {
    const me = myDoctor();
    const T = STR.dr.tabs;
    const tabs = [["bookings", T.bookings], ["schedule", T.schedule], ["settings", T.settings]];
    root.innerHTML = `
      <div class="adm-wrap dr-wrap container">
        <div class="adm-bar">
          <h1>🩺 ${STR.dr.panel}${me ? " — " + esc(me.name) : ""}</h1>
          <div class="adm-bar-actions">
            <button class="btn btn-ghost btn-sm" id="dr-logout">${STR.admin.logout}</button>
          </div>
        </div>
        <div class="adm-tabs">
          ${tabs.map(([id, label]) => `<button class="adm-tab-btn ${id === activeTab ? "active" : ""}" data-tab="${id}">${label}</button>`).join("")}
        </div>
        <div id="dr-tab"></div>
      </div>
      <span id="dr-flash" class="adm-flash"></span>`;

    root.querySelector(".adm-tabs").addEventListener("click", e => {
      const b = e.target.closest(".adm-tab-btn"); if (!b) return;
      activeTab = b.dataset.tab;
      [...root.querySelectorAll(".adm-tab-btn")].forEach(x => x.classList.toggle("active", x === b));
      renderTab();
    });
    root.querySelector("#dr-logout").addEventListener("click", () => {
      NAXOSH_DB.signOutAdmin().then(() => { location.href = "index.html"; });
    });

    renderTab();
  }

  function renderTab() {
    const old = document.getElementById("dr-tab");
    if (!old) return;
    const box = old.cloneNode(false);
    old.replaceWith(box);
    ({ bookings: tabBookings, schedule: tabSchedule, settings: tabSettings }[activeTab] || tabBookings)(box);
  }

  /* ---------- تابی چاوپێکەوتنەکان ---------- */
  function tabBookings(box) {
    const me = myDoctor();
    const noMeet = me && !docMeet(me.id)
      ? `<p class="adm-hint">⚠️ ${STR.dr.noMeetWarn}</p>` : "";
    const list = getBookings().slice().reverse();
    if (!list.length) {
      box.innerHTML = noMeet + `<div class="empty-state"><div class="empty-icon">📭</div><h3>${STR.dr.noBookings}</h3></div>`;
      return;
    }
    box.innerHTML = noMeet + list.map(b => {
      const confirmed = b.status === STATUS_CONFIRMED;
      const meet = docMeet(b.doctorId);
      return `
      <div class="adm-booking" data-id="${b.id}">
        <div>
          <strong>${esc(b.userName) || "—"}</strong>
          <span class="muted" dir="ltr">${esc(b.userPhone) || "—"}</span>
          <p>📅 ${esc(b.day)} — 🕐 ${esc(b.time)}</p>
          ${b.symptoms ? `<p class="muted">📝 ${esc(b.symptoms)}</p>` : ""}
        </div>
        <div class="adm-booking-side">
          <span class="badge ${confirmed ? "badge-green" : "badge-amber"}">${esc(b.status || "")}</span>
          ${!confirmed ? `<button class="btn btn-sm btn-primary dr-bk-ok" data-id="${b.id}">✓ پشتڕاستکردنەوە</button>` : ""}
          ${meet ? `<a class="btn btn-sm btn-ghost" href="${esc(meet)}" target="_blank" rel="noopener">🎥 ژوورەکەم</a>` : ""}
          <button class="btn btn-sm btn-ghost dr-bk-del" data-id="${b.id}">🗑 ${STR.admin.delete}</button>
        </div>
      </div>`;
    }).join("");
    box.addEventListener("click", e => {
      const ok = e.target.closest(".dr-bk-ok");
      if (ok) { confirmBooking(ok.dataset.id); renderTab(); flash("پشتڕاستکرایەوە ✓"); return; }
      const del = e.target.closest(".dr-bk-del"); if (!del) return;
      if (confirm("ئەم چاوپێکەوتنە بسڕێتەوە؟")) { cancelBooking(del.dataset.id); renderTab(); }
    });
  }

  /* ---------- تابی ڕۆژ و کاتەکان ---------- */
  function tabSchedule(box) {
    const me = myDoctor();
    if (!me) {
      box.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>${STR.dr.notDoctor}</h3></div>`;
      return;
    }
    box.innerHTML = `
      <div class="adm-section">
        <h3>${STR.dr.tabs.schedule}</h3>
        <p class="muted">${STR.dr.schedHint}</p>
        <div class="adm-field adm-full">
          <span>${STR.dr.daysLabel}</span>
          <div class="adm-days">
            ${(STR.days || []).map((dn, di) => `<label class="adm-day"><input type="checkbox" data-day="${di}" ${(me.days || []).includes(di) ? "checked" : ""}> ${dn}</label>`).join("")}
          </div>
        </div>
        <label class="adm-field adm-full">${STR.dr.slotsLabel}
          <textarea id="dr-slots" rows="4">${esc(docSlots(me).join("\n"))}</textarea>
        </label>
        <label class="adm-field adm-full">${STR.dr.meetLabel}
          <input id="dr-meet" dir="ltr" value="${esc(me.meet || "")}" placeholder="https://meet.google.com/abc-defg-hij">
        </label>
        <p class="muted">${STR.dr.meetHint}</p>
        <button class="btn btn-primary" id="dr-save-sched">${STR.dr.saveSched}</button>
      </div>`;
    box.querySelector("#dr-save-sched").addEventListener("click", () => {
      const days = [...box.querySelectorAll("[data-day]")]
        .filter(c => c.checked).map(c => +c.dataset.day).sort((a, b) => a - b);
      const slots = box.querySelector("#dr-slots").value.split("\n").map(s => s.trim()).filter(Boolean);
      let meet = box.querySelector("#dr-meet").value.trim();
      if (meet && !/^https?:\/\//i.test(meet)) meet = "https://" + meet;
      if (!slots.length) { alert("تکایە لانیکەم یەک کات بنووسە."); return; }
      // یەکسەر لە ناوخۆدا جێبەجێی بکە، پاشان بۆ هەور بینێرە
      me.days = days; me.slots = slots; me.meet = meet;
      Promise.resolve(NAXOSH_DB.saveDoctorSettings(me.id, { days, slots, meet }))
        .then(() => flash(STR.dr.schedSaved));
    });
  }

  /* ---------- تابی ڕێکخستن ---------- */
  function tabSettings(box) {
    box.innerHTML = `
      <div class="adm-section">
        <h3>${STR.admin.changePw}</h3>
        <p class="muted">ئەمە وشەی نهێنیی هەژمارەکەت دەگۆڕێت (لانیکەم ٦ پیت).</p>
        <label class="adm-field">${STR.admin.newPw}<input type="password" id="dr-new-pw" dir="ltr"></label>
        <button class="btn btn-primary btn-sm" id="dr-save-pw">${STR.admin.changePw}</button>
      </div>`;
    box.querySelector("#dr-save-pw").addEventListener("click", () => {
      const pw = box.querySelector("#dr-new-pw").value.trim();
      if (pw.length < 6) { alert("وشەی نهێنی پێویستە لانیکەم ٦ پیت بێت."); return; }
      NAXOSH_DB.changeAdminPassword(pw).then(() => {
        box.querySelector("#dr-new-pw").value = ""; flash(STR.admin.pwChanged);
      }).catch(err => {
        alert("نەتوانرا وشەی نهێنی بگۆڕدرێت. تکایە بچۆ دەرەوە و دووبارە بچۆ ژوورەوە، پاشان هەوڵ بدەرەوە.\n(" + (err.code || err.message || err) + ")");
      });
    });
  }

  /* ---------- نوێکردنەوەی خۆکار ---------- */
  document.addEventListener("naxosh:bookings", () => {
    if (online() && NAXOSH_DB.isDoctor() && activeTab === "bookings") renderTab();
  });
  // ناوەڕۆک/خشتە لە هەورەوە گۆڕا — تەنها تابی چاوپێکەوتنەکان نوێ بکەرەوە
  // (تابی خشتە نا، تاکو دەستکارییەکانی پزیشک نەسڕێتەوە لە کاتی نووسیندا)
  document.addEventListener("naxosh:content", () => {
    if (online() && NAXOSH_DB.isDoctor() && activeTab === "bookings") renderTab();
  });

  /* ---------- گۆڕانی دۆخی ناسنامە ---------- */
  document.addEventListener("naxosh:auth", () => {
    if (!online()) return;
    if (NAXOSH_DB.isDoctor()) renderPanel();
    else if (NAXOSH_DB.isAdmin()) location.href = "admin.html";   // بەڕێوەبەر بە هەڵە لێرە چووە ژوورەوە
    else renderLogin();
  });

  /* ---------- دەستپێک ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    if (online() && NAXOSH_DB.isDoctor()) renderPanel();
    else renderLogin();
  });
})();
