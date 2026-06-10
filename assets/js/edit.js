/* ============================================================
   edit.js — دەستکاریکردنی ڕاستەوخۆ لەسەر پەڕە (تەنها بۆ بەڕێوەبەر)
   ------------------------------------------------------------
   بەڕێوەبەر دوگمەی ✏️ لە گۆشەی پەڕەدا دەبینێت. کاتێک دایدەگرێت، هەموو
   دەقەکانی پەڕە دەکرێن بە دەستکاریکراو (contenteditable). هەر دەقێک
   بگۆڕێت و «پاشەکەوتکردن» دابگرێت، گۆڕانکارییەکە بۆ هەمووان دەنێردرێت.

   هەر دەقێک «خانەیەکی تایبەتی خۆیەتی»: کلیلەکە لەسەر شوێنی ئەلیمێنتەکە
   لە پەڕەدا دروست دەکرێت (نەک لەسەر دەقەکە)، بۆیە دوو دەقی وەک یەک لە دوو
   شوێندا سەربەخۆن — گۆڕینی یەکێکیان ئەوەی تر ناگۆڕێت.

   لەسەر داشبۆردی بەڕێوەبەر و پزیشک کار ناکات (ئەوان دەستکاری تایبەتی
   خۆیان هەیە).
   ============================================================ */

(function () {
  // لەسەر داشبۆردەکان کار مەکە
  if (document.getElementById("admin-root") || document.getElementById("dr-root")) return;

  // تاگەکانی دەقدار کە دەکرێن دەستکاری بکرێن
  const TAGS = "h1,h2,h3,h4,h5,h6,p,span,a,button,small,strong,b,em,li,label,td,th,figcaption,blockquote,summary";
  // ئەمانە دەستکاری ناکرێن (کۆنترۆڵ و ئامێرەکانی ئینتەرفەیس)
  const SKIP = ".nx-fab,.nx-bar,.nav-toggle,.modal-close,.modal-overlay,.filter-toggle,.auth-logout,.auth-login,.adm-flash";

  let editing = false;

  function getMap() { return (window.NAXOSH && NAXOSH.getUiText) ? NAXOSH.getUiText() : {}; }

  /* ئەو ئەلیمێنتانەی تەنها دەقیان تێدایە (منداڵی ئەلیمێنتیان نییە) و دەق هەیە */
  function editableEls() {
    return [...document.querySelectorAll(TAGS)].filter(elm => {
      if (elm.children.length) return false;                 // تەنها دەقی ساکار
      const t = (elm.textContent || "").trim();
      if (!t) return false;
      if (!/[\p{L}\p{N}]/u.test(t)) return false;            // نیشانە تەنیا (☰ ✕ ▾) نا
      if (elm.closest(SKIP)) return false;
      if (elm.isContentEditable && !elm.classList.contains("nx-editable")) return false;
      return true;
    });
  }

  /* کلیلی نەگۆڕ بۆ هەر ئەلیمێنتێک — لەسەر شوێنی لە دارەکەدا (نەک دەقەکە).
     نموونە: "home/section2/div1/div3/h3" — بۆیە هەر شوێنێک خانەی خۆیەتی. */
  function keyFor(el) {
    const parts = [];
    let node = el;
    while (node && node !== document.body && node.parentNode) {
      const parent = node.parentNode;
      const tag = node.tagName ? node.tagName.toLowerCase() : "x";
      let i = 0, idx = 0;
      for (const sib of parent.children) {
        if (sib.id && sib.id.indexOf("nx-") === 0) continue;     // ئامێرەکانی دەستکاری نەژمێرە
        if (sib.tagName && sib.tagName.toLowerCase() === tag) {
          i++;
          if (sib === node) { idx = i; break; }
        }
      }
      parts.unshift(tag + idx);
      node = parent;
    }
    return (document.body.dataset.page || "") + "/" + parts.join("/");
  }

  /* کلیل و دەقی بنەڕەت بۆ ئەلیمێنتێک ئامادە بکە (پێش جێبەجێکردنی override) */
  function prepare(el) {
    if (!el.dataset.nxKey) el.dataset.nxKey = keyFor(el);
    if (el.dataset.nxDefault === undefined) el.dataset.nxDefault = (el.textContent || "").trim();
  }

  /* جێبەجێکردنی دەقە دەستکاریکراوەکان — هەر کلیلێک بۆ خانەی خۆی */
  function applyUiText() {
    const map = getMap();
    editableEls().forEach(el => {
      prepare(el);                                  // دەقی بنەڕەت لێرە تۆمار دەبێت
      const val = map[el.dataset.nxKey];
      if (val != null && (el.textContent || "").trim() !== val) el.textContent = val;
    });
  }

  /* ---------- دوگمەی شناوەر (FAB) ---------- */
  function ensureFab() {
    const isAdmin = window.NAXOSH && NAXOSH.isAdmin && NAXOSH.isAdmin();
    let fab = document.getElementById("nx-fab");
    if (!isAdmin) { if (fab) fab.remove(); if (editing) stopEditing(); return; }
    if (fab) return;
    fab = document.createElement("button");
    fab.id = "nx-fab";
    fab.className = "nx-fab";
    fab.type = "button";
    fab.innerHTML = `✏️ <span>${STR.edit.start}</span>`;
    fab.addEventListener("click", startEditing);
    document.body.appendChild(fab);
  }

  /* ---------- چوونە دۆخی دەستکاری ---------- */
  function startEditing() {
    if (editing) return;
    editing = true;
    document.body.classList.add("nx-editing");

    editableEls().forEach(el => {
      prepare(el);
      el.classList.add("nx-editable");
      el.setAttribute("contenteditable", "true");
      el.setAttribute("spellcheck", "false");
    });

    const fab = document.getElementById("nx-fab");
    if (fab) fab.style.display = "none";

    const bar = document.createElement("div");
    bar.id = "nx-bar";
    bar.className = "nx-bar";
    bar.innerHTML = `
      <span class="nx-bar-hint">${STR.edit.hint}</span>
      <button type="button" class="btn btn-sm btn-ghost" id="nx-cancel">${STR.edit.cancel}</button>
      <button type="button" class="btn btn-sm btn-primary" id="nx-save">💾 ${STR.edit.save}</button>`;
    document.body.appendChild(bar);
    bar.querySelector("#nx-save").addEventListener("click", saveEditing);
    bar.querySelector("#nx-cancel").addEventListener("click", cancelEditing);

    // لە دۆخی دەستکاری، کلیک لەسەر بەستەر/دوگمە نابێتە هۆی ڕۆیشتن
    document.addEventListener("click", blockNav, true);
    document.addEventListener("submit", blockNav, true);
  }

  function blockNav(e) {
    if (!editing) return;
    if (e.target.closest("#nx-bar")) return;        // دوگمەکانی تووڵامراز ئازادن
    const a = e.target.closest("a,button");
    if (a) { e.preventDefault(); e.stopPropagation(); }
  }

  /* ---------- پاشەکەوتکردن — هەر خانە بە کلیلی خۆی ---------- */
  function saveEditing() {
    const map = Object.assign({}, getMap());
    document.querySelectorAll(".nx-editable").forEach(el => {
      const key = el.dataset.nxKey; if (!key) return;
      const val = (el.textContent || "").trim();
      const def = el.dataset.nxDefault || "";
      if (val && val !== def) map[key] = val;
      else delete map[key];        // گەڕاوەتەوە بۆ بنەڕەت — override لاببە
    });
    if (window.NAXOSH && NAXOSH.setUiText) NAXOSH.setUiText(map);
    stopEditing();
    applyUiText();
    flash(STR.edit.saved);
  }

  /* ---------- وازهێنان — دەقەکان بگەڕێنەرەوە ---------- */
  function cancelEditing() {
    const map = getMap();
    document.querySelectorAll(".nx-editable").forEach(el => {
      const key = el.dataset.nxKey;
      el.textContent = (map[key] != null) ? map[key] : (el.dataset.nxDefault != null ? el.dataset.nxDefault : el.textContent);
    });
    stopEditing();
  }

  /* ---------- دەرچوون لە دۆخی دەستکاری ---------- */
  function stopEditing() {
    editing = false;
    document.body.classList.remove("nx-editing");
    document.querySelectorAll(".nx-editable").forEach(el => {
      el.classList.remove("nx-editable");
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
    });
    const bar = document.getElementById("nx-bar");
    if (bar) bar.remove();
    const fab = document.getElementById("nx-fab");
    if (fab) fab.style.display = "";
    document.removeEventListener("click", blockNav, true);
    document.removeEventListener("submit", blockNav, true);
  }

  /* ---------- پەیامی سەرکەوتن ---------- */
  function flash(msg) {
    let n = document.getElementById("nx-flash");
    if (!n) {
      n = document.createElement("div");
      n.id = "nx-flash"; n.className = "adm-flash";
      document.body.appendChild(n);
    }
    n.textContent = msg; n.classList.add("show");
    setTimeout(() => n.classList.remove("show"), 1800);
  }

  /* ---------- بەستنەوە بە چاودێرییەکانەوە ---------- */
  function refresh() {
    if (!editing) { applyUiText(); ensureFab(); }
  }
  document.addEventListener("naxosh:content", () => setTimeout(refresh, 0));
  document.addEventListener("naxosh:auth", () => setTimeout(refresh, 0));
  document.addEventListener("naxosh:bookings", () => setTimeout(refresh, 0));

  // یەکەم جار + چەند هەوڵێکی دواتر — چونکە دۆخی بەڕێوەبەر بە درەنگ لە هەورەوە
  // دیاری دەکرێت؛ بۆیە تا ١٠ چرکە بەدوای دۆخەکەدا دەگەڕێین.
  function boot() {
    applyUiText();
    ensureFab();
    let tries = 0;
    const t = setInterval(() => {
      if (editing) return;
      ensureFab();
      if (document.getElementById("nx-fab") || ++tries > 14) clearInterval(t);
    }, 700);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 0));
  } else {
    setTimeout(boot, 0);
  }
  // گەڕانەوە بۆ پەڕە (bfcache) — دووبارە پشکنین
  window.addEventListener("pageshow", () => { if (!editing) ensureFab(); });
})();
