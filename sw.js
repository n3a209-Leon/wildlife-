var CACHE_VERSION = 'wilds-v9';

var ASSETS = [
  './index.html',
  './style.css',
  './manifest.json',
  './js/config.js',
  './js/rng.js',
  './js/world.js',
  './js/inventory.js',
  './js/resources.js',
  './js/minimap.js',
  './js/save.js',
  './js/stats.js',
  './js/mobs.js',
  './js/build.js',
  './js/craft.js',
  './js/time.js',
  './js/firebase-config.js',
  './js/cloud.js',
  './js/camera.js',
  './js/input.js',
  './js/player.js',
  './js/render.js',
  './js/main.js',
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
