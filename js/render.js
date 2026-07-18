window.W = window.W || {};

W.Render = (function() {
  var ctx = null;
  var _p = { sx: 0, sy: 0 };
  var nightCv = null, nightCtx = null, nightW = 0, nightH = 0;
  var lightCv = null;

  function init(context) {
    ctx = context;
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

  function drawOneNode(nd, sx, sy) {
    var ty = nd.type;

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
    var cx, cy, a, i, nd;

    for (cy = r0; cy <= r1; cy++) {
      for (cx = c0; cx <= c1; cx++) {
        a = W.Res.nodesFor(cx, cy);
        for (i = 0; i < a.length; i++) {
          nd = a[i];
          if (before ? (nd.wy >= py) : (nd.wy < py)) continue;
          if (!W.Res.isAlive(nd, now)) continue;
          W.Camera.worldToScreenInto(nd.wx, nd.wy, _p);
          if (_p.sx < -40 || _p.sy < -60 || _p.sx > C.vw + 40 || _p.sy > C.vh + 40) continue;
          drawOneNode(nd, _p.sx, _p.sy);
        }
      }
    }
  }

  function drawTarget() {
    var P = W.Player;
    var nd = W.Res.findTarget(P.wx, P.wy, P.faceX, P.faceY);
    if (!nd) return;
    W.Camera.worldToScreenInto(nd.wx, nd.wy, _p);
    ctx.strokeStyle = 'rgba(255,235,150,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(_p.sx, _p.sy + 3, 15, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawOneMob(m, sx, sy) {
    var ty = m.type;
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
    for (i = 0; i < n; i++) {
      s = W.Build.at(i);
      if (s.type !== W.Build.TYPE.FIRE) continue;
      W.Camera.worldToScreenInto(s.wx, s.wy, _p);
      if (_p.sx < -300 || _p.sy < -300 || _p.sx > nightW + 300 || _p.sy > nightH + 300) continue;
      flick = 1 + 0.06 * Math.sin(Date.now() * 0.006 + s.wx);
      punchLight(nightCtx, _p.sx, _p.sy, W.CFG.LIGHT_FIRE * flick);
    }

    nightCtx.globalCompositeOperation = 'source-over';

    ctx.globalAlpha = dark;
    ctx.drawImage(nightCv, 0, 0, nightW, nightH);
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    var P = W.Player;
    W.Camera.worldToScreenInto(P.wx, P.wy, _p);
    var r = W.CFG.PLAYER_RADIUS * W.Camera.zoom;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(_p.sx, _p.sy + r * 0.7, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e8d9a8';
    ctx.beginPath();
    ctx.arc(_p.sx, _p.sy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#3a2f1c';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = '#3a2f1c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(_p.sx, _p.sy);
    ctx.lineTo(_p.sx + P.faceX * r * 1.5, _p.sy + P.faceY * r * 1.5);
    ctx.stroke();
  }

  function draw() {
    ctx.fillStyle = '#2c3a22';
    ctx.fillRect(0, 0, W.Camera.vw, W.Camera.vh);
    drawChunks();
    if (W.CFG.DEBUG) {
      drawGrid();
      drawChunkLines();
      drawChunkLabels();
    }
    drawWorldBorder();
    drawTarget();
    drawPlaceGhost();
    drawBuilds(true);
    drawNodes(true);
    drawMobs(true);
    drawPlayer();
    drawMobs(false);
    drawNodes(false);
    drawBuilds(false);
    drawNight();
    drawHurtFlash();
    W.Minimap.draw(ctx, W.Camera.vw);
  }

  return { init: init, draw: draw };
})();
