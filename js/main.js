window.W = window.W || {};

W.Game = (function() {
  var canvas = null, ctx = null;
  var last = 0;
  var fps = 0, fpsAcc = 0, fpsCount = 0;
  var elPos, elChunk, elFps;
  var hudTimer = 0;
  var frame = 0;
  var elToast, toastT = 0;
  var elHp, elFood, elStam, elTime;
  var deadT = 0;
  var craftOpen = false;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, W.CFG.MAX_DPR);
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W.Camera.setViewport(w, h);
  }

  function updateHUD(dt) {
    hudTimer += dt;
    if (hudTimer < 0.25) return;
    hudTimer = 0;
    elPos.textContent   = '座標 ' + Math.round(W.Player.wx) + ', ' + Math.round(W.Player.wy);
    elChunk.textContent = '區塊 ' + W.Player.chunkX() + ', ' + W.Player.chunkY() + '　' + W.World.NAMES[W.Player.terrain()];
    elFps.textContent   = Math.round(fps) + ' FPS';
    elHp.style.width   = (W.Stats.hpPct() * 100).toFixed(0) + '%';
    elFood.style.width = (W.Stats.foodPct() * 100).toFixed(0) + '%';
    elStam.style.width = (W.Stats.stamPct() * 100).toFixed(0) + '%';
    elTime.textContent = '\u7b2c ' + W.Time.dayNo() + ' \u5929 ' + W.Time.clock() + ' \u00b7 ' + W.Time.phase();
  }

  function showToast(msg) {
    elToast.textContent = msg;
    elToast.style.opacity = '1';
    toastT = W.CFG.TOAST_TIME;
  }

  function tickToast(dt) {
    if (toastT <= 0) return;
    toastT -= dt;
    if (toastT <= 0) { elToast.style.opacity = '0'; }
  }

  function renderCraft() {
    var el = document.getElementById('craft-list');
    var rs = W.Craft.list();
    var html = '', i, r, own, ok;

    for (i = 0; i < rs.length; i++) {
      r = rs[i];
      own = (r.kind === 'tool' && W.Craft.has(r.id));
      ok = W.Craft.canAfford(r) && !own;
      html += '<div class="craft-row' + (ok ? '' : ' no') + '">'
           +    '<div class="craft-icon">' + r.icon + '</div>'
           +    '<div class="craft-info">' + r.name
           +      '<div class="craft-cost">' + W.Craft.costText(r) + '</div>'
           +      '<div class="' + (own ? 'craft-owned' : 'craft-cost') + '">'
           +        (own ? '\u5df2\u64c1\u6709' : r.desc) + '</div>'
           +    '</div>'
           +    (own ? '' : '<button class="craft-go" data-id="' + r.id + '">\u5236\u4f5c</button>')
           +  '</div>';
    }
    el.innerHTML = html;
  }

  function openCraft() {
    craftOpen = true;
    renderCraft();
    document.getElementById('craft-panel').classList.add('open');
  }

  function closeCraft() {
    craftOpen = false;
    document.getElementById('craft-panel').classList.remove('open');
  }

  function onCraftClick(e) {
    var id = e.target && e.target.getAttribute ? e.target.getAttribute('data-id') : null;
    if (!id) return;
    var r = W.Craft.make(id);
    if (r === true) {
      showToast('\u5236\u4f5c\u5b8c\u6210');
      renderCraft();
    } else {
      showToast(r);
    }
  }

  function openBag() {
    document.getElementById('bag-body').textContent =
      '\u80cc\u5305\uff08\u5171 ' + W.Inv.total() + ' \u4ef6\uff09\n\n' + W.Inv.summary();
    document.getElementById('bag-panel').classList.add('open');
  }

  var _btnA = null;
  var _btnMode = '';
  var _btnTimer = 0;

  function nearestMobDist() {
    var P = W.Player, best = 1e9;
    var i, m, dx, dy, d2, n = W.Mobs.count();
    for (i = 0; i < n; i++) {
      m = W.Mobs.at(i);
      if (!m || !m.alive) continue;
      dx = m.wx - P.wx;
      dy = m.wy - P.wy;
      d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
    }
    return Math.sqrt(best);
  }

  function updateActionBtn(dt) {
    if (!_btnA) return;
    _btnTimer += dt;
    if (_btnTimer < 0.2) return;
    _btnTimer = 0;

    var mode, icon;
    var P = W.Player;

    if (nearestMobDist() <= W.CFG.ATTACK_RANGE) {
      mode = 'atk';
      icon = '\u2694\uFE0F';
    } else if (W.Res.findTarget(P.wx, P.wy, P.faceX, P.faceY)) {
      mode = 'harvest';
      icon = '\uD83E\uDE93';
    } else {
      mode = 'none';
      icon = '\uD83D\uDC4A';
    }

    if (mode === _btnMode) return;
    _btnMode = mode;
    _btnA.textContent = icon;
    _btnA.style.opacity = (mode === 'none') ? '0.35' : '1';
    _btnA.style.transform = (mode === 'none') ? 'scale(1)' : 'scale(1.12)';
  }

  /* 自動存檔的輕提示：save.js 是紅線區不能動，因此在這裡自行計時 */
  var _asNote = 0;

  function noteAutosave(dt) {
    _asNote += dt;
    if (_asNote < W.CFG.AUTOSAVE_INTERVAL) return;
    _asNote = 0;
    showToast('\u25CB \u81ea\u52d5\u5b58\u6a94');
  }

  function doAction() {
    if (W.Stats.isDead()) return;
    /* 揮空也要出弧光，這是手感的關鍵 */
    W.Render.slash(W.Player.faceX, W.Player.faceY);
    var a = W.Player.attack();
    if (a === 'tired') { showToast('\u9ad4\u529b\u4e0d\u8db3'); return; }
    if (a) {
      showToast(a.killed
        ? ('\u64ca\u5012 ' + a.name + '\uff01\uff0b\u751f\u8089\u3001\u6bdb\u76ae')
        : (a.name + ' \u53d7\u5230 ' + a.dmg + ' \u9ede\u50b7\u5bb3'));
      return;
    }
    doHarvest();
  }

  function eat(id, foodAdd, hpDelta) {
    if (!W.Inv.take(id, 1)) { showToast('\u6c92\u6709' + W.Inv.label(id)); return; }
    W.Stats.eat(foodAdd, hpDelta);
    showToast('\u5403\u4e86' + W.Inv.label(id) + '\uff0c\u98fd\u98df \uff0b' + foodAdd);
    document.getElementById('bag-body').textContent =
      '\u80cc\u5305\uff08\u5171 ' + W.Inv.total() + ' \u4ef6\uff09\n\n' + W.Inv.summary();
  }

  function doSleep() {
    if (!W.Build.nearType(W.Player.wx, W.Player.wy, W.Build.TYPE.BED, W.CFG.SLEEP_RANGE)) {
      showToast('\u9700\u8981\u5148\u653e\u4e0b\u7761\u888b\u4e26\u7ad9\u5728\u65c1\u908a');
      return;
    }
    if (!W.Time.isNight()) {
      showToast('\u73fe\u5728\u4e0d\u662f\u591c\u665a\uff0c\u7761\u4e0d\u8457');
      return;
    }
    if (W.Stats.food() < W.CFG.SLEEP_FOOD) {
      showToast('\u592a\u9913\u4e86\uff0c\u7761\u4e0d\u7740\uff08\u9700\u8981\u98fd\u98df ' + W.CFG.SLEEP_FOOD + '\uff09');
      return;
    }
    W.Time.skipToDawn();
    W.Stats.eat(-W.CFG.SLEEP_FOOD, W.CFG.SLEEP_HEAL);
    W.Mobs.clearAll();
    W.Save.save();
    showToast('\u4e00\u89ba\u5230\u5929\u4eae\uff0c\u7b2c ' + W.Time.dayNo() + ' \u5929\u958b\u59cb');
  }

  function cloudLabel() {
    document.getElementById('btn-cloud').textContent =
      W.Cloud.isSignedIn() ? '\u96f2\u7aef\u767b\u51fa' : '\u96f2\u7aef\u767b\u5165';
  }

  function cloudResult(r, okMsg) {
    if (r === true) { showToast(okMsg); }
    else if (r === 'downloaded') { showToast('\u5df2\u5f9e\u96f2\u7aef\u53d6\u56de\u8f03\u65b0\u7684\u9032\u5ea6'); W.Camera.snapTo(W.Player.wx, W.Player.wy); }
    else if (r === 'in-sync') { showToast('\u96f2\u7aef\u8207\u672c\u6a5f\u5df2\u4e00\u81f4'); }
    else if (typeof r === 'string') { showToast(r); }
    cloudLabel();
  }

  function checkDeath(dt) {
    if (!W.Stats.isDead()) { deadT = 0; return; }
    deadT += dt;
    if (deadT < 1.6) return;
    deadT = 0;
    W.Stats.revive();
    W.Player.goHome();
    W.Mobs.clearAll();
    W.Camera.snapTo(W.Player.wx, W.Player.wy);
    W.Save.save();
    showToast('\u4f60\u6607\u5929\u4e86\u2026\u2026\u65bc\u71df\u5730\u91cd\u65b0\u7747\u958b\u96d9\u773c');
  }

  function doHarvest() {
    var r = W.Player.harvest(Date.now());
    if (!r) { showToast('\u9644\u8fd1\u6c92\u6709\u53ef\u63a1\u96c6\u7684\u6771\u897f'); return; }
    showToast(r.name + ' \uff0b' + W.Inv.label(r.item) + ' \u00d7' + r.n);
  }

  function loop(now) {
    var dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    if (dt <= 0) dt = 0.016;

    fpsAcc += 1 / dt;
    fpsCount++;
    if (fpsCount >= 10) { fps = fpsAcc / fpsCount; fpsAcc = 0; fpsCount = 0; }

    frame++;
    W.Input.update();
    W.Time.update(dt);
    W.Player.update(dt);
    W.Stats.update(dt);
    W.Mobs.update(dt);
    checkDeath(dt);
    W.World.tick(frame);
    W.Minimap.tick(dt);
    tickToast(dt);
    W.Save.tick(dt);
    W.Cloud.tick(dt);
    W.Camera.follow(W.Player.wx, W.Player.wy, dt);
    W.Render.draw(dt);
    updateHUD(dt);
    updateActionBtn(dt);
    noteAutosave(dt);

    requestAnimationFrame(loop);
  }

  function diagText() {
    var st = W.World.stats();
    var rs = W.Res.stats();
    var sv = W.Save.info();
    var ms = W.Mobs.stats();
    var bs = W.Build.stats();
    var cl = W.Cloud.info();
    var ar = W.Art.stats();
    return [
      '=== WILDS 診斷 (Phase 1) ===',
      '',
      'FPS          : ' + Math.round(fps),
      'DPR          : ' + Math.min(window.devicePixelRatio || 1, W.CFG.MAX_DPR),
      '視窗         : ' + window.innerWidth + ' x ' + window.innerHeight,
      'Canvas       : ' + canvas.width + ' x ' + canvas.height,
      '',
      '玩家世界座標 : ' + W.Player.wx.toFixed(1) + ', ' + W.Player.wy.toFixed(1),
      '玩家區塊     : ' + W.Player.chunkX() + ', ' + W.Player.chunkY(),
      '攝影機座標   : ' + W.Camera.wx.toFixed(1) + ', ' + W.Camera.wy.toFixed(1),
      '',
      '輸入向量     : ' + W.Input.getX().toFixed(2) + ', ' + W.Input.getY().toFixed(2),
      '搖桿啟用     : ' + W.Input.isActive(),
      '',
      '世界大小     : ' + W.CFG.WORLD_SIZE,
      '區塊大小     : ' + W.CFG.CHUNK_SIZE,
      '移動速度     : ' + W.CFG.PLAYER_SPEED + ' 單位/秒',
      '',
      '--- 地形 (Phase 2) ---',
      '種子         : ' + W.CFG.SEED,
      '腳下地形     : ' + W.World.NAMES[W.Player.terrain()],
      '遭阻擋         : ' + W.Player.blocked,
      '快取區塊     : ' + st.cached + ' / ' + W.CFG.CHUNK_CACHE_MAX,
      '待生成佇列   : ' + st.pending,
      '累計已生成   : ' + st.built,
      '',
      '',
      '--- \u8cc7\u6e90 (Phase 3) ---',
      '\u9130\u8fd1\u7bc0\u9ede     : ' + rs.near,
      '\u7bc0\u9ede\u5feb\u53d6     : ' + rs.chunks + ' \u5340\u584a',
      '\u5df2\u63a1\u96c6\u5f85\u9577 : ' + rs.taken,
      '\u80cc\u5305\u7e3d\u91cf     : ' + W.Inv.total(),
      '\u5c0f\u5730\u5716         : ' + (W.Minimap.isOn() ? '\u958b' : '\u95dc'),
      '',
      W.Inv.summary(),
      '--- \u5b58\u6a94 (Phase 4) ---',
      '\u5b58\u6a94\u53ef\u7528     : ' + sv.ok + '\uff08' + sv.reason + '\uff09',
      '\u5b58\u6a94\u7248\u672c     : v' + sv.version,
      '\u4e0a\u6b21\u5b58\u6a94     : ' + (sv.lastSaved ? new Date(sv.lastSaved).toLocaleString() : '\u5c1a\u672a\u5b58\u6a94'),
      '\u932f\u8aa4\u8a0a\u606f     : ' + (sv.lastError || '\u7121'),
      '\u81ea\u52d5\u5b58\u6a94     : \u6bcf ' + W.CFG.AUTOSAVE_INTERVAL + ' \u79d2\uff0b\u5207\u51fa\u80cc\u666f\u6642',
      '',
      '--- \u751f\u5b58 (Phase 5) ---',
      '\u751f\u547d         : ' + W.Stats.hp().toFixed(0) + ' / 100',
      '\u98fd\u98df         : ' + W.Stats.food().toFixed(0) + ' / 100',
      '\u9ad4\u529b         : ' + W.Stats.stam().toFixed(0) + ' / 100',
      '\u6b7b\u4ea1\u72c0\u614b     : ' + W.Stats.isDead(),
      '\u71df\u5730\u5750\u6a19     : ' + Math.round(W.Player.homeWx) + ', ' + Math.round(W.Player.homeWy),
      '\u751f\u7269\u6578\u91cf     : ' + ms.alive + ' / ' + ms.cap + '\uff08\u72fc ' + ms.wolves + '\uff09',
      '\u751f\u7269\u4e0d\u5b58\u6a94 : \u96e2\u958b\u5f8c\u91cd\u65b0\u751f\u6210',
      '',
      '--- \u5408\u6210\u8207\u5efa\u9020 (Phase 6) ---',
      '\u77f3\u65a7         : ' + (W.Craft.has('axe') ? '\u5df2\u64c1\u6709' : '\u7121'),
      '\u77f3\u93ac         : ' + (W.Craft.has('pick') ? '\u5df2\u64c1\u6709' : '\u7121'),
      '\u5efa\u9020\u7269\u7e3d\u6578 : ' + bs.total + '\uff08\u71df\u706b ' + bs.fire + '\u3001\u6728\u7246 ' + bs.wall + '\u3001\u7761\u888b ' + bs.bed + '\uff09',
      '\u7ad9\u5728\u71df\u706b\u65c1 : ' + (!!W.Build.nearType(W.Player.wx, W.Player.wy, 0, W.CFG.FIRE_RANGE)),
      '',
      '--- \u65e5\u591c (Phase 7) ---',
      '\u7b2c\u5e7e\u5929       : ' + W.Time.dayNo(),
      '\u6642\u9593         : ' + W.Time.clock() + '\uff08' + W.Time.phase() + '\uff09',
      '\u9ed1\u6697\u5ea6       : ' + W.Time.darkness().toFixed(2),
      '\u591c\u665a\u6a21\u5f0f     : ' + W.Time.isNight(),
      '\u4e00\u65e5\u9577\u5ea6     : ' + W.CFG.DAY_LENGTH + ' \u79d2',
      '',
      '\u7d20\u6750\u8f09\u5165     : ' + ar.loaded + ' / ' + ar.total + '\uff08\u5931\u6557 ' + ar.failed + '\uff09',
      '',
      '--- \u96f2\u7aef (Phase 8) ---',
      '\u96f2\u7aef\u72c0\u614b     : ' + cl.reason,
      '\u5e33\u865f         : ' + (cl.email || cl.uid || '\u672a\u767b\u5165'),
      '\u5f85\u4e0a\u50b3       : ' + cl.dirty,
      '\u4e0a\u6b21\u4e0a\u50b3     : ' + (cl.lastUp ? new Date(cl.lastUp).toLocaleString() : '\u7121'),
      '\u4e0a\u6b21\u4e0b\u8f09     : ' + (cl.lastDown ? new Date(cl.lastDown).toLocaleString() : '\u7121'),
      '\u96f2\u7aef\u932f\u8aa4     : ' + (cl.lastError || '\u7121'),
      '\u96f2\u7aef\u9375\u503c     : users/{uid}/data/wilds:save',
      '\u81ea\u52d5\u4e0a\u50b3     : \u6bcf ' + W.CFG.CLOUD_INTERVAL + ' \u79d2\uff08\u6709\u8b8a\u52d5\u624d\u50b3\uff09',
      '',
      '=== \u5168\u90e8\u968e\u6bb5\u5b8c\u6210 ==='
    ].join('\n');
  }

  function init() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    elPos   = document.getElementById('hud-pos');
    elChunk = document.getElementById('hud-chunk');
    elFps   = document.getElementById('hud-fps');
    elToast = document.getElementById('toast');
    _btnA   = document.getElementById('btn-a');
    elHp    = document.getElementById('bar-hp');
    elFood  = document.getElementById('bar-food');
    elStam  = document.getElementById('bar-stam');
    elTime  = document.getElementById('hud-time');

    W.Render.init(ctx);
    W.Input.init();
    resize();
    W.Camera.snapTo(W.Player.wx, W.Player.wy);

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function() {
      setTimeout(resize, 200);
    });

    document.getElementById('btn-a').addEventListener('click', doAction);

    document.getElementById('btn-eat-berry').addEventListener('click', function() {
      eat('berry', W.CFG.EAT_BERRY_FOOD, 0);
    });

    document.getElementById('btn-eat-meat').addEventListener('click', function() {
      eat('meat', W.CFG.EAT_MEAT_FOOD, W.CFG.EAT_MEAT_HP);
    });

    document.getElementById('btn-b').addEventListener('click', function() {
      var on = W.Minimap.toggle();
      showToast('\u5c0f\u5730\u5716\uff1a' + (on ? '\u958b\u555f' : '\u95dc\u9589'));
    });

    document.getElementById('btn-c').addEventListener('click', openBag);

    document.getElementById('btn-d').addEventListener('click', openCraft);

    document.getElementById('gc-close').addEventListener('click', function() {
      document.getElementById('goal-card').classList.remove('open');
      try { window.localStorage.setItem('wilds:goalSeen', '1'); } catch (e) {}
    });

    document.getElementById('craft-close').addEventListener('click', closeCraft);

    document.getElementById('btn-sleep').addEventListener('click', doSleep);

    document.getElementById('craft-list').addEventListener('click', onCraftClick);

    document.getElementById('btn-eat-cooked').addEventListener('click', function() {
      eat('cooked', W.CFG.EAT_COOKED_FOOD, W.CFG.EAT_COOKED_HP);
    });

    document.getElementById('bag-close').addEventListener('click', function() {
      document.getElementById('bag-panel').classList.remove('open');
    });

    document.getElementById('btn-cloud').addEventListener('click', function() {
      if (W.Cloud.isSignedIn()) {
        W.Cloud.signOut().then(function() {
          showToast('\u5df2\u767b\u51fa\u96f2\u7aef');
          cloudLabel();
        });
      } else {
        W.Cloud.signIn().then(function(r) { cloudResult(r, '\u767b\u5165\u6210\u529f'); });
      }
    });

    document.getElementById('btn-up').addEventListener('click', function() {
      W.Save.save().then(function() { return W.Cloud.upload(); })
        .then(function(r) { cloudResult(r, '\u5df2\u4e0a\u50b3\u96f2\u7aef'); });
    });

    document.getElementById('btn-down').addEventListener('click', function() {
      W.Cloud.download(false).then(function(r) {
        if (r === 'newer-local') {
          if (!window.confirm('\u672c\u6a5f\u9032\u5ea6\u6bd4\u96f2\u7aef\u65b0\uff0c\u78ba\u5b9a\u8981\u7528\u820a\u7684\u96f2\u7aef\u5b58\u6a94\u8986\u84cb\u55ce\uff1f')) {
            showToast('\u5df2\u53d6\u6d88');
            return;
          }
          W.Cloud.download(true).then(function(r2) {
            if (r2 === true) { W.Camera.snapTo(W.Player.wx, W.Player.wy); }
            cloudResult(r2, '\u5df2\u5f9e\u96f2\u7aef\u4e0b\u8f09');
          });
          return;
        }
        if (r === true) { W.Camera.snapTo(W.Player.wx, W.Player.wy); }
        cloudResult(r, '\u5df2\u5f9e\u96f2\u7aef\u4e0b\u8f09');
      });
    });

    document.getElementById('btn-save').addEventListener('click', function() {
      W.Save.save().then(function(r) {
        showToast(r ? '\u5df2\u5b58\u6a94 \u2713' : '\u5b58\u6a94\u5931\u6557');
      });
    });

    document.getElementById('btn-load').addEventListener('click', function() {
      W.Save.load().then(function(r) {
        if (r) { W.Camera.snapTo(W.Player.wx, W.Player.wy); }
        showToast(r ? '\u5b58\u6a94\u5df2\u8b80\u53d6 \u2713' : '\u627e\u4e0d\u5230\u5b58\u6a94');
      });
    });

    document.getElementById('btn-wipe').addEventListener('click', function() {
      if (!window.confirm('\u78ba\u5b9a\u8981\u6e05\u9664\u5b58\u6a94\uff1f\u80cc\u5305\u8207\u63a1\u96c6\u7d00\u9304\u6703\u6b78\u96f6\uff0c\u6b64\u52d5\u4f5c\u7121\u6cd5\u5fa9\u539f\u3002')) return;
      W.Save.wipe().then(function() {
        showToast('\u5b58\u6a94\u5df2\u6e05\u9664');
      });
    });

    document.getElementById('btn-diag').addEventListener('click', function() {
      document.getElementById('diag-body').textContent = diagText();
      document.getElementById('diag-panel').classList.add('open');
    });
    document.getElementById('diag-close').addEventListener('click', function() {
      document.getElementById('diag-panel').classList.remove('open');
    });

    window.addEventListener('pagehide', function() { W.Save.save(); W.Cloud.upload(); });
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') { W.Save.save(); W.Cloud.upload(); }
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(function() {});
    }

    W.Cloud.init();
    cloudLabel();

    W.Save.open().then(function() {
      return W.Save.load();
    }).then(function(loaded) {
      if (!loaded) W.Player.spawn();
      W.Camera.snapTo(W.Player.wx, W.Player.wy);
      showToast(loaded ? '\u5df2\u8b80\u53d6\u5b58\u6a94' : '\u65b0\u7684\u65c5\u7a0b\u958b\u59cb');
      var seenGoal = false;
      try { seenGoal = window.localStorage.getItem('wilds:goalSeen') === '1'; } catch (e) {}
      if (!seenGoal) { document.getElementById('goal-card').classList.add('open'); }

      last = performance.now();
      requestAnimationFrame(loop);
    });
  }

  function onHurt() {
    if (navigator.vibrate) { navigator.vibrate(30); }
    if (W.Stats.hpPct() < 0.3) showToast('\u751f\u547d\u5371\u96aa\uff01\u5feb\u9003\u6216\u9032\u98df');
  }

  return { init: init, onHurt: onHurt, placeMode: function() { return craftOpen; } };
})();

window.addEventListener('load', W.Game.init);
