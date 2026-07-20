window.W = window.W || {};

/* 地方魔王：駐守囚有強夥伴的洞穴。
   位置由洞穴決定（不需存檔），只有「已擊敗」需要存檔，與夥伴同批接線。 */
W.Bosses = (function() {

  var DEFS = [
    { id: 'troll', name: '\u6d1e\u7a74\u5de8\u9b54', art: 'boss_troll', color: '#7a8f5a', hp: 140, dmg: 14 },
    { id: 'shade', name: '\u6697\u5f71\u9b54',       art: 'boss_shade', color: '#6a4f8f', hp: 110, dmg: 10 }
  ];

  var TERRITORY = 260;
  var ATK_RANGE = 56;
  var ATK_CD = 1.6;
  var SPEED = 150;

  var bosses = [];
  var defeated = {};
  var i0;
  for (i0 = 0; i0 < 2; i0++) {
    bosses.push({
      def: DEFS[i0],
      site: null,
      wx: 0, wy: 0,
      hp: DEFS[i0].hp,
      alive: false,
      hurt: 0,
      atkT: 0,
      faceX: 1, faceY: 0
    });
  }

  /* 與強夥伴共用同一個洞穴：bosses[i] 對應 mates[i].homeSite */
  function bind() {
    var i, m, b;
    for (i = 0; i < 2; i++) {
      m = W.Mates.at(i);
      b = bosses[i];
      b.site = m ? m.homeSite : null;
      if (b.site && !defeated[b.site.k]) {
        b.wx = b.site.wx - 50;
        b.wy = b.site.wy - 20;
        b.hp = b.def.hp;
        b.alive = true;
        b.hurt = 0;
        b.atkT = 0;
      } else {
        b.alive = false;
      }
    }
  }

  function update(dt) {
    var i, b, dx, dy, d, sx, sy, sd;
    for (i = 0; i < bosses.length; i++) {
      b = bosses[i];
      if (!b.alive || !b.site) continue;
      if (b.hurt > 0) b.hurt -= dt;
      b.atkT -= dt;

      dx = W.Player.wx - b.wx;
      dy = W.Player.wy - b.wy;
      d = Math.sqrt(dx * dx + dy * dy) || 0.001;

      sx = b.site.wx - b.wx;
      sy = b.site.wy - b.wy;
      sd = Math.sqrt(sx * sx + sy * sy) || 0.001;

      if (d < TERRITORY && sd < TERRITORY * 1.4 && !W.Stats.isDead()) {
        /* 領域內才追擊 */
        if (d > ATK_RANGE) {
          b.wx += dx / d * SPEED * dt;
          b.wy += dy / d * SPEED * dt;
          b.faceX = dx / d;
          b.faceY = dy / d;
        } else if (b.atkT <= 0) {
          b.atkT = ATK_CD;
          W.Stats.damage(b.def.dmg);
          if (W.Game && W.Game.onBossHitPlayer) W.Game.onBossHitPlayer(b);
        }
      } else if (sd > 8) {
        /* 離開領域就走回駐點 */
        b.wx += sx / sd * SPEED * 0.8 * dt;
        b.wy += sy / sd * SPEED * 0.8 * dt;
        b.faceX = sx / sd;
        b.faceY = sy / sd;
      }
    }
  }

  var _res = { name: '', dmg: 0, killed: false, wx: 0, wy: 0, type: -1 };

  function hitAt(wx, wy, r, dmg) {
    var i, b, dx, dy;
    for (i = 0; i < bosses.length; i++) {
      b = bosses[i];
      if (!b.alive) continue;
      dx = b.wx - wx;
      dy = b.wy - wy;
      if (dx * dx + dy * dy < (r + 30) * (r + 30)) {
        b.hp -= dmg;
        b.hurt = 0.18;
        _res.name = b.def.name;
        _res.dmg = dmg;
        _res.wx = b.wx;
        _res.wy = b.wy;
        _res.type = -1;
        _res.killed = false;
        if (b.hp <= 0) {
          b.alive = false;
          defeated[b.site.k] = 1;
          _res.killed = true;
          if (W.Game && W.Game.onBossDown) W.Game.onBossDown(b);
        }
        return _res;
      }
    }
    return null;
  }

  /* 讓弓箭能鎖定魔王：回傳最近的存活魔王（欄位與生物相容） */
  function nearest(wx, wy) {
    var i, b, dx, dy, d2, best = null, bd = 1e18;
    for (i = 0; i < bosses.length; i++) {
      b = bosses[i];
      if (!b.alive) continue;
      dx = b.wx - wx;
      dy = b.wy - wy;
      d2 = dx * dx + dy * dy;
      if (d2 < bd) { bd = d2; best = b; }
    }
    return best;
  }

  function isDefeated(k) { return !!defeated[k]; }
  function count() { return bosses.length; }
  function at(i) { return bosses[i]; }

  function exportData() {
    var o = {}, k;
    for (k in defeated) {
      if (defeated.hasOwnProperty(k)) o[k] = 1;
    }
    return o;
  }

  function importData(o) {
    defeated = {};
    if (o) {
      var k;
      for (k in o) {
        if (o.hasOwnProperty(k)) defeated[k] = 1;
      }
    }
    bind();
  }

  function clear() {
    defeated = {};
    bind();
  }

  function stats() {
    var i, n = 0;
    for (i = 0; i < bosses.length; i++) if (bosses[i].alive) n++;
    return { alive: n, defeated: exportDataCount() };
  }

  function exportDataCount() {
    var k, n = 0;
    for (k in defeated) {
      if (defeated.hasOwnProperty(k)) n++;
    }
    return n;
  }

  return {
    init: bind,
    update: update,
    hitAt: hitAt,
    nearest: nearest,
    isDefeated: isDefeated,
    count: count,
    at: at,
    exportData: exportData,
    importData: importData,
    clear: clear,
    stats: stats
  };
})();
