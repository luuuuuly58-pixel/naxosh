/* ============================================================
   admin.js — داشبۆردی بەڕێوەبەر (دەستکاریکردنی ناوەڕۆکی ماڵپەڕ)
   تەنها لە admin.html بار دەکرێت.
   ============================================================ */

(function () {
  const root = document.getElementById("admin-root");
  if (!root) return;

  let content = null;     // وێنەی کارکردنی ناوەڕۆک
  let activeTab = "texts";

  /* ---------- یارمەتیدەر ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function getPath(obj, path) {
    return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
  }
  function setPath(obj, path, val) {
    const keys = path.split(".");
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) { o[keys[i]] = o[keys[i]] || {}; o = o[keys[i]]; }
    o[keys[keys.length - 1]] = val;
  }
  function flash(msg) {
    let n = document.getElementById("adm-flash");
    if (n) { n.textContent = msg; n.classList.add("show"); setTimeout(() => n.classList.remove("show"), 1800); }
  }

  /* ---------- چوونەژوورەوە ---------- */
  function renderLogin() {
    const online = window.NAXOSH_DB && NAXOSH_DB.active;
    root.innerHTML = `
      <div class="container">
        <div class="adm-login">
          <div class="hero-logo adm-login-logo">🛠️</div>
          <h1>${STR.admin.loginTitle}</h1>
          ${online ? `<label>${STR.admin.email}</label>
          <input type="email" id="adm-email" dir="ltr" autocomplete="username">` : ``}
          <label>${STR.admin.password}</label>
          <input type="password" id="adm-pw" dir="ltr" autocomplete="current-password">
          <p class="auth-err" id="adm-err"></p>
          <button class="btn btn-primary btn-block" id="adm-enter">${STR.admin.enter}</button>
        </div>
      </div>`;
    const setErr = m => { root.querySelector("#adm-err").textContent = m; };
    const go = () => {
      const pw = root.querySelector("#adm-pw").value;
      if (online) {
        const email = root.querySelector("#adm-email").value;
        const btn = root.querySelector("#adm-enter");
        btn.disabled = true; setErr("");
        NAXOSH_DB.adminSignIn(email, pw).then(ok => {
          btn.disabled = false;
          if (ok) { renderPanel(); renderChrome("admin"); }
          else setErr(STR.admin.wrongPw);
        });
      } else {
        if (NAXOSH.adminLogin(pw)) { renderPanel(); renderChrome("admin"); }
        else setErr(STR.admin.wrongPw);
      }
    };
    root.querySelector("#adm-enter").addEventListener("click", go);
    root.querySelector("#adm-pw").addEventListener("keydown", e => { if (e.key === "Enter") go(); });
  }

  /* ---------- چوارچێوەی داشبۆرد ---------- */
  function renderPanel() {
    content = NAXOSH.snapshot();
    const T = STR.admin.tabs;
    const tabs = [
      ["texts", T.texts], ["doctors", T.doctors], ["specialties", T.specialties],
      ["slots", T.slots], ["bookings", T.bookings], ["settings", T.settings]
    ];
    root.innerHTML = `
      <div class="adm-wrap container">
        <div class="adm-bar">
          <h1>🛠️ ${STR.admin.panel}</h1>
          <div class="adm-bar-actions">
            <button class="btn btn-primary" id="adm-save">${STR.admin.save}</button>
            <button class="btn btn-ghost btn-sm" id="adm-export">⬇ ${STR.admin.export}</button>
            <button class="btn btn-ghost btn-sm" id="adm-import">⬆ ${STR.admin.import}</button>
            <button class="btn btn-ghost btn-sm" id="adm-reset">↺ ${STR.admin.reset}</button>
            <button class="btn btn-ghost btn-sm" id="adm-logout">${STR.admin.logout}</button>
          </div>
        </div>
        <p class="adm-hint">${(window.NAXOSH_DB && NAXOSH_DB.active)
          ? "گۆڕانکارییەکان لە هەور (cloud) هەڵدەگیرێن — هەموو بەکارهێنەران یەکسەر دەیانبینن ✓"
          : "گۆڕانکارییەکان لەسەر هەمان وێبگەڕ هەڵدەگیرێن. بۆ بینینیان لەلایەن هەمووانەوە، فایلی ناوەڕۆک هەناردە بکە و دووبارە بڵاوبکەرەوە."}</p>
        <div class="adm-tabs">
          ${tabs.map(([id, label]) => `<button class="adm-tab-btn ${id === activeTab ? "active" : ""}" data-tab="${id}">${label}</button>`).join("")}
        </div>
        <div id="adm-tab"></div>
      </div>
      <span id="adm-flash" class="adm-flash"></span>
      <input type="file" id="adm-file" accept="application/json,.json" hidden>`;

    root.querySelector(".adm-tabs").addEventListener("click", e => {
      const b = e.target.closest(".adm-tab-btn"); if (!b) return;
      activeTab = b.dataset.tab;
      [...root.querySelectorAll(".adm-tab-btn")].forEach(x => x.classList.toggle("active", x === b));
      renderTab();
    });

    root.querySelector("#adm-save").addEventListener("click", () => { NAXOSH.saveContent(content); content = NAXOSH.snapshot(); flash(STR.admin.saved); });
    root.querySelector("#adm-logout").addEventListener("click", () => {
      Promise.resolve(NAXOSH.adminLogout()).then(() => { location.href = "index.html"; });
    });
    root.querySelector("#adm-export").addEventListener("click", exportContent);
    root.querySelector("#adm-import").addEventListener("click", () => root.querySelector("#adm-file").click());
    root.querySelector("#adm-file").addEventListener("change", importContent);
    root.querySelector("#adm-reset").addEventListener("click", () => {
      if (confirm("هەموو گۆڕانکارییەکان دەسڕێنەوە و دەگەڕێنەوە بۆ بنەڕەت. دڵنیایت؟")) { NAXOSH.resetContent(); location.reload(); }
    });

    renderTab();
  }

  function renderTab() {
    // گۆڕینی بۆکس بە کۆپییەکی نوێ تاکو لیسنەرە کۆنەکان نەمێننەوە
    const old = document.getElementById("adm-tab");
    const box = old.cloneNode(false);
    old.replaceWith(box);
    ({ texts: tabTexts, doctors: tabDoctors, specialties: tabSpecialties, slots: tabSlots, bookings: tabBookings, settings: tabSettings }[activeTab] || tabTexts)(box);
  }

  /* ---------- تابی دەقەکان ---------- */
  const TEXT_FIELDS = [
    ["گشتی", [
      ["brand", "ناوی ماڵپەڕ", false],
      ["tagline", "دروشم (ژێر ناو)", false],
      ["emergency", "هێڵی فریاکەوتن (سەرەوە)", true]
    ]],
    ["پەڕەی سەرەتا", [
      ["home.heroTitle", "ناونیشانی سەرەکی", false],
      ["home.heroLead", "دەقی ژێر ناونیشان", true],
      ["home.heroCta", "نووسینی دوگمەی گەورە", false],
      ["home.heroScroll", "بەستەری «چۆن کاردەکات»", false]
    ]],
    ["مینۆ", [
      ["nav.home", "سەرەتا", false],
      ["nav.specialties", "خزمەتگوزارییەکان", false],
      ["nav.doctors", "پزیشکەکان", false],
      ["nav.appointments", "چاوپێکەوتنەکانم", false],
      ["nav.book", "دوگمەی تۆمارکردن", false]
    ]],
    ["فووتەر", [
      ["footer.note", "تێبینی فووتەر", true],
      ["footer.rights", "مافەکان", false]
    ]]
  ];

  function tabTexts(box) {
    box.innerHTML = TEXT_FIELDS.map(([group, items]) => `
      <div class="adm-section">
        <h3>${group}</h3>
        ${items.map(([path, label, long]) => {
          const v = esc(getPath(content.texts, path));
          const field = long
            ? `<textarea data-path="${path}" rows="2">${v}</textarea>`
            : `<input data-path="${path}" value="${v}">`;
          return `<label class="adm-field">${label}${field}</label>`;
        }).join("")}
      </div>`).join("");
    box.addEventListener("input", e => {
      const p = e.target.dataset.path; if (!p) return;
      setPath(content.texts, p, e.target.value);
    });
  }

  /* ---------- تابی پزیشکەکان ---------- */
  function specOptions(sel) {
    return content.specialties.map(s => `<option value="${s.id}" ${s.id === sel ? "selected" : ""}>${esc(s.name)}</option>`).join("");
  }
  function tabDoctors(box) {
    box.innerHTML = `
      <button class="btn btn-primary btn-sm adm-add" id="add-doc">➕ ${STR.admin.add}</button>
      <div id="doc-cards">${content.doctors.map(doctorRow).join("")}</div>`;

    document.getElementById("add-doc").addEventListener("click", () => {
      const id = content.doctors.reduce((m, d) => Math.max(m, d.id), 0) + 1;
      content.doctors.push({ id, name: "", spec: content.specialties[0] ? content.specialties[0].id : "", title: "", rating: 5, reviews: 0, price: 15000, exp: 1, langs: ["کوردی"], days: [0, 1, 2, 3, 4, 6], bio: "" });
      renderTab();
    });

    const cards = document.getElementById("doc-cards");
    const onEdit = e => {
      const card = e.target.closest("[data-idx]"); if (!card) return;
      const idx = +card.dataset.idx, f = e.target.dataset.f; if (!f) return;
      if (f === "day") {
        const day = +e.target.dataset.day;
        const arr = Array.isArray(content.doctors[idx].days) ? content.doctors[idx].days : [];
        const k = arr.indexOf(day);
        if (e.target.checked && k < 0) arr.push(day);
        else if (!e.target.checked && k >= 0) arr.splice(k, 1);
        arr.sort((a, b) => a - b);
        content.doctors[idx].days = arr;
        return;
      }
      let v = e.target.value;
      if (e.target.type === "checkbox") v = e.target.checked;
      else if (["price", "exp", "reviews"].includes(f)) v = parseInt(v || "0", 10) || 0;
      else if (f === "rating") v = parseFloat(v || "0") || 0;
      else if (f === "langs") v = v.split(/[،,]/).map(s => s.trim()).filter(Boolean);
      content.doctors[idx][f] = v;
    };
    cards.addEventListener("input", onEdit);
    cards.addEventListener("change", onEdit);
    cards.addEventListener("click", e => {
      const del = e.target.closest(".adm-del"); if (!del) return;
      content.doctors.splice(+del.dataset.idx, 1); renderTab();
    });
  }
  function doctorRow(d, idx) {
    return `
      <div class="adm-card" data-idx="${idx}">
        <div class="adm-card-head">
          <strong>${esc(d.name) || "پزیشکی نوێ"}</strong>
          <button class="btn btn-sm btn-ghost adm-del" data-idx="${idx}">🗑 ${STR.admin.delete}</button>
        </div>
        <div class="adm-grid">
          <label class="adm-field">ناو<input data-f="name" value="${esc(d.name)}"></label>
          <label class="adm-field">پسپۆڕی (title)<input data-f="title" value="${esc(d.title)}"></label>
          <label class="adm-field">بەش<select data-f="spec">${specOptions(d.spec)}</select></label>
          <label class="adm-field">نرخ (د.ع)<input type="number" data-f="price" value="${d.price}"></label>
          <label class="adm-field">ساڵی ئەزموون<input type="number" data-f="exp" value="${d.exp}"></label>
          <label class="adm-field">هەڵسەنگاندن (٠–٥)<input type="number" step="0.1" data-f="rating" value="${d.rating}"></label>
          <label class="adm-field">ژمارەی پێداچوونەوە<input type="number" data-f="reviews" value="${d.reviews}"></label>
          <label class="adm-field">زمانەکان (بە ، جیابکەرەوە)<input data-f="langs" value="${esc((d.langs || []).join("، "))}"></label>
          <div class="adm-field adm-full">
            <span>ڕۆژەکانی بەردەستبوون</span>
            <div class="adm-days">
              ${(STR.days || []).map((dn, di) => `<label class="adm-day"><input type="checkbox" data-f="day" data-day="${di}" ${(d.days || []).includes(di) ? "checked" : ""}> ${dn}</label>`).join("")}
            </div>
          </div>
          <label class="adm-field adm-full">کورتەی پزیشک<textarea data-f="bio" rows="2">${esc(d.bio)}</textarea></label>
        </div>
      </div>`;
  }

  /* ---------- تابی پسپۆڕییەکان ---------- */
  function tabSpecialties(box) {
    box.innerHTML = `
      <button class="btn btn-primary btn-sm adm-add" id="add-spec">➕ ${STR.admin.add}</button>
      <div id="spec-cards">${content.specialties.map(specRow).join("")}</div>`;

    document.getElementById("add-spec").addEventListener("click", () => {
      content.specialties.push({ id: "s" + (Date.now()).toString(36), icon: "🩺", name: "", short: "", desc: "", treats: [] });
      renderTab();
    });
    const cards = document.getElementById("spec-cards");
    const onEdit = e => {
      const card = e.target.closest("[data-idx]"); if (!card) return;
      const idx = +card.dataset.idx, f = e.target.dataset.f; if (!f) return;
      let v = e.target.value;
      if (f === "treats") v = v.split("\n").map(s => s.trim()).filter(Boolean);
      content.specialties[idx][f] = v;
    };
    cards.addEventListener("input", onEdit);
    cards.addEventListener("click", e => {
      const del = e.target.closest(".adm-del"); if (!del) return;
      content.specialties.splice(+del.dataset.idx, 1); renderTab();
    });
  }
  function specRow(s, idx) {
    return `
      <div class="adm-card" data-idx="${idx}">
        <div class="adm-card-head">
          <strong>${esc(s.name) || "پسپۆڕی نوێ"} <span class="muted">(${esc(s.id)})</span></strong>
          <button class="btn btn-sm btn-ghost adm-del" data-idx="${idx}">🗑 ${STR.admin.delete}</button>
        </div>
        <div class="adm-grid">
          <label class="adm-field">ئایکۆن (emoji)<input data-f="icon" value="${esc(s.icon)}"></label>
          <label class="adm-field">ناو<input data-f="name" value="${esc(s.name)}"></label>
          <label class="adm-field adm-full">کورتە (short)<input data-f="short" value="${esc(s.short)}"></label>
          <label class="adm-field adm-full">وەسف<textarea data-f="desc" rows="2">${esc(s.desc)}</textarea></label>
          <label class="adm-field adm-full">چارەسەرەکان (هەر دێڕێک یەک)<textarea data-f="treats" rows="3">${esc((s.treats || []).join("\n"))}</textarea></label>
        </div>
      </div>`;
  }

  /* ---------- تابی کاتەکان ---------- */
  function tabSlots(box) {
    box.innerHTML = `
      <div class="adm-section">
        <h3>کاتە بەردەستەکانی تۆمارکردن</h3>
        <p class="muted">هەر دێڕێک یەک کات. بۆ نموونە: ٠٩:٠٠</p>
        <textarea id="slots-ta" rows="10">${esc(content.timeSlots.join("\n"))}</textarea>
      </div>`;
    box.querySelector("#slots-ta").addEventListener("input", e => {
      content.timeSlots = e.target.value.split("\n").map(s => s.trim()).filter(Boolean);
    });
  }

  /* ---------- تابی تۆمارکراوەکان ---------- */
  function tabBookings(box) {
    const list = (typeof getBookings === "function" ? getBookings() : []).slice().reverse();
    if (!list.length) {
      box.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><h3>هیچ تۆمارکردنێک نییە</h3></div>`;
      return;
    }
    box.innerHTML = list.map(b => `
      <div class="adm-booking" data-id="${b.id}">
        <div>
          <strong>${esc(b.userName) || "—"}</strong>
          <span class="muted" dir="ltr">${esc(b.userPhone) || "—"}</span>
          <p class="muted">پزیشک: ${esc(b.doctorName)} • ${esc(specName(b.spec))}</p>
          <p>📅 ${esc(b.day)} — 🕐 ${esc(b.time)}</p>
          ${b.symptoms ? `<p class="muted">📝 ${esc(b.symptoms)}</p>` : ""}
        </div>
        <div class="adm-booking-side">
          <span class="badge badge-amber">${esc(b.status || "")}</span>
          <button class="btn btn-sm btn-ghost adm-bk-del" data-id="${b.id}">🗑 ${STR.admin.delete}</button>
        </div>
      </div>`).join("");
    box.addEventListener("click", e => {
      const del = e.target.closest(".adm-bk-del"); if (!del) return;
      if (confirm("ئەم تۆمارکردنە بسڕێتەوە؟")) { cancelBooking(del.dataset.id); renderTab(); }
    });
  }

  /* ---------- تابی ڕێکخستن ---------- */
  function tabSettings(box) {
    box.innerHTML = `
      <div class="adm-section">
        <h3>${STR.admin.changePw}</h3>
        <p class="muted">${(window.NAXOSH_DB && NAXOSH_DB.active)
          ? "ئەمە وشەی نهێنیی هەژماری ڕاستەقینەی بەڕێوەبەر دەگۆڕێت (لانیکەم ٦ پیت)."
          : "وشەی نهێنیی ئێستا تەنها لەسەر ئەم وێبگەڕە کاردەکات. ئەمە پاراستنی ڕاستەقینە نییە."}</p>
        <label class="adm-field">${STR.admin.newPw}<input type="password" id="new-pw" dir="ltr"></label>
        <button class="btn btn-primary btn-sm" id="save-pw">${STR.admin.changePw}</button>
      </div>
      <div class="adm-section">
        <h3>ناوەڕۆک</h3>
        <p class="muted">پاشەکەوتکردنی فایلێک لە هەموو دەقەکان و پزیشکەکان (بۆ پاراستن یان بڵاوکردنەوە).</p>
        <div class="adm-bar-actions">
          <button class="btn btn-ghost btn-sm" id="set-export">⬇ ${STR.admin.export}</button>
          <button class="btn btn-ghost btn-sm" id="set-reset">↺ ${STR.admin.reset}</button>
        </div>
      </div>`;
    box.querySelector("#save-pw").addEventListener("click", () => {
      const pw = box.querySelector("#new-pw").value.trim();
      if (pw.length < 6) { alert("وشەی نهێنی پێویستە لانیکەم ٦ پیت بێت."); return; }
      Promise.resolve(NAXOSH.setAdminPw(pw)).then(() => {
        box.querySelector("#new-pw").value = ""; flash(STR.admin.pwChanged);
      }).catch(err => {
        // Firebase داوای چوونەژوورەوەی نوێ دەکات ئەگەر ماوەیەک تێپەڕیبێت
        alert("نەتوانرا وشەی نهێنی بگۆڕدرێت. تکایە بچۆ دەرەوە و دووبارە بچۆ ژوورەوە، پاشان هەوڵ بدەرەوە.\n(" + (err.code || err.message || err) + ")");
      });
    });
    box.querySelector("#set-export").addEventListener("click", exportContent);
    box.querySelector("#set-reset").addEventListener("click", () => {
      if (confirm("گەڕانەوە بۆ بنەڕەت؟")) { NAXOSH.resetContent(); location.reload(); }
    });
  }

  /* ---------- هەناردن / هێنان ---------- */
  function exportContent() {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "naxosh-content.json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  function importContent(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        NAXOSH.saveContent(parsed);
        content = NAXOSH.snapshot();
        renderTab();
        flash("ناوەڕۆک هێنرا ✓");
      } catch { alert("فایلەکە دروست نییە."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  /* ---------- نوێکردنەوەی خۆکار کاتێک تۆمارکردن لە هەورەوە دەگۆڕێت ---------- */
  document.addEventListener("naxosh:bookings", () => {
    if (NAXOSH.isAdmin() && activeTab === "bookings") renderTab();
  });

  /* ---------- گۆڕانی دۆخی ناسنامە (دانیشتنی پارێزراو یان چوونەدەرەوە) ---------- */
  document.addEventListener("naxosh:auth", () => {
    const panelShown = !!document.getElementById("adm-save");
    if (NAXOSH.isAdmin() && !panelShown) { renderPanel(); renderChrome("admin"); }
    else if (!NAXOSH.isAdmin() && panelShown) { renderLogin(); }
  });

  /* ---------- دەستپێک ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    if (NAXOSH.isAdmin()) renderPanel(); else renderLogin();
  });
})();
