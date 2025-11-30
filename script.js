(function () {
  // ---------- Feature flags ----------
  // 0 = hide game from menu, 1 = show "Cam Crush (beta)" link
  const GAME_LINK_ENABLED = 0;

  // ---------- Utilities ----------
  const qs = (sel, el = document) => el.querySelector(sel);

  function getPersonFromURL() {
    const url = new URL(window.location.href);
    const slug = (url.searchParams.get("p") || "").toLowerCase();
    const found = PEOPLE.find((p) => p.slug === slug);
    return found || PEOPLE[0];
  }

  function fmtCT(iso) {
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

  function setTitleAndLeague(person) {
    const pageTitleText = person.title
      ? person.title
      : `Countdown to ${person.name}’s First Fantasy Championship`;

    document.title = pageTitleText;
    const heading = qs("#personHeading");
    if (heading) heading.textContent = pageTitleText;

    // League label at top-right:
    const pageTitleEl = qs("#pageTitle");
    if (pageTitleEl) {
      pageTitleEl.textContent = person.multiYear ? "FCL" : "Beast League";
    }
  }

  function setHeaderImages(person) {
    const defaults = [
      "assets/headers/default.png",
      "assets/headers/default.png",
      "assets/headers/default.png",
      "assets/headers/default.png",
    ];
    const imgs =
      person.headerImages && person.headerImages.length
        ? person.headerImages
        : defaults;
    const list = [
      qs("#headerImg1"),
      qs("#headerImg2"),
      qs("#headerImg3"),
      qs("#headerImg4"),
    ];
    for (let i = 0; i < list.length; i++) {
      const imgEl = list[i];
      if (!imgEl) continue;
      const src = imgs[i] || defaults[i];
      imgEl.src = src;
      imgEl.alt = `${person.name} header image ${i + 1}`;
    }
  }

  function buildMenu(current) {
    const ul = qs("#peopleList");
    if (!ul) return;
    ul.innerHTML = "";

    // People links
    for (const p of PEOPLE) {
      if (p.hideFromMenu) continue; // <--- skip hidden entries like Matt

      const a = document.createElement("a");
      a.href = `?p=${encodeURIComponent(p.slug)}`;
      a.textContent = p.name;
      if (p.slug === current.slug) a.setAttribute("aria-current", "page");

      const li = document.createElement("li");
      li.appendChild(a);
      ul.appendChild(li);
    }

    // Optional Cam Crush link (behind feature flag)
    if (GAME_LINK_ENABLED === 1) {
      // Divider
      const hr = document.createElement("li");
      hr.style.margin = ".5rem 0";
      hr.style.borderTop = "1px solid #263041";
      ul.appendChild(hr);

      // Game link
      const gameLi = document.createElement("li");
      const gameA = document.createElement("a");
      gameA.href = "cam-crush.html"; // ensure this file exists at site root
      gameA.textContent = "Cam Crush (beta)";

      // Highlight as current when you're on the game page
      const path = window.location.pathname || "";
      if (
        path.endsWith("/cam-crush.html") ||
        path === "/cam-crush.html" ||
        path.endsWith("/cam-crush")
      ) {
        gameA.setAttribute("aria-current", "page");
      }
      gameLi.appendChild(gameA);
      ul.appendChild(gameLi);
    }
  }

  // Drawer (menu)
  const drawer = qs("#menuDrawer");
  const menuBtn = qs("#menuBtn");
  const backdrop = qs("#backdrop");

  function openDrawer() {
    if (!drawer || !menuBtn || !backdrop) return;
    drawer.setAttribute("aria-hidden", "false");
    menuBtn.setAttribute("aria-expanded", "true");
    backdrop.hidden = false;
    const firstLink = qs("#peopleList a");
    if (firstLink) firstLink.focus();
  }
  function closeDrawer() {
    if (!drawer || !menuBtn || !backdrop) return;
    drawer.setAttribute("aria-hidden", "true");
    menuBtn.setAttribute("aria-expanded", "false");
    backdrop.hidden = true;
    menuBtn.focus();
  }

  if (menuBtn && drawer && backdrop) {
    menuBtn.addEventListener("click", () => {
      const isOpen = drawer.getAttribute("aria-hidden") === "false";
      isOpen ? closeDrawer() : openDrawer();
    });
    backdrop.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawer.getAttribute("aria-hidden") === "false") {
        closeDrawer();
      }
    });
  }

  // ---------- Countdown helpers ----------
  const timerEl = qs("#timer");
  const dEl = qs("#d");
  const hEl = qs("#h");
  const mEl = qs("#m");
  const sEl = qs("#s");
  const deadlineText = qs("#deadlineText");
  const quipEl = qs("#quip");
  const yearPicker = qs("#yearPicker");
  const yearSelect = qs("#yearSelect");

  let tickHandle = null;
  function clearTicker() {
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  }

  function startCountdown(targetIso) {
    if (!timerEl || !dEl || !hEl || !mEl || !sEl || !deadlineText) return;

    clearTicker();
    const target = new Date(targetIso);
    deadlineText.textContent = fmtCT(targetIso);
    timerEl.style.display = ""; // ensure visible

    function renderCountdown() {
      const now = new Date();
      let diff = Math.max(0, target.getTime() - now.getTime());
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      dEl.textContent = String(days);
      hEl.textContent = String(hours).padStart(2, "0");
      mEl.textContent = String(minutes).padStart(2, "0");
      sEl.textContent = String(seconds).padStart(2, "0");

      if (totalSeconds <= 0) {
        timerEl.outerHTML = `<p class="final">Season over. Rings won by ${person.name}: 0.</p>`;
        const dt = qs("#deadlineText");
        if (dt && dt.parentElement) dt.parentElement.style.display = "none";
        clearTicker();
      }
    }

    tickHandle = setInterval(renderCountdown, 1000);
    renderCountdown();
  }

  // ---------- Complaint Counter (Cam-only, localStorage-persisted) ----------
  function initComplaintCounter(person) {
    const card = qs("#complaintCard");
    const countEl = qs("#complaintCount");
    const btn = qs("#complaintIncrement");

    if (!card || !countEl || !btn) return;

    // Only show this on Cam's (Cam vs Matt) page
    if (person.slug !== "cam") {
      card.hidden = true;
      card.style.display = "none";
      return;
    }

    card.hidden = false;
    card.style.display = "";

    const STORAGE_KEY = "camComplaintCount";
    let count = 0;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const n = parseInt(stored, 10);
        if (!Number.isNaN(n) && n >= 0) count = n;
      }
    } catch (err) {
      // localStorage might be disabled; fail soft.
    }

    function render() {
      countEl.textContent = String(count);
    }

    btn.addEventListener("click", () => {
      count += 1;
      render();
      try {
        window.localStorage.setItem(STORAGE_KEY, String(count));
      } catch (err) {
        // Ignore storage errors
      }
    });

    render();
  }

  // ---------- Head Size Counter (Matt side, localStorage-persisted) ----------
  function initHeadSizeCounter(person) {
    const card = qs("#headSizeCard");
    const countEl = qs("#headSizeValue");
    const btn = qs("#headSizeIncrement");

    if (!card || !countEl || !btn) return;

    // Only on Cam vs Matt page
    if (person.slug !== "cam") {
      card.hidden = true;
      card.style.display = "none";
      return;
    }

    card.hidden = false;
    card.style.display = "";

    const STORAGE_KEY = "mattHeadDiameter";
    let inches = 0;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const n = parseInt(stored, 10);
        if (!Number.isNaN(n) && n >= 0) inches = n;
      }
    } catch (err) {
      // ignore
    }

    function render() {
      countEl.textContent = String(inches);
    }

    btn.addEventListener("click", () => {
      inches += 1;
      render();
      try {
        window.localStorage.setItem(STORAGE_KEY, String(inches));
      } catch (err) {
        // ignore
      }
    });

    render();
  }

  // ---------- Render ----------
  const person = getPersonFromURL();
  setTitleAndLeague(person);
  setHeaderImages(person);
  buildMenu(person);

  // Quip text (per-person override, fallback to global QUIPS)
  const pool =
    person.quips && person.quips.length ? person.quips : (QUIPS || []);
  if (quipEl) {
    quipEl.textContent = pool.length
      ? pool[Math.floor(Math.random() * pool.length)]
      : "";
  }

  // Counters
  initComplaintCounter(person);
  initHeadSizeCounter(person);

  if (person.multiYear) {
    // Dom (multi-year): show picker and DEFAULT to 2025 immediately
    if (yearPicker) {
      yearPicker.hidden = false;
      yearPicker.style.display = ""; // show for Dom
    }

    if (yearSelect) {
      yearSelect.innerHTML = "";
      (person.years || []).forEach((yr) => {
        const opt = document.createElement("option");
        opt.value = String(yr);
        opt.textContent = String(yr);
        yearSelect.appendChild(opt);
      });

      yearSelect.addEventListener("change", () => {
        const yr = Number(yearSelect.value);
        const iso =
          typeof domIsoForYear === "function" ? domIsoForYear(yr) : "";
        if (iso) startCountdown(iso);
      });

      // Default to 2025
      const defaultYear = 2025;
      if ((person.years || []).includes(defaultYear)) {
        yearSelect.value = String(defaultYear);
        yearSelect.dispatchEvent(new Event("change"));
      }
    }
  } else {
    // Cam vs Matt (and any non-multi-year): hide the year selector completely and run their timer
    if (yearPicker) {
      yearPicker.hidden = true;
      yearPicker.style.display = "none";
    }
    const targetIso = person.targetIso || GLOBAL_SEASON_END_ISO;
    startCountdown(targetIso);
  }
})();
