'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';

const RESOURCES = {"version.json": "26bd6c0b3fff8fd59c32ac906d7af120",
"index.html": "773f39e85ef01589363fa1c80f3c3e0b",
"/": "773f39e85ef01589363fa1c80f3c3e0b",
"main.dart.js": "7db1acb2939f29975f21a0e386f21a6a",
"flutter.js": "6fef97aeca90b426343ba6c5c9dc5d4a",
"favicon.png": "5dcef449791fa27946b3d35ad8803796",
"icons/Icon-192.png": "ac9a721a12bbc803b44f645561ecb1e1",
"icons/Icon-maskable-192.png": "c457ef57daa1d16f64b27b786ec2ea3c",
"icons/Icon-maskable-512.png": "301a7604d45b3e739efc881eb04896ea",
"icons/Icon-512.png": "96e752610906ba2a93c65f8abe1645f1",
"manifest.json": "e647b79cdd24879adfb748d066643847",
"assets/AssetManifest.json": "e43220ffd62f67e1fb725b76c69b2a62",
"assets/NOTICES": "61ab12c52d89594ae6dad189463a2acc",
"assets/FontManifest.json": "7b2a36307916a9721811788013e65289",
"assets/shaders/ink_sparkle.frag": "f8b80e740d33eb157090be4e995febdf",
"assets/AssetManifest.bin": "4f28e3c62d7c24132ded7415a6d21efb",
"assets/fonts/MaterialIcons-Regular.otf": "dec473cf17da6ac388856282555d76ec",
"assets/assets/help_dark.svg": "6818d94475a8da4db1d063899a971a91",
"assets/assets/bed.svg": "0aab67eda97b3bebc51e4247a4df99a7",
"assets/assets/blueberries.svg": "9ebb0424548dd0f04db9f671759a6d96",
"assets/assets/settings_dark.svg": "7b2d0de32b56faa2d0052d17754779f3",
"assets/assets/instagram_darkmode.svg": "cd640e48f1456494b3ab60da7dd8f7eb",
"assets/assets/facebook_darkmode.svg": "37c63932e2a95067f5a010f1e743ad07",
"assets/assets/brain.svg": "0bf5972bff8b8b4c26621bd5cd25d839",
"assets/assets/kofi.svg": "51d42ce2c9532e3a5f6138bdb2bc6d70",
"assets/assets/dashing.svg": "f99e347df59ddf0a478e0f5d7d1db46f",
"assets/assets/silhouette.svg": "7153b47b3433c885f93ef07dbb2e544a",
"assets/assets/instagram.svg": "8821f813202ef10512182b831d233a00",
"assets/assets/settings.svg": "cddc3bcff3ab05154b301e7f7640449e",
"assets/assets/twitter_darkmode.svg": "cd1fddfcd020433ccdb92beb9f386855",
"assets/assets/bicep.svg": "0197b3a028420a5bc02b8d68f888d9d7",
"assets/assets/canoku_logo.svg": "2d3b9d21a50dff712c3b8c9b5011c69b",
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
"canvaskit/skwasm.js": "95f16c6690f955a45b2317496983dbe9",
"canvaskit/skwasm.wasm": "d1fde2560be92c0b07ad9cf9acb10d05",
"canvaskit/chromium/canvaskit.js": "96ae916cd2d1b7320fff853ee22aebb0",
"canvaskit/chromium/canvaskit.wasm": "1165572f59d51e963a5bf9bdda61e39b",
"canvaskit/canvaskit.js": "bbf39143dfd758d8d847453b120c8ebb",
"canvaskit/canvaskit.wasm": "19d8b35640d13140fe4e6f3b8d450f04",
"canvaskit/skwasm.worker.js": "51253d3321b11ddb8d73fa8aa87d3b15"};
// The application shell files that are downloaded before a service worker can
// start.
const CORE = ["main.dart.js",
"index.html",
"assets/AssetManifest.json",
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
