window.W = window.W || {};

/* 生物：使用固定大小物件池，迴圈內不新建物件。
   生物是動態的，不隨座標可重現，因此「不寫入存檔」——離開後重新生成。 */
W.Mobs = (function() {
  var T = W.TERRAIN;

  var TYPE = { DEER: 0, RABBIT: 1, WOLF: 2 };
  var NAMES = ['\u9e7f', '\u5154\u5b50', '\u72fc'];
  var HP    = [26, 12, 34];
  var SPEED = [130, 175, 168];
  var RAD   = [12, 8, 12];

  var pool = [];
  var poolN = 0;
  var spawnT = 0;
  var seq = 1;
  var wanderSeq = 1;

  function ensurePool() {
    var i;
    if (pool.length > 0) return;
    for (i = 0; i < W.CFG.MOB_MAX; i++) {
      pool.push({
        alive: false, type: 0, wx: 0, wy: 0,
        vx: 0, vy: 0, hp: 0, t: 0, cd: 0, seed: 0, hurt: 0
      });
    }
  }

  function aliveCount() {
    var i, n = 0;
    for (i = 0; i < pool.length; i++) if (pool[i].alive) n++;
    return n;
  }

  function walkable(wx, wy) {
    return !W.World.isSolidAt(wx, wy);
  }

  function trySpawn() {
    ensurePool();
    if (aliveCount() >= W.CFG.MOB_MAX) return;

    var h1 = W.Rng.hash2i(seq, 17, W.CFG.SEED + 4001);
    var h2 = W.Rng.hash2i(seq, 91, W.CFG.SEED + 4002);
    var h3 = W.Rng.hash2i(seq, 55, W.CFG.SEED + 4003);
    seq++;

    var ang = h1 * Math.PI * 2;
    var dist = W.CFG.MOB_SPAWN_MIN + h2 * (W.CFG.MOB_SPAWN_MAX - W.CFG.MOB_SPAWN_MIN);
    var wx = W.Player.wx + Math.cos(ang) * dist;
    var wy = W.Player.wy + Math.sin(ang) * dist;

    if (wx < 40 || wy < 40 || wx > W.CFG.WORLD_SIZE - 40 || wy > W.CFG.WORLD_SIZE - 40) return;
    if (!walkable(wx, wy)) return;

    var terr = W.World.tileAt(wx, wy);
    var wolfCut = W.Time.isNight() ? W.CFG.NIGHT_WOLF_CHANCE : 0;
    var type;
    if (terr === T.FOREST)      type = (h3 < Math.max(0.18, wolfCut)) ? TYPE.WOLF : ((h3 < 0.70) ? TYPE.DEER : TYPE.RABBIT);
    else if (terr === T.GRASS)  type = (h3 < Math.max(0.06, wolfCut * 0.6)) ? TYPE.WOLF : ((h3 < 0.55) ? TYPE.DEER : TYPE.RABBIT);
    else if (terr === T.ROCK)   type = (h3 < 0.20) ? TYPE.WOLF : TYPE.RABBIT;
    else return;

    var i, m = null;
    for (i = 0; i < pool.length; i++) if (!pool[i].alive) { m = pool[i]; break; }
    if (!m) return;

    m.alive = true;
    m.type = type;
    m.wx = wx;
    m.wy = wy;
    m.vx = 0;
    m.vy = 0;
    m.hp = HP[type];
    m.t = 0;
    m.cd = 0;
    m.hurt = 0;
    m.seed = seq;
  }

  function newDir(m) {
    var h = W.Rng.hash2i(m.seed, wanderSeq++, W.CFG.SEED + 909);
    var g = W.Rng.hash2i(m.seed, wanderSeq++, W.CFG.SEED + 910);
    var ang = h * Math.PI * 2;
    if (g < 0.35) { m.vx = 0; m.vy = 0; }
    else { m.vx = Math.cos(ang); m.vy = Math.sin(ang); }
    m.t = 1.0 + g * 2.4;
  }

  function moveMob(m, dt, spd) {
    var nx = m.wx + m.vx * spd * dt;
    var ny = m.wy + m.vy * spd * dt;
    if (walkable(nx, m.wy)) m.wx = nx; else m.vx = -m.vx;
    if (walkable(m.wx, ny)) m.wy = ny; else m.vy = -m.vy;
  }

  function update(dt) {
    ensurePool();

    spawnT += dt;
    if (spawnT >= W.CFG.MOB_SPAWN_INTERVAL * (W.Time.isNight() ? W.CFG.NIGHT_SPAWN_MUL : 1)) {
      spawnT = 0;
      trySpawn();
    }

    var px = W.Player.wx, py = W.Player.wy;
    var i, m, dx, dy, d2, d, spd, inv, fire, fdx, fdy, fd;

    for (i = 0; i < pool.length; i++) {
      m = pool[i];
      if (!m.alive) continue;

      dx = px - m.wx;
      dy = py - m.wy;
      d2 = dx * dx + dy * dy;

      if (d2 > W.CFG.MOB_DESPAWN * W.CFG.MOB_DESPAWN) { m.alive = false; continue; }

      d = Math.sqrt(d2);
      if (m.cd > 0) m.cd -= dt;
      if (m.hurt > 0) m.hurt -= dt;

      spd = SPEED[m.type];

      if (m.type === TYPE.WOLF) {
        var fire = W.Build.nearType(m.wx, m.wy, W.Build.TYPE.FIRE, W.CFG.FIRE_FEAR);
        if (fire) {
          /* 怕火：往反方向退開 */
          fdx = m.wx - fire.wx;
          fdy = m.wy - fire.wy;
          fd = Math.sqrt(fdx * fdx + fdy * fdy);
          if (fd > 0.001) { m.vx = fdx / fd; m.vy = fdy / fd; }
          moveMob(m, dt, spd);
          continue;
        }
        if (d < W.CFG.WOLF_AGGRO * (W.Time.isNight() ? W.CFG.NIGHT_AGGRO_MUL : 1) && !W.Stats.isDead()) {
          inv = (d > 0.001) ? 1 / d : 0;
          m.vx = dx * inv;
          m.vy = dy * inv;
          if (d < W.CFG.WOLF_HIT_RANGE) {
            if (m.cd <= 0) {
              m.cd = W.CFG.WOLF_HIT_CD;
              W.Stats.damage(W.CFG.WOLF_DMG);
              if (W.Game && W.Game.onHurt) W.Game.onHurt();
            }
            m.vx = 0;
            m.vy = 0;
          }
        } else {
          m.t -= dt;
          if (m.t <= 0) newDir(m);
          spd *= 0.45;
        }
      } else {
        if (d < W.CFG.FLEE_RANGE || m.hurt > 0) {
          inv = (d > 0.001) ? 1 / d : 0;
          m.vx = -dx * inv;
          m.vy = -dy * inv;
        } else {
          m.t -= dt;
          if (m.t <= 0) newDir(m);
          spd *= 0.4;
        }
      }

      moveMob(m, dt, spd);
    }
  }

  /* 玩家攻擊：回傳結果物件或 null（結果物件為單一共用實例，避免每次配置） */
  var _hit = { name: '', killed: false, dmg: 0 };

  function attack(wx, wy, fx, fy, dmg) {
    var R = W.CFG.ATTACK_RANGE;
    var best = null, bestScore = -1e9;
    var i, m, dx, dy, d2, d, dot, score;

    for (i = 0; i < pool.length; i++) {
      m = pool[i];
      if (!m.alive) continue;
      dx = m.wx - wx;
      dy = m.wy - wy;
      d2 = dx * dx + dy * dy;
      if (d2 > R * R) continue;
      d = Math.sqrt(d2);
      dot = (d > 0.001) ? (dx / d * fx + dy / d * fy) : 1;
      if (dot < 0.1) continue;
      score = dot * 40 - d;
      if (score > bestScore) { bestScore = score; best = m; }
    }

    if (!best) return null;

    best.hp -= dmg;
    best.hurt = 3.0;
    _hit.name = NAMES[best.type];
    _hit.dmg = dmg;
    _hit.killed = false;

    if (best.hp <= 0) {
      best.alive = false;
      _hit.killed = true;
      if (best.type === TYPE.RABBIT) {
        W.Inv.add('meat', 1);
        W.Inv.add('hide', 1);
      } else {
        W.Inv.add('meat', 2);
        W.Inv.add('hide', 2);
      }
    }
    return _hit;
  }

  function count() { return pool.length; }
  function at(i) { return pool[i]; }
  function radius(type) { return RAD[type]; }
  function nameOf(type) { return NAMES[type]; }

  function clearAll() {
    var i;
    for (i = 0; i < pool.length; i++) pool[i].alive = false;
  }

  function stats() {
    var i, n = 0, w = 0;
    for (i = 0; i < pool.length; i++) {
      if (!pool[i].alive) continue;
      n++;
      if (pool[i].type === TYPE.WOLF) w++;
    }
    return { alive: n, wolves: w, cap: W.CFG.MOB_MAX };
  }

  return {
    TYPE: TYPE,
    update: update,
    attack: attack,
    count: count,
    at: at,
    radius: radius,
    nameOf: nameOf,
    clearAll: clearAll,
    stats: stats
  };
})();
