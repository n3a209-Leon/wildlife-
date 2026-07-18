window.W = window.W || {};

/* 生存數值：生命 / 飽食 / 體力。
   新增欄位時務必同步 save.js 的 collect / apply / migrate 三處。 */
W.Stats = (function() {

  var hp = 100, hpMax = 100;
  var food = 100, foodMax = 100;
  var stam = 100, stamMax = 100;
  var dead = false;
  var hurtT = 0;
  var invT = 0;

  function update(dt) {
    if (dead) return;

    food -= W.CFG.FOOD_DRAIN * dt;
    if (food < 0) food = 0;

    if (food <= 0) {
      hp -= W.CFG.STARVE_DPS * dt;
    } else if (food > 50 && hp < hpMax) {
      hp += W.CFG.HP_REGEN * dt;
    }

    stam += W.CFG.STAM_REGEN * dt;
    if (stam > stamMax) stam = stamMax;

    if (hp > hpMax) hp = hpMax;
    if (hurtT > 0) hurtT -= dt;
    if (invT > 0) invT -= dt;

    if (hp <= 0) { hp = 0; dead = true; }
  }

  function damage(n) {
    if (dead) return;
    if (invT > 0) return;
    invT = W.CFG.HURT_IFRAME;
    hp -= n;
    hurtT = 0.35;
    if (hp <= 0) { hp = 0; dead = true; }
  }

  function spend(n) {
    if (stam < n) return false;
    stam -= n;
    return true;
  }

  function eat(food_add, hp_delta) {
    food += food_add;
    if (food > foodMax) food = foodMax;
    hp += hp_delta;
    if (hp > hpMax) hp = hpMax;
    if (hp <= 0) { hp = 0; dead = true; }
  }

  function revive() {
    hp = hpMax * 0.5;
    food = foodMax * 0.4;
    stam = stamMax;
    dead = false;
    hurtT = 0;
    invT = 0;
  }

  function exportData() {
    return { hp: hp, food: food, stam: stam };
  }

  function importData(o) {
    if (!o) return;
    if (typeof o.hp === 'number' && isFinite(o.hp))     hp   = Math.max(1, Math.min(hpMax, o.hp));
    if (typeof o.food === 'number' && isFinite(o.food)) food = Math.max(0, Math.min(foodMax, o.food));
    if (typeof o.stam === 'number' && isFinite(o.stam)) stam = Math.max(0, Math.min(stamMax, o.stam));
    dead = false;
  }

  return {
    update: update,
    damage: damage,
    spend: spend,
    eat: eat,
    revive: revive,
    exportData: exportData,
    importData: importData,
    hp:    function() { return hp; },
    food:  function() { return food; },
    stam:  function() { return stam; },
    hpPct:   function() { return hp / hpMax; },
    foodPct: function() { return food / foodMax; },
    stamPct: function() { return stam / stamMax; },
    isDead:  function() { return dead; },
    isHurt:  function() { return hurtT > 0; }
  };
})();
