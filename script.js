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
    document.title = `Countdown to ${person.name}’s First Fantasy Championship`;
    qs("#personHeading").textContent =
      `Countdown to ${person.name}’s First Fantasy Championship`;
    // League label at top-right:
    qs("#pageTitle").textContent = person.multiYear ? "FCL" : "Beast League";
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

  // ---------- Countdown helpers ----------
  const timerEl = qs("#timer");
  const dEl = qs("#d"), hEl = qs("#h"), mEl = qs("#m"), sEl = qs("#s");
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
    clearTicker();
    const target = new Date(targetIso);
    deadlineText.textContent = fmtCT(targetIso);
    timerEl.style.display = ""; // make sure visible when we start

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

  // ---------- Render ----------
  const person = getPersonFromURL();
  setTitleAndLeague(person);
  setHeaderImages(person);
  buildMenu(person);

  // Quip text
  quipEl.textContent = (Array.isArray(QUIPS) && QUIPS.length)
    ? QUIPS[Math.floor(Math.random() * QUIPS.length)]
    : "";

  if (person.multiYear) {
    // DOM (multi-year): show picker and DEFAULT to 2025 immediately
    yearPicker.hidden = false;

    // build options 2025..2035
    yearSelect.innerHTML = "";
    (person.years || []).forEach((yr) => {
      const opt = document.createElement("option");
      opt.value = String(yr);
      opt.textContent = String(yr);
      yearSelect.appendChild(opt);
    });

    // When user changes, start that year's countdown
    yearSelect.addEventListener("change", () => {
      const yr = Number(yearSelect.value);
      const iso = (typeof domIsoForYear === "function") ? domIsoForYear(yr) : "";
      if (iso) startCountdown(iso);
    });

    // Default to 2025 so the countdown shows immediately
    const defaultYear = 2025;
    if ((person.years || []).includes(defaultYear)) {
      yearSelect.value = String(defaultYear);
      yearSelect.dispatchEvent(new Event("change"));
    }
  } else {
    // Matt & Cam: NO year selector at all, hide it explicitly
    if (yearPicker) yearPicker.hidden = true;
    const targetIso = person.targetIso || GLOBAL_SEASON_END_ISO;
    startCountdown(targetIso);
  }
})();
