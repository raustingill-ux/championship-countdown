(function () {
  // ---------- Utilities ----------
  const qs = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  function getPersonFromURL() {
    const url = new URL(window.location.href);
    const slug = (url.searchParams.get("p") || "").toLowerCase();
    const found = PEOPLE.find((p) => p.slug === slug);
    return found || PEOPLE[0];
  }

  function fmtCT(iso) {
    // Present a date/time in America/Chicago for readability
    const d = new Date(iso);
    const opts = {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    return new Intl.DateTimeFormat(undefined, opts).format(d);
  }

  function setTitle(person) {
    document.title = `Countdown to ${person.name}’s First Fantasy Championship`;
    qs("#personHeading").textContent =
      `Countdown to ${person.name}’s First Fantasy Championship`;
  }

  function setHeaderImages(person) {
    const defaults = [
      "assets/headers/default.png",
      "assets/headers/default.png",
      "assets/headers/default.png",
      "assets/headers/default.png",
    ];
    const imgs = (person.headerImages && person.headerImages.length)
      ? person.headerImages
      : defaults;
    const list = [qs("#headerImg1"), qs("#headerImg2"), qs("#headerImg3"), qs("#headerImg4")];
    for (let i = 0; i < list.length; i++) {
      const src = imgs[i] || defaults[i];
      list[i].src = src;
      list[i].alt = `${person.name} header image ${i + 1}`;
    }
  }

  function buildMenu(current) {
    const ul = qs("#peopleList");
    ul.innerHTML = "";
    for (const p of PEOPLE) {
      const a = document.createElement("a");
      a.href = `?p=${encodeURIComponent(p.slug)}`;
      a.textContent = p.name;
      if (p.slug === current.slug) a.setAttribute("aria-current", "page");
      const li = document.createElement("li");
      li.appendChild(a);
      ul.appendChild(li);
    }
  }

  // Drawer (menu)
  const drawer = qs("#menuDrawer");
  const menuBtn = qs("#menuBtn");
  const backdrop = qs("#backdrop");
  function openDrawer() {
    drawer.setAttribute("aria-hidden", "false");
    menuBtn.setAttribute("aria-expanded", "true");
    backdrop.hidden = false;
    const firstLink = qs("#peopleList a");
    if (firstLink) firstLink.focus();
  }
  function closeDrawer() {
    drawer.setAttribute("aria-hidden", "true");
    menuBtn.setAttribute("aria-expanded", "false");
    backdrop.hidden = true;
    menuBtn.focus();
  }
  menuBtn.addEventListener("click", () => {
    const isOpen = drawer.getAttribute("aria-hidden") === "false";
    isOpen ? closeDrawer() : openDrawer();
  });
  backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.getAttribute("aria-hidden") === "false") closeDrawer();
  });

  // ---------- Render ----------
  const person = getPersonFromURL();
  setTitle(person);
  setHeaderImages(person);
  buildMenu(person);

  const timerEl = qs("#timer");
  const dEl = qs("#d"), hEl = qs("#h"), mEl = qs("#m"), sEl = qs("#s");
  const deadlineText = qs("#deadlineText");
  const quipEl = qs("#quip");

  // Quip
  quipEl.textContent = (Array.isArray(QUIPS) && QUIPS.length)
    ? QUIPS[Math.floor(Math.random() * QUIPS.length)]
    : "";

  // DOM helpers for countdown
  let tickHandle = null;
  function clearTicker() {
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  }
  function startCountdown(targetIso) {
    clearTicker();
    const target = new Date(targetIso);
    deadlineText.textContent = fmtCT(targetIso);

    function renderCountdown() {
      const now = new Date();
      let diff = Math.max(0, target.getTime() - now.getTime());
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      dEl.textContent = days;
      hEl.textContent = String(hours).padStart(2, "0");
      mEl.textContent = String(minutes).padStart(2, "0");
      sEl.textContent = String(seconds).padStart(2, "0");

      if (totalSeconds <= 0) {
        timerEl.outerHTML =
          `<p class="final">Season over. Rings won by ${person.name}: 0.</p>`;
        const dt = qs("#deadlineText");
        if (dt && dt.parentElement) dt.parentElement.style.display = "none";
        clearTicker();
      }
    }

    tickHandle = setInterval(renderCountdown, 1000);
    renderCountdown();
  }

  // Person-specific behavior
  if (person.multiYear) {
    // Dom: show year picker; hide timer until a year is chosen
    const pickerWrap = qs("#yearPicker");
    const select = qs("#yearSelect");

    // Fill years (2025..2035)
    select.innerHTML = "";
    (person.years || []).forEach((yr) => {
      const opt = document.createElement("option");
      opt.value = String(yr);
      opt.textContent = String(yr);
      select.appendChild(opt);
    });

    pickerWrap.hidden = false;
    // Hide timer and deadline text until selection
    timerEl.style.display = "none";
    deadlineText.textContent = "— pick a year above —";

    select.addEventListener("change", () => {
      const yr = Number(select.value);
      const iso = (typeof domIsoForYear === "function") ? domIsoForYear(yr) : "";
      if (iso) {
        // Show timer and start ticking
        timerEl.style.display = "";
        startCountdown(iso);
      }
    });

    // Optional: pre-select the first year but do NOT auto-start the timer
    // (per requirement: no countdown on main screen). Leave it blank until user chooses.

  } else {
    // Regular person (Matt, Cam): run single countdown using targetIso or global default
    const targetIso = person.targetIso || GLOBAL_SEASON_END_ISO;
    startCountdown(targetIso);
  }
})();
