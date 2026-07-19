window.W = window.W || {};

W.Render = (function() {
  var ctx = null;
  var _p = { sx: 0, sy: 0 };
  var nightCv = null, nightCtx = null, nightW = 0, nightH = 0;
  var lightCv = null;
  var sprite = null;
  var spriteReady = false;
  var walkT = 0;
  var slashT = 0;
  var slashFx = 0, slashFy = 1;

  function slash(fx, fy) {
    slashT = 0.16;
    slashFx = fx;
    slashFy = fy;
  }
  var _pulse = 0;

  var NODE_ART      = ['tree', 'rock', 'grass', 'berry', '', 'ui/mushroom'];
  var NODE_ART_DEAD = ['tree_cut', 'rock_mined', 'grass_cut', 'berry_empty', '', ''];
  var MOB_ART       = ['deer', 'rabbit', 'wolf'];
  var MOB_ART_MOVE  = ['deer_walk', 'rabbit_hop', 'wolf_run'];
  var artT = 0;

  /* 統一的素材繪製：以腳底（sx, sy）為錨點，等比例縮放到指定世界高度 */
  function drawArt(img, sx, sy, hWorld, flip) {
    var h = hWorld * W.Camera.zoom;
    var w = h * (img.width / img.height);
    if (flip) {
      ctx.save();
      ctx.translate(sx, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, sy - h, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, sx - w / 2, sy - h, w, h);
    }
  }

  function shadow(sx, sy, rx, ry) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  var DMG_MAX = 10;
  var dmgPool = [];
  (function() {
    var k;
    for (k = 0; k < DMG_MAX; k++) {
      dmgPool.push({ on: false, wx: 0, wy: 0, t: 0, txt: '' });
    }
  })();

  var sleepT = 0;
  var _cg = { wx: 0, wy: 0 };

  function dmgText(wx, wy, txt) {
    var k;
    for (k = 0; k < DMG_MAX; k++) {
      if (!dmgPool[k].on) {
        dmgPool[k].on = true;
        dmgPool[k].wx = wx;
        dmgPool[k].wy = wy;
        dmgPool[k].t = 0.7;
        dmgPool[k].txt = txt;
        return;
      }
    }
  }

  function drawDmg(dt) {
    var k, d, a;
    for (k = 0; k < DMG_MAX; k++) {
      d = dmgPool[k];
      if (!d.on) continue;
      d.t -= dt;
      if (d.t <= 0) { d.on = false; continue; }
      d.wy -= 46 * dt;
      W.Camera.worldToScreenInto(d.wx, d.wy, _p);
      a = Math.min(1, d.t / 0.25);
      ctx.font = 'bold ' + Math.round(15 * W.Camera.zoom) + 'px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.strokeStyle = 'rgba(0,0,0,' + (0.8 * a) + ')';
      ctx.lineWidth = 3;
      ctx.strokeText(d.txt, _p.sx, _p.sy);
      ctx.fillStyle = 'rgba(255,120,90,' + a + ')';
      ctx.fillText(d.txt, _p.sx, _p.sy);
    }
  }

  function drawArrow(a) {
    W.Camera.worldToScreenInto(a.wx, a.wy, _p);
    var z = W.Camera.zoom;
    var ang = Math.atan2(a.vy, a.vx);
    ctx.save();
    ctx.translate(_p.sx, _p.sy);
    ctx.rotate(ang);
    ctx.strokeStyle = '#d8c690';
    ctx.lineWidth = 3 * z;
    ctx.beginPath();
    ctx.moveTo(-10 * z, 0);
    ctx.lineTo(8 * z, 0);
    ctx.stroke();
    ctx.fillStyle = '#eee';
    ctx.beginPath();
    ctx.moveTo(12 * z, 0);
    ctx.lineTo(5 * z, -3 * z);
    ctx.lineTo(5 * z, 3 * z);
    ctx.fill();
    ctx.restore();
  }

  /* 遺跡：廢墟用斷柱、洞穴用岩壁開口，中間放一個箱子 */
  function drawOneSite(s, sx, sy) {
    var z = W.Camera.zoom;
    var looted = W.Sites.isLooted(s);
    var rockImg = W.Art.get('rock');
    var i, ang, px, py;

    if (s.type === 0) {
      for (i = 0; i < 6; i++) {
        ang = i * Math.PI / 3 + 0.4;
        px = sx + Math.cos(ang) * 46 * z;
        py = sy + Math.sin(ang) * 24 * z;
        if (rockImg) {
          drawArt(rockImg, px, py + 6 * z, 26, false);
        } else {
          ctx.fillStyle = '#8a8a80';
          ctx.fillRect(px - 7 * z, py - 16 * z, 14 * z, 20 * z);
        }
      }
    } else {
      ctx.fillStyle = '#5d5b55';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 6 * z, 46 * z, 30 * z, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#14120f';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 2 * z, 24 * z, 18 * z, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 箱子 */
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 8 * z, 14 * z, 5 * z, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = looted ? '#5a4a33' : '#8a6532';
    ctx.fillRect(sx - 13 * z, sy - 12 * z, 26 * z, 20 * z);
    ctx.fillStyle = looted ? '#6b5940' : '#a67c3d';
    ctx.fillRect(sx - 13 * z, sy - 12 * z, 26 * z, 7 * z);
    ctx.strokeStyle = '#3a2b17';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - 13 * z, sy - 12 * z, 26 * z, 20 * z);

    if (!looted) {
      ctx.fillStyle = '#ffd85e';
      ctx.fillRect(sx - 3 * z, sy - 6 * z, 6 * z, 6 * z);
      ctx.strokeStyle = 'rgba(255,225,140,' + (0.45 + 0.25 * Math.sin(artT * 3)) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sx, sy + 6 * z, 30 * z, 14 * z, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawSites(before) {
    if (!W.Sites) return;
    var C = W.Camera;
    var py = W.Player.wy;
    var i, s, n = W.Sites.nearCount();
    for (i = 0; i < n; i++) {
      s = W.Sites.nearAt(i);
      if (before ? (s.wy >= py) : (s.wy < py)) continue;
      W.Camera.worldToScreenInto(s.wx, s.wy, _p);
      if (_p.sx < -120 || _p.sy < -120 || _p.sx > C.vw + 120 || _p.sy > C.vh + 120) continue;
      drawOneSite(s, _p.sx, _p.sy);
    }
  }

  function drawCarryGhost() {
    if (!W.Game || !W.Game.carryGhost) return;
    var ty = W.Game.carryGhost(_cg);
    if (!ty) return;
    W.Camera.worldToScreenInto(_cg.wx, _cg.wy, _p);
    var z = W.Camera.zoom;
    var ok = W.Build.canPlace(_cg.wx, _cg.wy);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = ok ? 'rgba(120,220,120,0.9)' : 'rgba(230,90,80,0.9)';
    ctx.beginPath();
    ctx.arc(_p.sx, _p.sy, 24 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ok ? '#9f9' : '#f99';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(_p.sx, _p.sy, 26 * z, 0, Math.PI * 2);
    ctx.stroke();
    /* 用完務必清掉，否則整張畫面的線條都會變虛線 */
    ctx.setLineDash([]);
  }

  function sleepFx() { sleepT = 2.0; }

  function drawSleep(dt) {
    if (sleepT <= 0) return;
    sleepT -= dt;
    var P = W.Player;
    W.Camera.worldToScreenInto(P.wx, P.wy, _p);
    var z = W.Camera.zoom;
    var k = 1 - sleepT / 2.0;

    ctx.fillStyle = 'rgba(10,10,30,' + (0.5 * Math.sin(Math.min(1, k * 2) * Math.PI)) + ')';
    ctx.fillRect(0, 0, W.Camera.vw, W.Camera.vh);

    ctx.globalAlpha = Math.min(1, sleepT);
    ctx.fillStyle = '#cfe0ff';
    ctx.font = 'bold ' + Math.round((14 + k * 10) * z) + 'px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Z', _p.sx + (14 + k * 22) * z, _p.sy - (60 + k * 40) * z);
    ctx.font = 'bold ' + Math.round((10 + k * 8) * z) + 'px -apple-system, sans-serif';
    ctx.fillText('z', _p.sx + (4 + k * 12) * z, _p.sy - (48 + k * 26) * z);
    ctx.globalAlpha = 1;
  }

  function loadSprite() {
    sprite = new Image();
    sprite.onload = function() { spriteReady = true; };
    sprite.onerror = function() { spriteReady = false; };
    sprite.src = W.CFG.SPRITE_URL;
  }

  function init(context) {
    ctx = context;
    loadSprite();
    W.Art.load();
  }

  function drawGrid() {
    var C = W.Camera, G = W.CFG.GRID;
    var l = C.viewLeft(), r = C.viewRight();
    var t = C.viewTop(),  b = C.viewBottom();
    var x, y, s;

    ctx.strokeStyle = 'rgba(255,255,255,0.055)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (x = Math.floor(l / G) * G; x <= r; x += G) {
      s = (x - C.wx) * C.zoom + C.vw / 2;
      ctx.moveTo(s, 0); ctx.lineTo(s, C.vh);
    }
    for (y = Math.floor(t / G) * G; y <= b; y += G) {
      s = (y - C.wy) * C.zoom + C.vh / 2;
      ctx.moveTo(0, s); ctx.lineTo(C.vw, s);
    }
    ctx.stroke();
  }

  function drawChunks() {
    var C = W.Camera, K = W.CFG.CHUNK_SIZE, M = W.CFG.CHUNK_MARGIN;
    var c0 = Math.floor(C.viewLeft() / K) - M;
    var c1 = Math.floor(C.viewRight() / K) + M;
    var r0 = Math.floor(C.viewTop() / K) - M;
    var r1 = Math.floor(C.viewBottom() / K) + M;
    var cx, cy, cv, fx, fy, size;

    size = Math.ceil(K * C.zoom) + 1;

    for (cy = r0; cy <= r1; cy++) {
      for (cx = c0; cx <= c1; cx++) {
        W.Camera.worldToScreenInto(cx * K, cy * K, _p);
        fx = Math.floor(_p.sx);
        fy = Math.floor(_p.sy);
        cv = W.World.get(cx, cy);
        if (cv) {
          ctx.drawImage(cv, 0, 0, K, K, fx, fy, size, size);
        } else {
          W.World.request(cx, cy);
          ctx.fillStyle = '#2c3a22';
          ctx.fillRect(fx, fy, size, size);
        }
      }
    }
  }

  function drawChunkLines() {
    var C = W.Camera, K = W.CFG.CHUNK_SIZE;
    var l = C.viewLeft(), r = C.viewRight();
    var t = C.viewTop(),  b = C.viewBottom();
    var x, y, s;

    ctx.strokeStyle = 'rgba(140,200,120,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (x = Math.floor(l / K) * K; x <= r; x += K) {
      s = (x - C.wx) * C.zoom + C.vw / 2;
      ctx.moveTo(s, 0); ctx.lineTo(s, C.vh);
    }
    for (y = Math.floor(t / K) * K; y <= b; y += K) {
      s = (y - C.wy) * C.zoom + C.vh / 2;
      ctx.moveTo(0, s); ctx.lineTo(C.vw, s);
    }
    ctx.stroke();
  }

  function drawChunkLabels() {
    var C = W.Camera, K = W.CFG.CHUNK_SIZE;
    var l = C.viewLeft(), r = C.viewRight();
    var t = C.viewTop(),  b = C.viewBottom();
    var x, y;

    ctx.fillStyle = 'rgba(160,210,140,0.45)';
    ctx.font = '12px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (x = Math.floor(l / K) * K; x <= r; x += K) {
      for (y = Math.floor(t / K) * K; y <= b; y += K) {
        W.Camera.worldToScreenInto(x + 8, y + 6, _p);
        ctx.fillText(Math.floor(x / K) + ',' + Math.floor(y / K), _p.sx, _p.sy);
      }
    }
  }

  function drawWorldBorder() {
    var C = W.Camera, S = W.CFG.WORLD_SIZE;
    W.Camera.worldToScreenInto(0, 0, _p);
    ctx.strokeStyle = 'rgba(220,120,90,0.8)';
    ctx.lineWidth = 4;
    ctx.strokeRect(_p.sx, _p.sy, S * C.zoom, S * C.zoom);
  }

  function drawOneNode(nd, sx, sy, alive) {
    var ty = nd.type;
    var z = W.Camera.zoom;
    var img = W.Art.get(alive ? NODE_ART[ty] : NODE_ART_DEAD[ty]);

    if (img) {
      if (ty === 5) {
        ctx.fillStyle = 'rgba(190,140,255,' + (0.16 + 0.08 * Math.sin(artT * 3 + nd.wx)) + ')';
        ctx.beginPath();
        ctx.arc(sx, sy - 8 * z, 24 * z, 0, Math.PI * 2);
        ctx.fill();
      }
      shadow(sx + 1, sy + 3, 11 * z, 4.5 * z);
      drawArt(img, sx, sy + 4 * z, alive ? W.CFG.ART_NODE_H[ty] : W.CFG.ART_NODE_DEAD_H[ty], false);
      return;
    }

    if (!alive) return;

    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 4, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (ty === 0) {
      ctx.fillStyle = '#5a3c22';
      ctx.fillRect(sx - 3, sy - 8, 6, 12);
      ctx.fillStyle = '#2f6b30';
      ctx.beginPath();
      ctx.arc(sx, sy - 16, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3d8a3c';
      ctx.beginPath();
      ctx.arc(sx - 4, sy - 20, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (ty === 1) {
      ctx.fillStyle = '#8a8a80';
      ctx.beginPath();
      ctx.arc(sx, sy - 4, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a5a59a';
      ctx.beginPath();
      ctx.arc(sx - 4, sy - 8, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (ty === 2) {
      ctx.fillStyle = '#487c33';
      ctx.beginPath();
      ctx.arc(sx, sy - 2, 9, 0, Math.PI * 2);
      ctx.fill();
    } else if (ty === 3) {
      ctx.fillStyle = '#3f7a34';
      ctx.beginPath();
      ctx.arc(sx, sy - 2, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8383f';
      ctx.fillRect(sx - 5, sy - 6, 3, 3);
      ctx.fillRect(sx + 2, sy - 1, 3, 3);
      ctx.fillRect(sx - 1, sy - 9, 3, 3);
    } else {
      ctx.fillStyle = '#6f6a60';
      ctx.beginPath();
      ctx.moveTo(sx, sy - 9);
      ctx.lineTo(sx + 6, sy + 3);
      ctx.lineTo(sx - 6, sy + 3);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawNodes(before) {
    var C = W.Camera, K = W.CFG.CHUNK_SIZE;
    var c0 = Math.floor(C.viewLeft() / K);
    var c1 = Math.floor(C.viewRight() / K);
    var r0 = Math.floor(C.viewTop() / K);
    var r1 = Math.floor(C.viewBottom() / K);
    var now = Date.now();
    var py = W.Player.wy;
    var cx, cy, a, i, nd, alive;

    for (cy = r0; cy <= r1; cy++) {
      for (cx = c0; cx <= c1; cx++) {
        a = W.Res.nodesFor(cx, cy);
        for (i = 0; i < a.length; i++) {
          nd = a[i];
          if (before ? (nd.wy >= py) : (nd.wy < py)) continue;
          alive = W.Res.isAlive(nd, now);
          W.Camera.worldToScreenInto(nd.wx, nd.wy, _p);
          if (_p.sx < -40 || _p.sy < -60 || _p.sx > C.vw + 40 || _p.sy > C.vh + 40) continue;
          drawOneNode(nd, _p.sx, _p.sy, alive);
        }
      }
    }
  }

  function drawTarget(dt) {
    _pulse += dt * 3;
    var P = W.Player;
    var nd = W.Res.findTarget(P.wx, P.wy, P.faceX, P.faceY);
    if (!nd) return;
    W.Camera.worldToScreenInto(nd.wx, nd.wy, _p);
    var z = W.Camera.zoom;
    var k = 1 + Math.sin(_pulse) * 0.12;

    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(_p.sx, _p.sy + 4 * z, 26 * z * k, 12 * z * k, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,215,90,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(_p.sx, _p.sy + 4 * z, 26 * z * k, 12 * z * k, 0, 0, Math.PI * 2);
    ctx.stroke();

    var name = (W.Res.nameOf ? W.Res.nameOf(nd.type) : '');
    if (name) {
      ctx.font = 'bold ' + Math.round(13 * z) + 'px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(name, _p.sx, _p.sy - 52 * z);
      ctx.fillStyle = '#ffe89a';
      ctx.fillText(name, _p.sx, _p.sy - 52 * z);
    }
  }


  function drawOneMob(m, sx, sy) {
    var ty = m.type;
    var z = W.Camera.zoom;
    var moving = (m.vx * m.vx + m.vy * m.vy) > 0.02;
    var img = W.Art.get(moving && (Math.floor(artT * W.CFG.MOB_ANIM_FPS + m.seed) % 2 === 1)
      ? MOB_ART_MOVE[ty] : MOB_ART[ty]);

    if (img) {
      shadow(sx, sy + 4 * z, 11 * z, 4 * z);
      drawArt(img, sx, sy + 5 * z, W.CFG.ART_MOB_H[ty], m.vx < -0.05);
      if (m.hurt > 2.6) {
        ctx.fillStyle = 'rgba(230,80,60,0.35)';
        ctx.beginPath();
        ctx.arc(sx, sy - 8 * z, 15 * z, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    var body, head, r;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 5, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (ty === 0)      { body = '#9a6b3c'; head = '#7d5530'; r = 12; }
    else if (ty === 1) { body = '#cfc4b0'; head = '#b0a48f'; r = 8; }
    else               { body = '#5b5f66'; head = '#43474d'; r = 12; }

    if (m.hurt > 2.6) { body = '#e8735f'; }

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(sx, sy - 3, r, r * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.arc(sx + m.vx * r * 0.8, sy - 5 + m.vy * r * 0.5, r * 0.52, 0, Math.PI * 2);
    ctx.fill();

    if (ty === 2) {
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(sx + m.vx * r * 0.9 - 2, sy - 7 + m.vy * r * 0.5, 2, 2);
      ctx.fillRect(sx + m.vx * r * 0.9 + 1, sy - 7 + m.vy * r * 0.5, 2, 2);
    }
  }

  function drawMobs(before) {
    var C = W.Camera;
    var py = W.Player.wy;
    var i, m, n = W.Mobs.count();

    for (i = 0; i < n; i++) {
      m = W.Mobs.at(i);
      if (!m.alive) continue;
      if (before ? (m.wy >= py) : (m.wy < py)) continue;
      W.Camera.worldToScreenInto(m.wx, m.wy, _p);
      if (_p.sx < -40 || _p.sy < -40 || _p.sx > C.vw + 40 || _p.sy > C.vh + 40) continue;
      drawOneMob(m, _p.sx, _p.sy);
    }
  }

  function drawHurtFlash() {
    if (!W.Stats.isHurt()) return;
    ctx.fillStyle = 'rgba(200,50,40,0.22)';
    ctx.fillRect(0, 0, W.Camera.vw, W.Camera.vh);
  }

  function drawOneBuild(s, sx, sy, now) {
    var ty = s.type, f;
    var z = W.Camera.zoom;
    var aimg = null;
    if (ty === 0) aimg = W.Art.get('campfire');
    else if (ty === 2) aimg = W.Art.get('bed');
    else if (ty === 3) aimg = W.Art.get('ui/furnace');

    if (aimg) {
      shadow(sx, sy + 4 * z, 13 * z, 5 * z);
      drawArt(aimg, sx, sy + 6 * z,
        (ty === 0) ? W.CFG.ART_FIRE_H : ((ty === 3) ? W.CFG.ART_FURNACE_H : W.CFG.ART_BED_H), false);
      return;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 5, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (ty === 0) {
      ctx.strokeStyle = '#6b4a2a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx - 9, sy + 3); ctx.lineTo(sx + 9, sy - 3);
      ctx.moveTo(sx + 9, sy + 3); ctx.lineTo(sx - 9, sy - 3);
      ctx.stroke();
      f = 1 + 0.22 * Math.sin(now * 0.008 + s.wx);
      ctx.fillStyle = '#e8802f';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 11, 7 * f, 12 * f, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 9, 3.5 * f, 7 * f, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (ty === 1) {
      ctx.fillStyle = '#7a5330';
      ctx.fillRect(sx - 16, sy - 20, 32, 26);
      ctx.fillStyle = '#8e6339';
      ctx.fillRect(sx - 16, sy - 20, 32, 6);
      ctx.fillRect(sx - 16, sy - 8, 32, 6);
      ctx.strokeStyle = '#4b3320';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 16, sy - 20, 32, 26);
    } else {
      ctx.fillStyle = '#8d7f66';
      ctx.fillRect(sx - 14, sy - 8, 28, 14);
      ctx.fillStyle = '#c9bda4';
      ctx.fillRect(sx - 14, sy - 8, 12, 14);
      ctx.strokeStyle = '#5a5040';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 14, sy - 8, 28, 14);
    }
  }

  function drawBuilds(before) {
    var C = W.Camera;
    var py = W.Player.wy;
    var now = Date.now();
    var i, s, n = W.Build.count();

    for (i = 0; i < n; i++) {
      s = W.Build.at(i);
      if (before ? (s.wy >= py) : (s.wy < py)) continue;
      W.Camera.worldToScreenInto(s.wx, s.wy, _p);
      if (_p.sx < -50 || _p.sy < -60 || _p.sx > C.vw + 50 || _p.sy > C.vh + 50) continue;
      drawOneBuild(s, _p.sx, _p.sy, now);
    }
  }

  function drawPlaceGhost() {
    if (!W.Game || !W.Game.placeMode || !W.Game.placeMode()) return;
    var P = W.Player;
    var wx = P.wx + P.faceX * W.CFG.PLACE_DIST;
    var wy = P.wy + P.faceY * W.CFG.PLACE_DIST;
    var ok = W.Build.canPlace(wx, wy);
    W.Camera.worldToScreenInto(wx, wy, _p);
    ctx.strokeStyle = ok ? 'rgba(150,240,140,0.9)' : 'rgba(240,110,90,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(_p.sx - 16, _p.sy - 16, 32, 32);
  }

  /* 光暈貼圖只建立一次，之後每幀只做 drawImage，不在迴圈內配置物件 */
  function makeLight() {
    if (lightCv) return;
    var S = 256;
    lightCv = document.createElement('canvas');
    lightCv.width = S;
    lightCv.height = S;
    var c = lightCv.getContext('2d');
    var g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0,    'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.72)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.28)');
    g.addColorStop(1,    'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
  }

  function ensureNightLayer(w, h) {
    if (nightCv && nightW === w && nightH === h) return;
    if (!nightCv) nightCv = document.createElement('canvas');
    nightCv.width = w;
    nightCv.height = h;
    nightW = w;
    nightH = h;
    nightCtx = nightCv.getContext('2d');
  }

  function punchLight(c, sx, sy, radius) {
    c.drawImage(lightCv, sx - radius, sy - radius, radius * 2, radius * 2);
  }

  function drawNight() {
    var dark = W.Time.darkness();
    if (dark < 0.02) return;

    var C = W.Camera;
    makeLight();
    ensureNightLayer(Math.ceil(C.vw), Math.ceil(C.vh));

    nightCtx.globalCompositeOperation = 'source-over';
    nightCtx.clearRect(0, 0, nightW, nightH);
    nightCtx.fillStyle = 'rgba(8,12,32,1)';
    nightCtx.fillRect(0, 0, nightW, nightH);

    nightCtx.globalCompositeOperation = 'destination-out';

    W.Camera.worldToScreenInto(W.Player.wx, W.Player.wy, _p);
    punchLight(nightCtx, _p.sx, _p.sy, W.CFG.LIGHT_PLAYER);

    var i, s, n = W.Build.count(), flick;

    /* 夜光蘑菇是小光源，玩家在夜裡遠遠就能看到 */
    var nowMs = Date.now();
    var mi;
    for (mi = 0; mi < W.Res.nearCount(); mi++) {
      s = W.Res.nearAt(mi);
      if (s.type !== 5) continue;
      if (!W.Res.isAlive(s, nowMs)) continue;
      W.Camera.worldToScreenInto(s.wx, s.wy, _p);
      punchLight(nightCtx, _p.sx, _p.sy, 70);
    }

    for (i = 0; i < n; i++) {
      s = W.Build.at(i);
      if (s.type !== W.Build.TYPE.FIRE && s.type !== W.Build.TYPE.FURNACE) continue;
      W.Camera.worldToScreenInto(s.wx, s.wy, _p);
      if (_p.sx < -300 || _p.sy < -300 || _p.sx > nightW + 300 || _p.sy > nightH + 300) continue;
      flick = 1 + 0.06 * Math.sin(Date.now() * 0.006 + s.wx);
      punchLight(nightCtx, _p.sx, _p.sy,
        ((s.type === W.Build.TYPE.FURNACE) ? W.CFG.LIGHT_FIRE * 0.55 : W.CFG.LIGHT_FIRE) * flick);
    }

    nightCtx.globalCompositeOperation = 'source-over';

    ctx.globalAlpha = dark;
    ctx.drawImage(nightCv, 0, 0, nightW, nightH);
    ctx.globalAlpha = 1;
  }

  function drawPlayer(dt) {
    var P = W.Player;
    W.Camera.worldToScreenInto(P.wx, P.wy, _p);
    var z = W.Camera.zoom;
    var r = W.CFG.PLAYER_RADIUS * z;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(_p.sx, _p.sy + r * 0.7, r * 0.95, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!spriteReady) { drawPlayerFallback(_p.sx, _p.sy, r, P); return; }

    if (P.moving) { walkT += dt; } else { walkT = 0; }

    /* 揮擊瞬間朝面向方向前傾再彈回 */
    var lungeK = (slashT > 0) ? (slashT / 0.16) : 0;
    var lx = P.faceX * 7 * z * lungeK;
    var ly = P.faceY * 7 * z * lungeK;

    var row, flip = false;
    if (Math.abs(P.faceY) >= Math.abs(P.faceX)) {
      row = (P.faceY >= 0) ? 0 : 1;
    } else {
      row = 2;
      flip = (P.faceX < 0);
    }

    var col = P.moving ? (1 + (Math.floor(walkT * W.CFG.WALK_FPS) % 4)) : 0;

    var C = W.CFG.SPRITE_CELL;
    var h = W.CFG.SPRITE_H * z;
    var w = h;
    var dx = _p.sx + lx - w / 2;
    var dy = _p.sy + ly + r * 0.7 - h + (W.CFG.SPRITE_FOOT / C) * h;

    if (flip) {
      ctx.save();
      ctx.translate(_p.sx + lx, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, col * C, row * C, C, C, -w / 2, dy, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(sprite, col * C, row * C, C, C, dx, dy, w, h);
    }
  }

  function drawSlash(dt) {
    if (slashT <= 0) return;
    slashT -= dt;
    var P = W.Player;
    W.Camera.worldToScreenInto(P.wx, P.wy, _p);
    var z = W.Camera.zoom;
    var ang = Math.atan2(slashFy, slashFx);
    var k = slashT / 0.16;
    if (k < 0) k = 0;

    ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * k) + ')';
    ctx.lineWidth = 5 * z;
    ctx.beginPath();
    ctx.arc(_p.sx, _p.sy, 34 * z, ang - 0.9, ang + 0.9);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,215,90,' + (0.6 * k) + ')';
    ctx.lineWidth = 2 * z;
    ctx.beginPath();
    ctx.arc(_p.sx, _p.sy, 38 * z, ang - 0.7, ang + 0.7);
    ctx.stroke();
  }

  function drawPlayerFallback(sx, sy, r, P) {
    ctx.fillStyle = '#e8d9a8';
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2f1c';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + P.faceX * r * 1.5, sy + P.faceY * r * 1.5);
    ctx.stroke();
  }


  function draw(dt) {
    artT += dt;
    ctx.fillStyle = '#2c3a22';
    ctx.fillRect(0, 0, W.Camera.vw, W.Camera.vh);
    drawChunks();
    if (W.CFG.DEBUG) {
      drawGrid();
      drawChunkLines();
      drawChunkLabels();
    }
    drawWorldBorder();
    drawTarget(dt);
    drawPlaceGhost();
    drawSites(true);
    drawBuilds(true);
    drawNodes(true);
    drawMobs(true);
    W.Arrows.each(drawArrow);
    drawPlayer(dt);
    drawSlash(dt);
    drawCarryGhost();
    drawDmg(dt);
    drawMobs(false);
    drawNodes(false);
    drawBuilds(false);
    drawSites(false);
    drawNight();
    drawSleep(dt);
    drawHurtFlash();
    W.Minimap.draw(ctx, W.Camera.vw);
  }

  return { init: init, draw: draw, slash: slash, dmgText: dmgText, sleepFx: sleepFx };
})();
