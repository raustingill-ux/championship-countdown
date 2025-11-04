(() => {
  "use strict";

  // ---------- Helpers ----------
  const qs = (s, el=document)=>el.querySelector(s);
  const qsa = (s, el=document)=>Array.from(el.querySelectorAll(s));

  function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
  function choice(a){ return a[Math.floor(Math.random()*a.length)]; }

  // ---------- DOM ----------
  // Panels
  const homePanel = qs("#homePanel");
  const runPanel = qs("#runPanel");
  const graveyardPanel = qs("#graveyardPanel");

  // Home
  const yearSelectHome = qs("#yearSelectHome");
  const startBtn = qs("#startBtn");
  const homeBoardEl = qs("#homeBoard");
  const resetBoardBtn = qs("#resetBoardBtn");

  // HUD / run
  const canvas = qs("#crush");
  const ctx = canvas.getContext("2d");
  const hudYear = qs("#hudYear");
  const hudWeek = qs("#hudWeek");
  const scoreEl = qs("#score");
  const bestEl = qs("#best");
  const pauseBtn = qs("#pauseBtn");
  const jumpBtn = qs("#jumpBtn");
  const toastEl = qs("#toast");
  const liveBoardEl = qs("#liveBoard");

  // Pause / name modals
  const pauseModal = qs("#pauseModal");
  const resumeBtn = qs("#resumeBtn");
  const quitBtn = qs("#quitBtn");
  const nameModal = qs("#nameModal");
  const nameForm = qs("#nameForm");
  const nameInput = qs("#nameInput");
  const nameError = qs("#nameError");
  const saveNameBtn = qs("#saveNameBtn");
  const skipNameBtn = qs("#skipNameBtn");

  // Graveyard
  const graveCanvas = qs("#grave");
  const graveCtx = graveCanvas.getContext("2d");
  const continueBtn = qs("#continueBtn");

  // ---------- Config ----------
  const START_YEAR = 2025;
  const MAX_YEARS = 11; // 2025..2035
  const ALL_YEARS = Array.from({length: MAX_YEARS},(_,i)=>START_YEAR+i);

  // Season/Week template
  const WEEKS = [
    ...Array.from({length:14},(_,i)=>({ id:i+1,  name:`Week ${i+1}`, duration: 60, speedScale: 1.00 + i*0.02 })),
    { id:15, name:"Week 15 – Bye",         duration: 20, speedScale: 0.7, bye:true },
    { id:16, name:"Week 16 – Semi‑Finals", duration: 70, speedScale: 1.25, finals:true, finalsBonus:0.2 },
    { id:17, name:"Week 17 – Championship",duration: 75, speedScale: 1.30, finals:true, finalsBonus:0.2 },
  ];

  // Special once‑per‑map events (default weeks)
  const MAP_EVENTS = { setbackWeek: 5, surgeWeek: 9 };

  // Leaderboard / banned names
  const LS_BOARD = "camcrush_leaderboard";
  const LS_BANNED = "camcrush_banned";
  const DEFAULT_BANNED = [
    "badword1","badword2","nasty","slur", // ← fill in your own; substring & case‑insensitive
  ];

  // ---------- State ----------
  const Game = {
    scene: "home", // home | run | pause | name | graveyard
    year: START_YEAR,
    weekIndex: 0, // 0..16 for WEEKS array
    score: 0,
    best: Number(localStorage.getItem("camcrush_best") || 0),
    board: [],
    banned: [],
    // map flags
    usedSetback: false,
    usedSurge: false,
  };

  // Load leaderboard + banned list
  try { Game.board = JSON.parse(localStorage.getItem(LS_BOARD) || "[]"); } catch { Game.board = []; }
  try { Game.banned = JSON.parse(localStorage.getItem(LS_BANNED) || "[]"); if (!Array.isArray(Game.banned)) throw 0; } catch { Game.banned = DEFAULT_BANNED.slice(); }

  bestEl.textContent = Game.best;

  // ---------- Home UI ----------
  function fillYearSelect(){
    yearSelectHome.innerHTML = "";
    ALL_YEARS.forEach(y=>{
      const opt = document.createElement("option");
      opt.value = y; opt.textContent = String(y);
      if (y === START_YEAR) opt.selected = true;
      yearSelectHome.appendChild(opt);
    });
  }

  function renderBoard(listEl){
    listEl.innerHTML = "";
    const data = (Game.board||[]).slice(0,5);
    if (data.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No scores yet.";
      listEl.appendChild(li);
      return;
    }
    data.forEach((r,i)=>{
      const li = document.createElement("li");
      li.innerHTML = `<strong>${i+1}.</strong> ${escapeHtml(r.name)} — <span class="mono">${r.score}</span>`;
      listEl.appendChild(li);
    });
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function resetBoard(){
    if (!confirm("Reset local Top‑5 leaderboard? This cannot be undone.")) return;
    Game.board = [];
    localStorage.setItem(LS_BOARD, "[]");
    renderBoard(homeBoardEl);
    renderLiveBoard();
  }

  fillYearSelect();
  renderBoard(homeBoardEl);
  resetBoardBtn.addEventListener("click", resetBoard);

  // ---------- Canvas sizing ----------
  function fitCanvas(c, idealW=960){
    const parent = c.parentElement;
    const cssW = Math.min(parent.clientWidth || idealW, 1000);
    const ratio = c === canvas ? 16/9 : 16/6; // main vs graveyard
    const cssH = Math.round(cssW / ratio);
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    c.style.width = cssW + "px";
    c.style.height = cssH + "px";
    c.width = Math.round(cssW * dpr);
    c.height = Math.round(cssH * dpr);
    const ctx2d = c.getContext("2d");
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function fitAll(){ fitCanvas(canvas); fitCanvas(graveCanvas); }
  fitAll(); window.addEventListener("resize", fitAll);

  // ---------- Run-time entities ----------
  function worldW(){ return canvas.width/(window.devicePixelRatio||1); }
  function worldH(){ return canvas.height/(window.devicePixelRatio||1); }
  const groundY = ()=> worldH() - 78;

  // Cam + steamroller (vector fallback; optional layered images)
  const Cam = {
    x: 120, y: 0, w: 128, h: 72,
    vy: 0, onGround: true,
    headBob: 0, // 0..1 phase
    sprites: { body:null, head:null, front:null, rear:null } // optional PNG layers
  };

  // Try to load optional layers (right-facing)
  (function tryLoadLayers(){
    const base = "assets/sprites/";
    const files = {
      body:  "cam-roller_body.png",
      head:  "cam-roller_head.png",
      front: "cam-roller_frontwheel.png",
      rear:  "cam-roller_rearwheel.png"
    };
    Object.entries(files).forEach(([k,f])=>{
      const img = new Image();
      img.onload = ()=>Cam.sprites[k]=img;
      img.onerror = ()=>Cam.sprites[k]=null;
      img.src = base + f;
    });
  })();

  // Objects
  const opponents = []; // crush to score
  const hazards = [];   // slow/lock but never kill
  const specials = [];  // BenJarvus / Odell items (spawned specific weeks)

  function resetCam() {
    Cam.y = groundY() - Cam.h;
    Cam.vy = 0; Cam.onGround = true;
    Cam.headBob = 0;
  }

  // Effects
  const Effects = {
    slow: 0,       // 0..1 fraction (e.g. 0.25 = 25% slow) duration tracked separately
    slowT: 0,
    boost: 0,      // 0..1 bonus (e.g. 0.4 = +40% speed)
    boostT: 0,
    jumpLockT: 0,  // time left that jumping is disabled
  };

  // Inputs
  const Keys = { right:false };
  document.addEventListener("keydown", (e)=>{
    if (["ArrowUp","KeyW","Space"].includes(e.code)) { e.preventDefault(); jump(); }
    else if (["ArrowRight","KeyD"].includes(e.code)) { Keys.right = true; }
    else if (["ArrowLeft","KeyA"].includes(e.code))  { quip("Cam stops for nobody. All we know is victory."); }
    else if (e.code==="KeyP") { togglePause(); }
  }, {passive:false});
  document.addEventListener("keyup", (e)=>{
    if (["ArrowRight","KeyD"].includes(e.code)) Keys.right = false;
  }, {passive:true});

  jumpBtn.addEventListener("click", jump, {passive:true});
  pauseBtn.addEventListener("click", togglePause);
  resumeBtn.addEventListener("click", ()=> setPaused(false));
  quitBtn.addEventListener("click", quitToHome);

  // ---------- Toaster / quips ----------
  function quip(msg, ms=1100) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(quip._t);
    quip._t = setTimeout(()=> toastEl.classList.remove("show"), ms);
  }

  // ---------- Leaderboard ----------
  function renderLiveBoard(){
    const data = (Game.board||[]).slice(0,5);
    if (data.length===0) { liveBoardEl.innerHTML = ""; return; }
    liveBoardEl.innerHTML = "<strong>Top 5</strong><ol>" +
      data.map(r=>`<li>${escapeHtml(r.name)} <span class="mono">${r.score}</span></li>`).join("") +
      "</ol>";
  }
  renderLiveBoard();

  function maybeRecordScore(totalScore){
    // if score beats #5 or board has fewer than 5 entries, prompt for name
    const board = Game.board.slice(0,5);
    const min = board.length<5 ? -Infinity : board[board.length-1].score;
    if (totalScore > min) {
      Game.scene="name";
      nameError.hidden=true;
      nameInput.value="";
      nameModal.showModal();
      // Safety: auto-close after 30s -> default name
      clearTimeout(maybeRecordScore._timeout);
      maybeRecordScore._timeout = setTimeout(()=>{
        if (nameModal.open) {
          persistScore("Coach", totalScore);
          nameModal.close();
          goHome();
        }
      }, 30000);
      return true;
    }
    return false;
  }

  function persistScore(name, score){
    const rec = { name: name.trim().slice(0,20) || "Coach", score: Math.floor(score), date: new Date().toISOString() };
    const arr = Game.board.concat([rec]).sort((a,b)=> b.score - a.score).slice(0,5);
    Game.board = arr;
    localStorage.setItem(LS_BOARD, JSON.stringify(arr));
    renderBoard(homeBoardEl);
    renderLiveBoard();
  }

  function nameAllowed(name){
    const n = name.toLowerCase();
    const banned = Array.isArray(Game.banned) ? Game.banned : DEFAULT_BANNED;
    return !banned.some(b => b && n.includes(String(b).toLowerCase()));
  }

  nameForm.addEventListener("submit", (e)=>{
    e.preventDefault();
    const val = nameInput.value.trim().slice(0,20);
    if (!val) { nameError.textContent="Please enter a name."; nameError.hidden=false; return; }
    if (!nameAllowed(val)) { nameError.textContent="That name is not allowed. Try another."; nameError.hidden=false; return; }
    nameError.hidden=true;
    persistScore(val, Game.score);
    nameModal.close();
    goHome();
  });
  saveNameBtn.addEventListener("click", (e)=>{ e.preventDefault(); nameForm.requestSubmit(); });
  skipNameBtn.addEventListener("click", (e)=>{ e.preventDefault(); nameModal.close(); goHome(); });

  // ---------- Scenes ----------
  startBtn.addEventListener("click", ()=>{
    const y = Number(yearSelectHome.value)||START_YEAR;
    startSeason(y);
  });

  continueBtn.addEventListener("click", ()=>{
    const next = Game.year + 1;
    if (ALL_YEARS.includes(next)) { startSeason(next); }
    else { goHome(); }
  });

  function goHome(){
    Game.scene="home";
    homePanel.hidden=false;
    runPanel.hidden=true;
    graveyardPanel.hidden=true;
    fitAll();
    renderBoard(homeBoardEl);
  }

  function startSeason(year){
    Game.year = year;
    Game.weekIndex = 0;
    Game.score = 0;
    Game.usedSetback = false;
    Game.usedSurge = false;
    bestEl.textContent = Game.best;
    startWeek();
  }

  function startWeek(){
    Game.scene = "run";
    homePanel.hidden = true;
    runPanel.hidden = false;
    graveyardPanel.hidden = true;
    fitAll();

    const week = WEEKS[Game.weekIndex];
    hudYear.textContent = String(Game.year);
    hudWeek.textContent = week.name;

    resetCam();
    opponents.length = 0;
    hazards.length = 0;
    specials.length = 0;

    // Spawn the special items if this is the designated week and unused
    if (!Game.usedSetback && week.id === MAP_EVENTS.setbackWeek) {
      specials.push({ kind:"setback", spawned:false });
    }
    if (!Game.usedSurge && week.id === MAP_EVENTS.surgeWeek) {
      specials.push({ kind:"surge", spawned:false });
    }

    Run.t = 0;
    Run.duration = week.duration; // seconds
    Run.baseSpeed = 5.0 * week.speedScale;
    Run.finalsBonus = week.finals ? (week.finalsBonus||0.2) : 0;
    Run.streak = 0;
    Run.lastStamp = 0;

    setPaused(false);
    requestAnimationFrame(loop);
  }

  function endWeek(){
    const week = WEEKS[Game.weekIndex];
    // finals bonus already applied during run

    Game.weekIndex++;
    if (Game.weekIndex >= WEEKS.length) {
      // Season done → Graveyard → Leaderboard prompt → Home/Next Year
      showGraveyard();
    } else {
      // Bye week acts as a breather (nothing to dodge)
      startWeek();
    }
  }

  function showGraveyard(){
    Game.scene="graveyard";
    homePanel.hidden=true;
    runPanel.hidden=true;
    graveyardPanel.hidden=false;
    fitAll();
    drawGraveyard();
    // After a short auto-scroll, prompt name if Top‑5
    setTimeout(()=>{
      const prompted = maybeRecordScore(Game.score);
      if (!prompted) goHome();
    }, 6000);
  }

  // ---------- Pause ----------
  function setPaused(val){
    Run.paused = !!val;
    if (Run.paused) {
      Game.scene="pause";
      pauseModal.showModal();
    } else {
      if (pauseModal.open) pauseModal.close();
      Game.scene="run";
    }
  }
  function togglePause(){ setPaused(!Run.paused); }
  function quitToHome(){ if (pauseModal.open) pauseModal.close(); goHome(); }

  // ---------- Run loop ----------
  const Run = {
    paused:false,
    t:0,           // elapsed seconds within week
    duration:60,   // seconds
    baseSpeed:5.0, // units/pixel-ish
    finalsBonus:0,
    lastStamp:0,
    streak:0
  };

  function jump(){
    if (Run.paused || Game.scene!=="run") return;
    if (Effects.jumpLockT>0) return;
    if (Cam.onGround) { Cam.vy = -15; Cam.onGround = false; }
  }

  function loop(ts){
    if (Game.scene!=="run") return; // paused or left scene
    requestAnimationFrame(loop);
    if (Run.paused) { draw(true); return; }

    if (!Run.lastStamp) Run.lastStamp = ts;
    const dt = Math.min(32, ts - Run.lastStamp) / 16.667;
    Run.lastStamp = ts;

    // timers
    Run.t += dt;
    Effects.slowT  = Math.max(0, Effects.slowT - dt);
    Effects.boostT = Math.max(0, Effects.boostT - dt);
    Effects.jumpLockT = Math.max(0, Effects.jumpLockT - dt);

    // effective speed
    let speed = Run.baseSpeed + (Keys.right ? 2.2 : 0);
    if (Effects.slowT>0)  speed *= (1 - Effects.slow);
    if (Effects.boostT>0) speed *= (1 + Effects.boost);

    // gravity
    Cam.vy += 0.85*dt;
    Cam.y += Cam.vy*dt;
    const gy = groundY() - Cam.h;
    if (Cam.y >= gy) { Cam.y = gy; Cam.vy = 0; Cam.onGround = true; }

    // micro motion
    Cam.headBob += dt*2.5;
    const bounce = Math.sin(Run.t*3) * 1.5;

    // spawn logic
    spawnThings(speed, dt);

    // move + collide
    moveAndCollide(speed, dt);

    // scoring: passive time points + streak small bonus
    let pts = dt; // ~1 pt/s
    pts += (Run.streak>=5 ? 0.5*dt : 0); // tiny streak reward
    if (Run.finalsBonus>0) pts *= (1 + Run.finalsBonus);
    Game.score += pts;
    scoreEl.textContent = Math.floor(Game.score);
    Game.best = Math.max(Game.best, Math.floor(Game.score));
    bestEl.textContent = Game.best;

    draw(false, bounce);

    // week ends
    if (Run.t >= Run.duration) endWeek();
  }

  function spawnThings(speed, dt){
    const w = worldW();
    // opponents (score)
    if (Math.random() < (0.055 + Math.min(0.045, Run.t*0.0015))*dt){
      const type = choice(["cone","sign","papers"]);
      const size = 26 + Math.round(Math.random()*26);
      opponents.push({ x:w+size, y:groundY()-size, w:size, h:size, type, vx:speed });
    }
    // hazards (never kill)
    if (Math.random() < 0.015*dt){
      const type = Math.random()<0.5 ? "spike" : "hole";
      const W = type==="spike" ? 90 : 80;
      const H = type==="spike" ? 16 : 12;
      hazards.push({ x:w+W, y:groundY()-H+(type==="hole"?8:0), w:W, h:H, type, vx:speed });
    }
    // specials (once per week when scheduled)
    specials.forEach(s=>{
      if (!s.spawned && Run.t > Run.duration*0.35) {
        // drop it somewhere in the second half of the week
        const W = 44, H = 44;
        s.x = w + 120; s.y = groundY() - H; s.w=W; s.h=H; s.vx = speed*0.9; s.spawned=true;
      }
    });
  }

  function moveAndCollide(speed, dt){
    const listMove = arr=>{
      for (let i=arr.length-1;i>=0;i--){
        const o=arr[i]; o.x -= o.vx*dt;
        if (o.x + o.w < 0) arr.splice(i,1);
      }
    };
    listMove(opponents);
    listMove(hazards);
    listMove(specials);

    // Opponents score on overlap
    for (let i=opponents.length-1;i>=0;i--){
      const o = opponents[i];
      if (overlap(Cam, o)){
        opponents.splice(i,1);
        Run.streak++;
        let add = 10 + (Run.streak>=5 ? 5 : 0);
        if (Run.finalsBonus>0) add = Math.floor(add*(1+Run.finalsBonus));
        Game.score += add;
        if (Math.random()<0.18) quip(choice(["GG","Experts predict: It’s Joever","Dynasty loading…"]), 900);
      }
    }

    // Hazards apply effects (no death)
    hazards.forEach(h=>{
      if (overlap(Cam,h)){
        if (h.type==="spike"){
          Effects.slow = 0.25; Effects.slowT = 3.0; // 25% slow for 3s
        } else { // hole
          Effects.jumpLockT = 1.2; // jump disabled briefly
        }
      }
    });

    // Specials (once per map)
    specials.forEach(s=>{
      if (!s.hit && overlap(Cam,s)){
        s.hit = true;
        if (s.kind==="setback"){
          Game.usedSetback = true;
          quip("Uh oh, you drafted BenJarvus Green‑Ellis. That's quite the setback.", 1800);
          Effects.slow = 0.25; Effects.slowT = 5.0;
        } else {
          Game.usedSurge = true;
          quip("You picked up Odell Beckham Jr.!!! No one can beat you now!", 1800);
          Effects.boost = 0.40; Effects.boostT = 6.0;
        }
      }
    });
  }

  function overlap(a,b){
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ---------- Draw ----------
  function draw(pausedOnly, bounce=0){
    const w = worldW(), h = worldH();

    // bg
    ctx.clearRect(0,0,w,h);
    // stadium bands (simple parallax strips for readability)
    ctx.fillStyle = "#0f141c"; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "#111825"; ctx.fillRect(0, h-140, w, 50);
    ctx.fillStyle = "#0d1520"; ctx.fillRect(0, h-90, w, 40);
    // ground
    ctx.fillStyle = "#0a0f16"; ctx.fillRect(0, groundY()+Cam.h-44, w, h);
    ctx.strokeStyle = "#263041"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, groundY()+Cam.h-44); ctx.lineTo(w, groundY()+Cam.h-44); ctx.stroke();

    // opponents
    opponents.forEach(o=>{
      if (o.type==="cone"){
        ctx.fillStyle="#f2c94c";
        ctx.beginPath();
        ctx.moveTo(o.x, o.y+o.h); ctx.lineTo(o.x+o.w/2, o.y); ctx.lineTo(o.x+o.w, o.y+o.h);
        ctx.closePath(); ctx.fill();
      } else if (o.type==="sign"){
        ctx.fillStyle="#4da3ff"; ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle="#0d0f14"; ctx.font="bold 10px system-ui"; ctx.textAlign="center";
        ctx.fillText("PICKS", o.x+o.w/2, o.y+o.h/2+3);
      } else {
        ctx.fillStyle="#cbd5e1"; ctx.fillRect(o.x, o.y, o.w, o.h);
      }
    });

    // hazards
    hazards.forEach(s=>{
      if (s.type==="spike"){
        ctx.fillStyle="#e11d48";
        const spikes=6;
        for (let i=0;i<spikes;i++){
          const sx = s.x + i*(s.w/spikes);
          ctx.beginPath();
          ctx.moveTo(sx, s.y+s.h); ctx.lineTo(sx+(s.w/spikes)/2, s.y); ctx.lineTo(sx+(s.w/spikes), s.y+s.h);
          ctx.closePath(); ctx.fill();
        }
      } else {
        ctx.fillStyle="#0f141c";
        ctx.beginPath(); ctx.arc(s.x+s.w/2, s.y+4, s.w/2, 0, Math.PI*2); ctx.fill();
      }
    });

    // specials
    specials.forEach(s=>{
      if (!s.spawned) return;
      if (s.kind==="setback"){
        ctx.fillStyle="#f97316"; // orange ticket
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle="#0d0f14"; ctx.font="bold 8px system-ui"; ctx.textAlign="center";
        ctx.fillText("BJGE", s.x+s.w/2, s.y+s.h/2+3);
      } else {
        ctx.fillStyle="#8b5cf6"; // purple card
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle="#fbd34d"; ctx.font="bold 8px system-ui"; ctx.textAlign="center";
        ctx.fillText("OBJ", s.x+s.w/2, s.y+s.h/2+3);
      }
    });

    // Cam: draw shadow
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.ellipse(Cam.x + Cam.w/2, groundY()+Cam.h-12, Cam.w*0.45, 10, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Cam: either layered sprites (if present) or vector fallback
    const yOffset = bounce; // tiny suspension bounce
    const headOffset = Math.sin(Cam.headBob)*1.2;

    if (Cam.sprites.body && Cam.sprites.front && Cam.sprites.rear) {
      // body
      ctx.drawImage(Cam.sprites.body, Cam.x, Cam.y+yOffset, Cam.w, Cam.h);
      // wheels (we don't literally rotate PNG to avoid blurring; we can fake with small shifts)
      ctx.drawImage(Cam.sprites.rear,  Cam.x+Cam.w-30, Cam.y+Cam.h-30+yOffset, 26, 26);
      ctx.drawImage(Cam.sprites.front, Cam.x-6,        Cam.y+Cam.h-34+yOffset, 34, 34);
      // head
      if (Cam.sprites.head) ctx.drawImage(Cam.sprites.head, Cam.x+60, Cam.y-6+headOffset, 38, 38);
    } else {
      // vector steamroller (right-facing)
      const x = Cam.x, y = Cam.y+yOffset, w2=Cam.w, h2=Cam.h;

      // body
      ctx.fillStyle="#f2f5f7";
      ctx.fillRect(x+22, y+12, w2-44, h2-24);
      ctx.fillStyle="#1b2432"; // mount
      ctx.fillRect(x+8, y+24, w2-16, 18);
      // front roller block
      ctx.fillStyle="#4da3ff";
      ctx.fillRect(x-12, y+26, 30, 30);

      // wheels (animated)
      ctx.fillStyle="#2a364a";
      const rearCX = x+w2-26, rearCY = y+h2-10; // rear wheel
      const frontCX = x+8,    frontCY= y+40;    // front roller
      wheel(rearCX, rearCY, 18);
      wheel(frontCX, frontCY, 18);
      function wheel(cx, cy, r){
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
        // fake spin marker
        ctx.strokeStyle="#6b7b95"; ctx.lineWidth=2;
        const ang = (Run.t*4) % (Math.PI*2);
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx + Math.cos(ang)*r, cy + Math.sin(ang)*r); ctx.stroke();
      }
    }

    if (pausedOnly){
      ctx.fillStyle="rgba(0,0,0,.35)";
      ctx.fillRect(0,0,w,h);
      ctx.fillStyle="#f2f5f7"; ctx.font="bold 28px system-ui"; ctx.textAlign="center";
      ctx.fillText("Paused", w/2, h/2);
    }
  }

  // ---------- Graveyard draw ----------
  const TOMBSTONES = ["Austin","Dom","Matt","Brady","Nealy","James","Jaymes","Johnny","Chase","Brendan","Walker"];
  function drawGraveyard(){
    const w = graveCanvas.width/(window.devicePixelRatio||1);
    const h = graveCanvas.height/(window.devicePixelRatio||1);
    const ctx2 = graveCtx;
    ctx2.setTransform(window.devicePixelRatio||1,0,0,window.devicePixelRatio||1,0,0);
    ctx2.clearRect(0,0,w,h);
    ctx2.fillStyle="#0f141c"; ctx2.fillRect(0,0,w,h);

    // ground band
    ctx2.fillStyle="#0a0f16"; ctx2.fillRect(0, h-70, w, 70);

    // draw stones across
    const gap = w/(TOMBSTONES.length+1);
    TOMBSTONES.forEach((name,i)=>{
      const x = gap*(i+1);
      const y = h-80;
      stone(x, y, name);
    });

    function stone(cx, baseY, text){
      ctx2.fillStyle="#374151";
      ctx2.beginPath();
      ctx2.moveTo(cx-24, baseY);
      ctx2.lineTo(cx+24, baseY);
      ctx2.quadraticCurveTo(cx+26, baseY-30, cx, baseY-36);
      ctx2.quadraticCurveTo(cx-26, baseY-30, cx-24, baseY);
      ctx2.fill();
      ctx2.fillStyle="#9ca3af";
      ctx2.font="bold 12px system-ui"; ctx2.textAlign="center";
      ctx2.fillText(text, cx, baseY-10);
    }
  }

  // ---------- Start on home ----------
  goHome();
})();
