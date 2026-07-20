var CACHE_VERSION = 'wilds-v24';

var ASSETS = [
  './index.html',
  './style.css',
  './manifest.json',
  './js/config.js',
  './js/rng.js',
  './js/world.js',
  './js/inventory.js',
  './js/store.js',
  './js/resources.js',
  './js/minimap.js',
  './js/save.js',
  './js/stats.js',
  './js/mobs.js',
  './js/build.js',
  './js/sites.js',
  './js/companions.js',
  './js/bosses.js',
  './js/craft.js',
  './js/time.js',
  './js/firebase-config.js',
  './js/cloud.js',
  './js/camera.js',
  './js/input.js',
  './js/player.js',
  './js/render.js',
  './js/arrows.js',
  './js/sfx.js',
  './js/main.js',
  './js/art.js',
  './assets/tree.png',
  './assets/tree_cut.png',
  './assets/rock.png',
  './assets/rock_mined.png',
  './assets/grass.png',
  './assets/grass_cut.png',
  './assets/berry.png',
  './assets/berry_empty.png',
  './assets/deer.png',
  './assets/deer_walk.png',
  './assets/rabbit.png',
  './assets/rabbit_hop.png',
  './assets/wolf.png',
  './assets/wolf_run.png',
  './assets/campfire.png',
  './assets/bed.png',
  './assets/campfire_out.png',
  './assets/workbench.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/ui/axe.png',
  './assets/ui/berry.png',
  './assets/ui/campfire.png',
  './assets/ui/fiber.png',
  './assets/ui/furnace.png',
  './assets/ui/mushroom.png',
  './assets/ui/pick.png',
  './assets/ui/planks.png',
  './assets/ui/sack.png',
  './assets/ui/shovel.png',
  './assets/ui/stone.png',
  './assets/ui/stones.png',
  './assets/ui/wood.png',
  './assets/ui/workbench.png',
  './assets/wall.png',
  './assets/chest.png',
  './assets/chest_open.png',
  './assets/ruin.png',
  './assets/cave.png',
  './assets/crate.png',
  './assets/fence.png',
  './assets/rack.png',
  './assets/boar.png',
  './assets/boar_run.png',
  './assets/bear.png',
  './assets/bear_walk.png',
  './assets/crow.png',
  './assets/crow_fly.png',
  './assets/ui/flint.png',
  './assets/ui/meat.png',
  './assets/ui/cooked.png',
  './assets/ui/hide.png',
  './assets/ui/arrow.png',
  './assets/ui/metal.png',
  './assets/ui/soup.png',
  './assets/ui/jerky.png',
  './assets/player2.png',
  './assets/player.png'
];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function(c) { return c.addAll(ASSETS); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE_VERSION) return caches.delete(k);
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    fetch(e.request).catch(function() { return caches.match(e.request); })
  );
});
