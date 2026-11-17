// Sunvale Heat — story missions for Mara Voss (fresh code, round 2).
// Five jobs, played in order. Each has a waypoint beacon, an objective line
// for the HUD, and a reward. Events from the world (stealCar, heat, ...)
// drive the state machine.
var Missions = {
  defs: [
    {
      id: "first-wheels", title: "First Wheels",
      brief: "Mara needs wheels. Steal any parked car, then bring it to the plaza.",
      reward: 500
    },
    {
      id: "sunset-run", title: "Sunset Run",
      brief: "Prove you can drive. Hit all 5 beach checkpoints before the timer runs out.",
      reward: 800
    },
    {
      id: "heat-check", title: "Heat Check",
      brief: "Mara wants to see if you can handle the law. Get to 3 stars, then lose them.",
      reward: 1200
    },
    {
      id: "warehouse-bust", title: "Warehouse Bust",
      brief: "The warehouse on the east side holds Mara's package. Drop the 4 guards, grab it, bring it back.",
      reward: 2000
    },
    {
      id: "big-score", title: "The Big Score",
      brief: "The Sunvale Bank vault is open for 5 seconds of your life. Grab the cash and reach Mara's hideout.",
      reward: 5000
    }
  ],

  start: function (index) {
    var def = this.defs[index];
    if (!def) { SV.mission = null; SV.hud.setObjective("All jobs done — Sunvale is yours, Jace.", 0); return; }
    SV.missionIndex = index;
    SV.mission = { def: def, phase: "go", timer: 0, checkpoint: 0, grabT: 0, packageTaken: false };
    SV.hud.toast("New job: " + def.title + " — Mara Voss");
    SV.hud.showMissionCard(def);
    if (SV.audio) SV.audio.sting();
    if (def.id === "sunset-run") { SV.mission.timer = 95; this.setBeacon(-180, City.beachZ + 2); }
    else if (def.id === "warehouse-bust") { this.setBeacon(SV.warehouseFront.x, SV.warehouseFront.z); Combat.spawnGuards(SV.warehouseFront.x, SV.warehouseFront.z, 4); }
    else if (def.id === "big-score") { this.setBeacon(SV.bankPos.x, SV.bankPos.z); }
    else if (def.id === "first-wheels") { this.setBeacon(SV.plazaPos.x, SV.plazaPos.z); }
    else this.clearBeacon();
  },

  setBeacon: function (x, z) {
    this.clearBeacon();
    var group = new THREE.Group();
    var pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd76e, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
    );
    pillar.position.y = 30;
    var ring = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 3.2, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd76e, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    var diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.1),
      new THREE.MeshLambertMaterial({ color: 0xffd76e, emissive: 0xaa7711 })
    );
    diamond.position.y = 7;
    group.add(pillar, ring, diamond);
    group.position.set(x, 0, z);
    SV.scene.add(group);
    SV.beacon = { group: group, diamond: diamond, ring: ring, x: x, z: z, spin: 0 };
  },

  clearBeacon: function () {
    if (SV.beacon) { SV.scene.remove(SV.beacon.group); SV.beacon = null; }
  },

  onEvent: function (name, data) {
    var m = SV.mission;
    if (!m) return;
    if (name === "stealCar" && m.def.id === "first-wheels" && m.phase === "go") {
      m.phase = "drive";
      SV.hud.toast("Got wheels — now take it to the plaza.");
    }
    if (name === "heat" && m.def.id === "heat-check") {
      if (m.phase === "go" && data.stars >= 3) {
        m.phase = "escape";
        SV.hud.toast("3 stars! Now lose the cops, Jace.");
      }
    }
    if (name === "guardDown" && m.def.id === "warehouse-bust") {
      var left = SV.guards.filter(function (g) { return g.hp > 0; }).length;
      if (left === 0 && !m.packageTaken) {
        m.phase = "grab";
        this.setBeacon(SV.warehouseFront.x, SV.warehouseFront.z);
        SV.hud.toast("Guards down — grab the package!");
      }
    }
    if (name === "packageTaken" && m.def.id === "warehouse-bust") {
      m.packageTaken = true;
      m.phase = "return";
      this.setBeacon(SV.plazaPos.x, SV.plazaPos.z);
      SV.hud.toast("Package secured — bring it to the plaza.");
    }
  },

  complete: function () {
    var m = SV.mission;
    if (!m) return;
    SV.cash += m.def.reward;
    SV.stats.missionsDone++;
    SV.hud.showReward(m.def.title, m.def.reward);
    if (SV.audio) { SV.audio.sting(); SV.audio.pickup(); }
    this.clearBeacon();
    Combat.clearGuards();
    SV.mission = null;
    Save.save();
    var next = SV.missionIndex + 1;
    var self = this;
    setTimeout(function () { self.start(next); }, 2500);
  },

  fail: function (reason) {
    var m = SV.mission;
    if (!m) return;
    SV.hud.toast("Job failed: " + reason + " — try again.");
    if (SV.audio) SV.audio.fail();
    this.clearBeacon();
    Combat.clearGuards();
    SV.mission = null;
    var self = this, idx = SV.missionIndex;
    setTimeout(function () { self.start(idx); }, 2000);
  },

  // Where the player currently is, for distance checks.
  playerPos: function () {
    return SV.car ? SV.car.pos : SV.player.pos;
  },

  update: function (dt) {
    var m = SV.mission;
    if (!m || SV.mode !== "play") return;
    var p = this.playerPos();
    if (m.def.id === "first-wheels") {
      if (m.phase === "drive" && SV.car && dist2(p.x, p.z, SV.plazaPos.x, SV.plazaPos.z) < 8) this.complete();
    } else if (m.def.id === "sunset-run") {
      m.timer -= dt;
      if (m.timer <= 0) { this.fail("out of time"); return; }
      var cps = [[-180, City.beachZ + 2], [-90, City.beachZ + 2], [0, City.beachZ + 2], [90, City.beachZ + 2], [180, City.beachZ + 2]];
      var cp = cps[m.checkpoint];
      if (cp && dist2(p.x, p.z, cp[0], cp[1]) < 8) {
        m.checkpoint++;
        if (SV.audio) SV.audio.pickup();
        if (m.checkpoint >= cps.length) this.complete();
        else { var n = cps[m.checkpoint]; this.setBeacon(n[0], n[1]); }
      }
    } else if (m.def.id === "heat-check") {
      if (m.phase === "escape" && SV.wanted === 0) this.complete();
    } else if (m.def.id === "warehouse-bust") {
      if (m.phase === "grab" && !SV.car && dist2(p.x, p.z, SV.warehouseFront.x, SV.warehouseFront.z) < 3.5) {
        this.onEvent("packageTaken");
      } else if (m.phase === "return" && dist2(p.x, p.z, SV.plazaPos.x, SV.plazaPos.z) < 8) this.complete();
    } else if (m.def.id === "big-score") {
      if (m.phase === "go" && dist2(p.x, p.z, SV.bankPos.x, SV.bankPos.z) < 7) {
        m.phase = "grab";
        m.grabT = 0;
        SV.hud.toast("Cracking the vault — hold still!");
      } else if (m.phase === "grab") {
        if (dist2(p.x, p.z, SV.bankPos.x, SV.bankPos.z) > 9) { m.phase = "go"; SV.hud.toast("You left the vault!"); }
        else {
          m.grabT += dt;
          if (m.grabT > 1) { /* progress shown on HUD */ }
          if (m.grabT >= 5) {
            m.phase = "escape";
            Police.addHeat(0.85, "bank");
            this.setBeacon(SV.hideoutPos.x, SV.hideoutPos.z);
            SV.hud.toast("Cash grabbed — run to Mara's hideout!");
          }
        }
      } else if (m.phase === "escape" && dist2(p.x, p.z, SV.hideoutPos.x, SV.hideoutPos.z) < 8) this.complete();
    }
    // Beacon spin.
    if (SV.beacon) {
      SV.beacon.spin += dt;
      SV.beacon.diamond.rotation.y = SV.beacon.spin * 2;
      SV.beacon.diamond.position.y = 7 + Math.sin(SV.beacon.spin * 2.4) * 0.8;
      var s = 1 + Math.sin(SV.beacon.spin * 3) * 0.12;
      SV.beacon.ring.scale.set(s, s, 1);
    }
  },

  objectiveText: function () {
    var m = SV.mission;
    if (!m) return SV.missionIndex >= this.defs.length ? "All jobs done — Sunvale is yours." : "Talk to Mara — new job waiting.";
    var d = m.def;
    var p = this.playerPos();
    var target = SV.beacon ? { x: SV.beacon.x, z: SV.beacon.z } : null;
    var dist = target ? Math.round(dist2(p.x, p.z, target.x, target.z)) : 0;
    var extra = "";
    if (d.id === "sunset-run") extra = "  ·  " + Math.max(0, Math.ceil(m.timer)) + "s left  ·  checkpoint " + (m.checkpoint + 1) + "/5";
    if (d.id === "heat-check") extra = m.phase === "go" ? "  ·  reach ★★★" : "  ·  lose the cops!";
    if (d.id === "warehouse-bust") extra = m.phase === "grab" ? "  ·  grab the package" : (m.phase === "return" ? "  ·  return to the plaza" : "  ·  guards left: " + SV.guards.filter(function (g) { return g.hp > 0; }).length);
    if (d.id === "big-score") extra = m.phase === "grab" ? "  ·  vault " + Math.min(99, Math.floor(m.grabT / 5 * 100)) + "%" : (m.phase === "escape" ? "  ·  reach the hideout" : "");
    return d.title + " — " + d.brief.split(".")[0] + extra + (target ? "  ·  " + dist + "m" : "");
  }
};
