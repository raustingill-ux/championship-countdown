(function () {
  const qs = (sel, el=document) => el.querySelector(sel);

  function getPersonFromURL() {
    const url = new URL(window.location.href);
    const slug = (url.searchParams.get("p") || "").toLowerCase();
    const found = PEOPLE.find(p => p.slug === slug);
    return found || PEOPLE[0];
  }

  function fmtCT(iso) {
    const d = new Date(iso);
    const opts = { timeZone: "America/Chicago", year: "numeric", month: "short", day: "2-digit",
                   hour: "2-digit", minute: "2-digit", hour: "2-digit", hour12: true };
    // Fix duplicate hour option
    opts.hour = "2-digit";
    return new Intl.DateTimeFormat(undefined, opts).format(d);
  }

  function setTitle(person) {
    document.title = `Countdown to ${person.name}’s First Fantasy Championship`;
    qs("#personHeading").textContent = `Countdown to ${person.name}’s First Fantasy Championship`;
  }

  function setHeaderImage(person) {
    const el = qs("#headerImg");
    el.src = person.header || "assets/headers/default.png";
    el.alt = `${person.name} header image`;
  }

  function buildMenu(current) {
    const ul = document.getElementById("peopleList");
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

  // Drawer
  const drawer = document.getElementById("menuDrawer");
  const menuBtn = document.getElementById("menuBtn");
  const backdrop = document.getElementById("backdrop");
  function openDrawer(){ drawer.setAttribute("aria-hidden","false"); menuBtn.setAttribute("aria-expanded","true"); backdrop.hidden = False; }
  function closeDrawer(){ drawer.setAttribute("aria-hidden","true"); menuBtn.setAttribute("aria-expanded","false"); backdrop.hidden = true; }
  menuBtn.addEventListener("click", () => {
    const isOpen = drawer.getAttribute("aria-hidden") === "false";
    isOpen ? closeDrawer() : (drawer.setAttribute("aria-hidden","false"), menuBtn.setAttribute("aria-expanded","true"), backdrop.hidden=false);
  });
  backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.getAttribute("aria-hidden")==="false") closeDrawer(); });

  const person = getPersonFromURL();
  setTitle(person);
  setHeaderImage(person);
  buildMenu(person);

  const targetIso = person.targetIso || GLOBAL_SEASON_END_ISO;
  const target = new Date(targetIso);

  document.getElementById("deadlineText").textContent = fmtCT(targetIso);
  document.getElementById("quip").textContent = QUIPS[Math.floor(Math.random()*QUIPS.length)] || "";

  const dEl = document.getElementById("d");
  const hEl = document.getElementById("h");
  const mEl = document.getElementById("m");
  const sEl = document.getElementById("s");
  const timerEl = document.getElementById("timer");

  function renderCountdown() {
    const now = new Date();
    let diff = Math.max(0, target.getTime() - now.getTime());
    const totalSeconds = Math.floor(diff/1000);
    const days = Math.floor(totalSeconds/86400);
    const hours = Math.floor((totalSeconds % 86400)/3600);
    const minutes = Math.floor((totalSeconds % 3600)/60);
    const seconds = totalSeconds % 60;
    dEl.textContent = days;
    hEl.textContent = String(hours).padStart(2,"0");
    mEl.textContent = String(minutes).padStart(2,"0");
    sEl.textContent = String(seconds).padStart(2,"0");
    if (totalSeconds <= 0) {
      timerEl.outerHTML = `<p class="final">Season over. Rings won by ${person.name}: 0.</p>`;
      const dt = document.getElementById("deadlineText");
      if (dt && dt.parentElement) dt.parentElement.style.display = "none";
      clearInterval(handle);
    }
  }
  const handle = setInterval(renderCountdown, 1000);
  renderCountdown();
})();