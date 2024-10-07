'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';

const RESOURCES = {"flutter_bootstrap.js": "2430ad38b2ea5cfa07401aabb6babbad",
"version.json": "9f82464f7a9d833cff72938c9c809f97",
"index.html": "81a5a4656225b1352de2763f6f17edd3",
"/": "81a5a4656225b1352de2763f6f17edd3",
"main.dart.js": "b3e92b1e33533c393a4d2e105104c898",
"flutter.js": "383e55f7f3cce5be08fcf1f3881f585c",
"favicon.png": "5dcef449791fa27946b3d35ad8803796",
"icons/Icon-192.png": "ac9a721a12bbc803b44f645561ecb1e1",
"icons/Icon-maskable-192.png": "c457ef57daa1d16f64b27b786ec2ea3c",
"icons/Icon-maskable-512.png": "301a7604d45b3e739efc881eb04896ea",
"icons/Icon-512.png": "96e752610906ba2a93c65f8abe1645f1",
"manifest.json": "e647b79cdd24879adfb748d066643847",
"assets/AssetManifest.json": "114bfc552976a43ce2e1e50d49add53b",
"assets/NOTICES": "524be2feb4d4f0f0a840ff6febd1df00",
"assets/FontManifest.json": "7b2a36307916a9721811788013e65289",
"assets/AssetManifest.bin.json": "e71b62b402e932bd706c95a9a2985dda",
"assets/shaders/ink_sparkle.frag": "ecc85a2e95f5e9f53123dcaf8cb9b6ce",
"assets/AssetManifest.bin": "8efda9d02301af7e8635a3f5b12cdf8c",
"assets/fonts/MaterialIcons-Regular.otf": "15d00d00405474e0c461660771658db1",
"assets/assets/help_dark.svg": "6818d94475a8da4db1d063899a971a91",
"assets/assets/bed.svg": "0aab67eda97b3bebc51e4247a4df99a7",
"assets/assets/blueberries.svg": "9ebb0424548dd0f04db9f671759a6d96",
"assets/assets/settings_dark.svg": "7b2d0de32b56faa2d0052d17754779f3",
"assets/assets/instagram_darkmode.svg": "cd640e48f1456494b3ab60da7dd8f7eb",
"assets/assets/facebook_darkmode.svg": "37c63932e2a95067f5a010f1e743ad07",
"assets/assets/brain.svg": "0bf5972bff8b8b4c26621bd5cd25d839",
"assets/assets/kofi.svg": "51d42ce2c9532e3a5f6138bdb2bc6d70",
"assets/assets/dashing.svg": "f99e347df59ddf0a478e0f5d7d1db46f",
"assets/assets/defy_dementia_bigger.jpg": "18ef2b12e3b0fce27288598cc78ab5b3",
"assets/assets/silhouette.svg": "7153b47b3433c885f93ef07dbb2e544a",
"assets/assets/instagram.svg": "8821f813202ef10512182b831d233a00",
"assets/assets/settings.svg": "cddc3bcff3ab05154b301e7f7640449e",
"assets/assets/twitter_darkmode.svg": "cd1fddfcd020433ccdb92beb9f386855",
"assets/assets/bicep.svg": "0197b3a028420a5bc02b8d68f888d9d7",
"assets/assets/canoku_logo.svg": "2d3b9d21a50dff712c3b8c9b5011c69b",
"assets/assets/defy_dementia.jpg": "82d7d5f89e49002b695e0dfa2b879208",
"assets/assets/flag.svg": "7914001bc9b97b98eef89ac72b0bd51a",
"assets/assets/cursor.svg": "39ee662bf44d9f8591ce17908e6fd29f",
"assets/assets/about_dark.svg": "41bd95d9869687dc3ff6426bf2b7b050",
"assets/assets/email.svg": "02f6336a5c1dae3ede806a114de21c04",
"assets/assets/close.svg": "864949c0c45ab46412ea3a3e5c9f64f1",
"assets/assets/erase.svg": "ec2b5a2cf1553929d223accebdb9b7c9",
"assets/assets/facebook.svg": "aff4724877774ac2f0100963545e5c7e",
"assets/assets/canuckle.svg": "dcd3bf31b6f52289da8cdee0c123b610",
"assets/assets/redo.svg": "eb659b59f5e7e584927d5070bf763491",
"assets/assets/about.svg": "2c749e2d945a0566c6b37fca86bcc721",
"assets/assets/close_dark.svg": "ddd71205e917ca75d0efde9000d49371",
"assets/assets/leaf.svg": "fed3b699b46d063327a51f2d70c56993",
"assets/assets/eye.svg": "938845ae928cc025cc21cc71d38c2418",
"assets/assets/canoku_by_canuckle.svg": "ccc436a23082430e1cceafbe09357a1f",
"assets/assets/undo_dark.svg": "ccecbbdc7c08a6e951e20da670d869c8",
"assets/assets/undo.svg": "4798cf663d30dee0a3a048954a0cce6f",
"assets/assets/twitter.svg": "b174fa8b5c953217bcd6194aa80dc27e",
"assets/assets/stats_dark.svg": "c2756ac299e3140529a3debec2b0f2db",
"assets/assets/help.svg": "31a4bef3c1d6d8be231b0319d81f13a0",
"assets/assets/hint.svg": "e07f041f930bf49e1ad85b3e55e30497",
"assets/assets/ear.svg": "41a6db5c39fe00b2d7f13e1f2ebe86b4",
"assets/assets/stats.svg": "66c76888ddd3eb39697a6d27939785ef",
"assets/assets/redo_dark.svg": "e1ced90717b362426e8fc0fb7ecd3620",
"canvaskit/skwasm.js": "5d4f9263ec93efeb022bb14a3881d240",
"canvaskit/skwasm.js.symbols": "c3c05bd50bdf59da8626bbe446ce65a3",
"canvaskit/canvaskit.js.symbols": "74a84c23f5ada42fe063514c587968c6",
"canvaskit/skwasm.wasm": "4051bfc27ba29bf420d17aa0c3a98bce",
"canvaskit/chromium/canvaskit.js.symbols": "ee7e331f7f5bbf5ec937737542112372",
"canvaskit/chromium/canvaskit.js": "901bb9e28fac643b7da75ecfd3339f3f",
"canvaskit/chromium/canvaskit.wasm": "399e2344480862e2dfa26f12fa5891d7",
"canvaskit/canvaskit.js": "738255d00768497e86aa4ca510cce1e1",
"canvaskit/canvaskit.wasm": "9251bb81ae8464c4df3b072f84aa969b",
"canvaskit/skwasm.worker.js": "bfb704a6c714a75da9ef320991e88b03"};
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
