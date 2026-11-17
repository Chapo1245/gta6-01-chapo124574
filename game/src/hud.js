// Sunvale Heat — HUD, minimap, menus (fresh code, round 2).
// DOM overlay: cash/health/stars/clock, objective line, speedometer,
// live minimap canvas, prompts, toasts, mission cards, start/pause/end screens.
var HUD = {
  mm: null, mmCtx: null,
  objectiveOverride: null, overrideT: 0,

  init: function () {
    this.mm = el("minimap");
    this.mmCtx = this.mm.getContext("2d");
    el("btn-start").addEventListener("click", function () { if (SV.audio) SV.audio.click(); Game.startNew(); });
    el("btn-continue").addEventListener("click", function () { if (SV.audio) SV.audio.click(); Game.continueSave(); });
    el("btn-resume").addEventListener("click", function () { Game.togglePause(); });
    el("btn-restart").addEventListener("click", function () { Game.restartMission(); });
    el("btn-quit-menu").addEventListener("click", function () { Game.toMenu(); });
    el("btn-end-ok").addEventListener("click", function () { Game.afterEnd(); });
  },

  setObjective: function (text) { this.objectiveOverride = text; this.overrideT = 4; },

  toast: function (msg) {
    var t = el("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(this._toastT);
    var self = this;
    this._toastT = setTimeout(function () { t.classList.remove("show"); }, 3600);
  },

  showMissionCard: function (def) {
    el("mission-title").textContent = def.title;
    el("mission-brief").textContent = def.brief;
    el("mission-reward").textContent = "Reward: $" + def.reward.toLocaleString();
    var c = el("mission-card");
    c.classList.add("show");
    clearTimeout(this._mcT);
    var self = this;
    this._mcT = setTimeout(function () { c.classList.remove("show"); }, 4200);
  },

  showReward: function (title, amount) {
    el("reward-text").textContent = title + " complete  ·  +$" + amount.toLocaleString();
    var b = el("reward-banner");
    b.classList.add("show");
    clearTimeout(this._rwT);
    this._rwT = setTimeout(function () { b.classList.remove("show"); }, 3000);
  },

  flashDamage: function () {
    var f = el("damage-flash");
    f.classList.add("show");
    setTimeout(function () { f.classList.remove("show"); }, 220);
  },

  setPrompt: function (text) {
    var p = el("prompt");
    if (text) { p.textContent = text; p.classList.add("show"); }
    else p.classList.remove("show");
  },

  showMenu: function (hasSave) {
    el("menu").classList.remove("hidden");
    el("hud").classList.add("hidden");
    el("btn-continue").style.display = hasSave ? "inline-block" : "none";
    var list = el("menu-missions");
    list.innerHTML = "";
    for (var i = 0; i < Missions.defs.length; i++) {
      var d = Missions.defs[i];
      var done = i < SV.missionIndex;
      var li = document.createElement("div");
      li.className = "menu-mission" + (done ? " done" : "");
      li.textContent = (done ? "✓ " : (i + 1) + ". ") + d.title + " — $" + d.reward.toLocaleString();
      list.appendChild(li);
    }
  },

  hideMenu: function () {
    el("menu").classList.add("hidden");
    el("hud").classList.remove("hidden");
  },

  showPause: function (show) { el("pause").classList.toggle("hidden", !show); },
  showEnd: function (kind, title, text) {
    el("end-title").textContent = title;
    el("end-title").className = kind;
    el("end-text").textContent = text;
    el("end-screen").classList.remove("hidden");
  },
  hideEnd: function () { el("end-screen").classList.add("hidden"); },

  fmtClock: function () {
    var m = Math.floor(SV.clockMin) % (24 * 60);
    var h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
  },

  update: function (dt) {
    if (SV.mode !== "play" && SV.mode !== "paused") return;
    el("cash").textContent = "$" + Math.floor(SV.cash).toLocaleString();
    el("health-fill").style.width = clamp(SV.health, 0, 100) + "%";
    el("health-fill").style.background = SV.health > 50 ? "#2ecc71" : (SV.health > 25 ? "#f39c12" : "#e74c3c");
    var stars = "";
    for (var i = 0; i < 5; i++) stars += i < SV.wanted ? "★" : "☆";
    var st = el("stars");
    st.textContent = stars;
    st.className = SV.wanted > 0 ? "hot" : "";
    el("clock").textContent = this.fmtClock();
    el("ammo").textContent = SV.car ? "—" : ("Ammo " + SV.player.ammo + "/12");
    if (this.overrideT > 0) { this.overrideT -= dt; el("objective-text").textContent = this.objectiveOverride; }
    else el("objective-text").textContent = Missions.objectiveText();
    // Speedo.
    var sp = SV.car ? Math.abs(SV.car.speed) : SV.player.speed;
    el("speedo").textContent = Math.round(sp * 2.24) + " MPH";
    el("speedo-box").style.display = SV.car ? "block" : "none";
    el("boost-fill").style.width = (SV.car ? SV.car.boost : 0) + "%";
    el("boost-box").style.display = SV.car ? "block" : "none";
    el("crosshair").style.display = (!SV.car && SV.mode === "play") ? "block" : "none";
    this.drawMinimap();
  },

  drawMinimap: function () {
    var c = this.mmCtx, S = 180;
    c.clearRect(0, 0, S, S);
    c.fillStyle = "#0e1a24";
    c.fillRect(0, 0, S, S);
    var sx = function (x) { return (x + 260) / 520 * S; };
    var sz = function (z) { return (z + 260) / 560 * S; };
    // Water + sand (south edge).
    c.fillStyle = "#2e7fb8";
    c.fillRect(0, sz(City.waterZ), S, S - sz(City.waterZ));
    c.fillStyle = "#e8d49a";
    c.fillRect(0, sz(City.beachZ), S, sz(City.waterZ) - sz(City.beachZ));
    // Roads.
    c.strokeStyle = "#5a6068";
    c.lineWidth = 4;
    for (var k = -4; k <= 4; k++) {
      c.beginPath(); c.moveTo(sx(k * GRID), 0); c.lineTo(sx(k * GRID), S); c.stroke();
      c.beginPath(); c.moveTo(0, sz(k * GRID)); c.lineTo(S, sz(k * GRID)); c.stroke();
    }
    // Plaza.
    c.fillStyle = "#cbb98a";
    c.beginPath(); c.arc(sx(26), sz(26), 7, 0, TAU); c.fill();
    // Parks.
    c.fillStyle = "#4f8a3d";
    c.beginPath(); c.arc(sx(182), sz(-130), 6, 0, TAU); c.fill();
    c.beginPath(); c.arc(sx(-130), sz(182), 6, 0, TAU); c.fill();
    // Beacon.
    if (SV.beacon) {
      var pulse = 3 + Math.sin(SV.time * 4) * 1.2;
      c.fillStyle = "#ffd76e";
      c.beginPath(); c.arc(sx(SV.beacon.x), sz(SV.beacon.z), pulse + 2, 0, TAU); c.fill();
      c.fillStyle = "#7a5a00";
      c.beginPath(); c.arc(sx(SV.beacon.x), sz(SV.beacon.z), 2.5, 0, TAU); c.fill();
    }
    // Cars.
    for (var i = 0; i < SV.cars.length; i++) {
      var car = SV.cars[i];
      if (car.dead) continue;
      c.fillStyle = car.kind === "police" ? "#ff4444" : (car.kind === "player" ? "#ffffff" : "#c8cdd4");
      c.beginPath(); c.arc(sx(car.pos.x), sz(car.pos.z), car.kind === "player" ? 3.4 : 2.2, 0, TAU); c.fill();
    }
    // Player arrow (on foot).
    if (!SV.car) {
      var px = sx(SV.player.pos.x), pz = sz(SV.player.pos.z);
      c.save();
      c.translate(px, pz);
      c.rotate(Math.atan2(Math.sin(SV.player.yaw), -Math.cos(SV.player.yaw)) + Math.PI);
      c.fillStyle = "#ffffff";
      c.beginPath(); c.moveTo(0, -5); c.lineTo(3.6, 4); c.lineTo(-3.6, 4); c.closePath(); c.fill();
      c.restore();
    }
    // North marker.
    c.fillStyle = "#ffffff";
    c.font = "bold 10px sans-serif";
    c.fillText("N", 4, 12);
  }
};
