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

  let activeTab = "overview";

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
    const tabs = [["overview", T.overview], ["bookings", T.bookings], ["schedule", T.schedule], ["settings", T.settings]];
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
    ({ overview: tabOverview, bookings: tabBookings, schedule: tabSchedule, settings: tabSettings }[activeTab] || tabOverview)(box);
  }

  /* ---------- تابی کۆی گشتی ---------- */
  function tabOverview(box) {
    const me = myDoctor();
    if (!me) {
      box.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>${STR.dr.notDoctor}</h3></div>`;
      return;
    }
    box.innerHTML = `
      <div class="adm-section">
        <h3>${STR.dr.tabs.overview}</h3>
        <p class="muted">${STR.dr.overviewHint}</p>
        ${scheduleOverviewHtml(me, { days: 14 })}
      </div>`;
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
      const meet = docMeet(b.doctorId);
      return `
      <div class="adm-booking" data-id="${b.id}">
        <div>
          <strong>${esc(b.userName) || "—"}</strong>
          <span class="muted" dir="ltr">${esc(b.userPhone) || "—"}</span>
          <p>📅 ${esc(b.day)} — 🕐 ${esc(b.time)}</p>
          ${b.symptoms ? `<p class="muted">📝 ${esc(b.symptoms)}</p>` : ""}
          ${b.attachments && b.attachments.length ? `<div class="adm-attach">📎 تۆماری پزیشکی:${attachmentsHtml(b.attachments)}</div>` : ""}
        </div>
        <div class="adm-booking-side">
          ${meet ? `<a class="btn btn-sm btn-primary" href="meeting.html?doctor=${b.doctorId}">🎥 ژوورەکەم</a>` : ""}
          <button class="btn btn-sm btn-ghost dr-bk-del" data-id="${b.id}">🗑 ${STR.admin.delete}</button>
        </div>
      </div>`;
    }).join("");
    box.addEventListener("click", e => {
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
    // کاتە یەدەگەکان (بۆ ڕۆژێک کە کاتی تایبەتی نەبێت) + کاتی ئێستای هەر ڕۆژێک
    const fallback = (Array.isArray(me.slots) && me.slots.length) ? me.slots
      : (typeof TIME_SLOTS !== "undefined" ? TIME_SLOTS : []);
    const dayMap = (me.daySlots && typeof me.daySlots === "object") ? me.daySlots : {};
    const timesFor = di => {
      const ds = dayMap[di] != null ? dayMap[di] : dayMap[String(di)];
      return (Array.isArray(ds) && ds.length) ? ds : fallback;
    };

    box.innerHTML = `
      <div class="adm-section">
        <h3>${STR.dr.tabs.schedule}</h3>
        <p class="muted">${STR.dr.schedHint}</p>
        <p class="muted">بۆ هەر ڕۆژێک دەتوانیت کاتی جیاواز دابنێیت. کاتەکان بە فاریزە (،) جیا بکەرەوە — بۆ نموونە: ١٩:٠٠، ٢٠:٣٠</p>
        <div class="adm-field adm-full">
          <span>${STR.dr.daysLabel}</span>
          <div class="dr-dayslots">
            ${(STR.days || []).map((dn, di) => {
              const on = (me.days || []).includes(di);
              return `<div class="dr-dayslot ${on ? "" : "is-off"}" data-day="${di}">
                <label class="adm-day"><input type="checkbox" data-day="${di}" ${on ? "checked" : ""}> ${dn}</label>
                <input class="dr-day-times" data-times="${di}" dir="ltr" placeholder="١٩:٠٠، ٢٠:٣٠" value="${esc(timesFor(di).join("، "))}">
              </div>`;
            }).join("")}
          </div>
        </div>
        <button class="btn btn-primary" id="dr-save-sched">${STR.dr.saveSched}</button>
      </div>`;

    // نیشانەی ڕۆژ ⟷ ڕووخساری خانەی کاتەکان (کاڵبوونەوە کاتێک ڕۆژەکە ناچالاکە)
    box.addEventListener("change", e => {
      const c = e.target.closest("input[type=checkbox][data-day]"); if (!c) return;
      const row = c.closest(".dr-dayslot");
      if (row) row.classList.toggle("is-off", !c.checked);
    });

    box.querySelector("#dr-save-sched").addEventListener("click", () => {
      const days = [], daySlots = {};
      let bad = null;
      [...box.querySelectorAll(".dr-dayslot")].forEach(row => {
        const di = +row.dataset.day;
        if (!row.querySelector("input[type=checkbox]").checked) return;
        const times = row.querySelector(".dr-day-times").value
          .split(/[\n,،]/).map(s => s.trim()).filter(Boolean);
        if (!times.length) { if (bad === null) bad = (STR.days || [])[di]; return; }
        days.push(di); daySlots[di] = times;
      });
      days.sort((a, b) => a - b);
      if (bad !== null) { alert(`تکایە بۆ ڕۆژی «${bad}» لانیکەم یەک کات بنووسە، یان نیشانەکەی لابە.`); return; }
      if (!days.length) { alert("تکایە لانیکەم یەک ڕۆژ هەڵبژێرە و کاتەکانی بنووسە."); return; }
      const slots = daySlots[days[0]];   // یەدەگی گشتی = کاتەکانی یەکەم ڕۆژ
      // یەکسەر لە ناوخۆدا جێبەجێی بکە، پاشان بۆ هەور بینێرە
      // (بەستەری ژوور لێرە نانێردرێت — تەنها بەڕێوەبەر دایدەنێت)
      me.days = days; me.daySlots = daySlots; me.slots = slots;
      Promise.resolve(NAXOSH_DB.saveDoctorSettings(me.id, { days, daySlots, slots }))
        .then(() => flash(STR.dr.schedSaved))
        .catch(err => alert("نەتوانرا پاشەکەوت بکرێت — هەوڵ بدەرەوە.\n(" + (err.code || err.message || err) + ")"));
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
    if (online() && NAXOSH_DB.isDoctor() && (activeTab === "bookings" || activeTab === "overview")) renderTab();
  });
  // ناوەڕۆک/خشتە لە هەورەوە گۆڕا — تابی چاوپێکەوتنەکان و کۆی گشتی نوێ بکەرەوە
  // (تابی خشتە نا، تاکو دەستکارییەکانی پزیشک نەسڕێتەوە لە کاتی نووسیندا)
  document.addEventListener("naxosh:content", () => {
    if (online() && NAXOSH_DB.isDoctor() && (activeTab === "bookings" || activeTab === "overview")) renderTab();
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
