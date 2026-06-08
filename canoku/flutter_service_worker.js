'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';

const RESOURCES = {"flutter_bootstrap.js": "f8ae299b66d316ac99f9bde4065b2b2c",
"version.json": "7be50edb2810bcf5920489f9656c4125",
"index.html": "9674dff5292410750ab7494970fd2039",
"main.dart.js": "cee440b87db2689809c98bf64eb2c78a",
"flutter.js": "a84fb19d509ce3514a76dee32608551c",
"manifest.json": "da94e6427d50a34a72c69ae2a8775e2d",
"/": "9674dff5292410750ab7494970fd2039",
"assets/AssetManifest.bin": "46ff50c88b9cd1491a897a6690922f02",
"assets/AssetManifest.bin.json": "a6264f3754325f071bbdd749a0b26625",
"assets/assets/beaver.svg": "da188d3aa606b4a346465d2fccbcb7f7",
"assets/assets/canoe.svg": "5cfc713546de507114711cd5ff3395f3",
"assets/assets/canoe_dark.svg": "a1f37185bceded642081ff1b68a2bb8f",
"assets/assets/canoku_by_canuckle.svg": "e1983760bd0aa69333984eef1f599f7b",
"assets/assets/canuckle.svg": "4095794012b048e64a3aa1bff4db75d6",
"assets/assets/close.svg": "864949c0c45ab46412ea3a3e5c9f64f1",
"assets/assets/close_dark.svg": "ddd71205e917ca75d0efde9000d49371",
"assets/assets/cursor.svg": "39ee662bf44d9f8591ce17908e6fd29f",
"assets/assets/email.svg": "02f6336a5c1dae3ede806a114de21c04",
"assets/assets/erase.svg": "ec2b5a2cf1553929d223accebdb9b7c9",
"assets/assets/facebook.svg": "aff4724877774ac2f0100963545e5c7e",
"assets/assets/facebook_darkmode.svg": "37c63932e2a95067f5a010f1e743ad07",
"assets/assets/flag.svg": "7914001bc9b97b98eef89ac72b0bd51a",
"assets/assets/help.svg": "31a4bef3c1d6d8be231b0319d81f13a0",
"assets/assets/help_dark.svg": "6818d94475a8da4db1d063899a971a91",
"assets/assets/hint.svg": "e07f041f930bf49e1ad85b3e55e30497",
"assets/assets/hockey.svg": "e37347d0f5a1cb38cf9fe987bf08a771",
"assets/assets/instagram.svg": "8821f813202ef10512182b831d233a00",
"assets/assets/instagram_darkmode.svg": "cd640e48f1456494b3ab60da7dd8f7eb",
"assets/assets/kofi.svg": "a02b6daee4bdf4c2b994df44fce4dd3d",
"assets/assets/lacrosse.svg": "9e07e947012f6aa5eaa6dc131dc73903",
"assets/assets/lacrosse_dark.svg": "89b582f1a9f83b97e245e2324fc3a1ca",
"assets/assets/leaf.svg": "9328cb116f215c81d26ac303fcc39ec3",
"assets/assets/moose.svg": "a38056c43ead33e03183711aba9e0081",
"assets/assets/polar_bear.svg": "66d60416f20e98aa767074d70b869bc8",
"assets/assets/redo.svg": "eb659b59f5e7e584927d5070bf763491",
"assets/assets/redo_dark.svg": "e1ced90717b362426e8fc0fb7ecd3620",
"assets/assets/settings.svg": "cddc3bcff3ab05154b301e7f7640449e",
"assets/assets/settings_dark.svg": "7b2d0de32b56faa2d0052d17754779f3",
"assets/assets/snowflake.svg": "535e2db1ea2eb9152558465e874cfa0b",
"assets/assets/stats.svg": "66c76888ddd3eb39697a6d27939785ef",
"assets/assets/stats_dark.svg": "c2756ac299e3140529a3debec2b0f2db",
"assets/assets/syrup.svg": "60fe01f75515fb991f91c6c90e35e873",
"assets/assets/syrup_dark.svg": "c3af5a78d5add58b644e0fbe2da99151",
"assets/assets/twitter.svg": "b174fa8b5c953217bcd6194aa80dc27e",
"assets/assets/twitter_darkmode.svg": "cd1fddfcd020433ccdb92beb9f386855",
"assets/assets/undo.svg": "4798cf663d30dee0a3a048954a0cce6f",
"assets/assets/undo_dark.svg": "ccecbbdc7c08a6e951e20da670d869c8",
"assets/FontManifest.json": "7b2a36307916a9721811788013e65289",
"assets/fonts/MaterialIcons-Regular.otf": "09c8dd32b6704a3039c9c57a50465210",
"assets/shaders/ink_sparkle.frag": "2815c3cf1e7af2d8a2d328064a62e3a0",
"assets/shaders/stretch_effect.frag": "f0ab847ccb98001d214e09f120664284"
};
// The application shell files that are downloaded before a service worker can
// start.
const CORE = ["main.dart.js",
"index.html",
"flutter_bootstrap.js",
"assets/AssetManifest.bin.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(
        CORE.map((value) => new Request(value, {'cache': 'reload'})));
    })
  );
});
// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');
      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        contentCache = await caches.open(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        // Claim client to enable caching on first launch
        self.clients.claim();
        return;
      }
      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      // Claim client to enable caching on first launch
      self.clients.claim();
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});
// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // Redirect URLs to the index.html
  if (key.indexOf('?v=') != -1) {
    key = key.split('?v=')[0];
  }
  if (event.request.url == origin || event.request.url.startsWith(origin + '/#') || key == '') {
    key = '/';
  }
  // If the URL is not the RESOURCE list then return to signal that the
  // browser should take over.
  if (!RESOURCES[key]) {
    return;
  }
  // If the URL is the index.html, perform an online-first request.
  if (key == '/') {
    return onlineFirst(event);
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache only if the resource was successfully fetched.
        return response || fetch(event.request).then((response) => {
          if (response && Boolean(response.ok)) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      })
    })
  );
});
self.addEventListener('message', (event) => {
  // SkipWaiting can be used to immediately activate a waiting service worker.
  // This will also require a page refresh triggered by the main worker.
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (event.data === 'downloadOffline') {
    downloadOffline();
    return;
  }
});
// Download offline will check the RESOURCES for all files not in the cache
// and populate them.
async function downloadOffline() {
  var resources = [];
  var contentCache = await caches.open(CACHE_NAME);
  var currentContent = {};
  for (var request of await contentCache.keys()) {
    var key = request.url.substring(origin.length + 1);
    if (key == "") {
      key = "/";
    }
    currentContent[key] = true;
  }
  for (var resourceKey of Object.keys(RESOURCES)) {
    if (!currentContent[resourceKey]) {
      resources.push(resourceKey);
    }
  }
  return contentCache.addAll(resources);
}
// Attempt to download the resource online before falling back to
// the offline cache.
function onlineFirst(event) {
  return event.respondWith(
    fetch(event.request).then((response) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, response.clone());
        return response;
      });
    }).catch((error) => {
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response != null) {
            return response;
          }
          throw error;
        });
      });
    })
  );
}
