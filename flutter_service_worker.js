'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';
const RESOURCES = {
  "version.json": "047555b7958b51babde050d97a3a1b67",
"index.html": "2776be1385925da1ebb0de7e0730416b",
"/": "2776be1385925da1ebb0de7e0730416b",
"main.dart.js": "8b768e2e088d0582908d648d67f2a1f6",
"flutter.js": "f85e6fb278b0fd20c349186fb46ae36d",
"favicon.png": "5dcef449791fa27946b3d35ad8803796",
"icons/Icon-192.png": "ac9a721a12bbc803b44f645561ecb1e1",
"icons/Icon-maskable-192.png": "c457ef57daa1d16f64b27b786ec2ea3c",
"icons/Icon-maskable-512.png": "301a7604d45b3e739efc881eb04896ea",
"icons/Icon-512.png": "96e752610906ba2a93c65f8abe1645f1",
"manifest.json": "b9912063e0f5545847847b3bc636c3a6",
"assets/AssetManifest.json": "17ce069942b055cce657776581ae08c8",
"assets/NOTICES": "78dc5b6d379eab3ee4e9ecfdc4be3ec3",
"assets/FontManifest.json": "b30599f8716e82a40a489658de0de7bd",
"assets/shaders/ink_sparkle.frag": "aff6ef1c15a9ccb86de85d06ba7fe594",
"assets/fonts/ClearSans-Bold.ttf": "79e0c29cff90ef22bd513f10253b1b32",
"assets/fonts/ClearSans-Medium.ttf": "411ebe0f9416ef4d16cfe13d58914f96",
"assets/fonts/ClearSans-Regular.ttf": "b9bdac589c0d3aac828fd3a15108b61a",
"assets/assets/ach_4_bg.svg": "8d27b26b3e10c53f7375785bf85716a4",
"assets/assets/ach_medal.svg": "cf43636367a0e157e5053a94fc6231c1",
"assets/assets/leaf_five_guesses.svg": "84a661cc742f96f614173c20e1340b47",
"assets/assets/ach_share.svg": "0e8e32f7e4e1f593c2b800d833b55865",
"assets/assets/leaf_two_guesses.svg": "5b31a4b68c6cd19a30d2d1e9bdee2f46",
"assets/assets/ach_sorry_bg.svg": "4c40afbce74e3d302918fbc075176fc4",
"assets/assets/ach_6_bg.svg": "37c8e2fe80c92a1d1e92800ab1093b71",
"assets/assets/kofi.svg": "3d72657e04c7920701590b03f85b3722",
"assets/assets/kofi.png": "f6189bf279af2e0048a2dec09c35ce34",
"assets/assets/ach_level_5.svg": "de024e893095e8944ae1f5b2be123854",
"assets/assets/ach_archive.svg": "0359a8d8977be2daf73f8032dbcde05f",
"assets/assets/arrow_left.svg": "e6d6c700ea925a106559f4e397b0f8e3",
"assets/assets/ach_level_4.svg": "68ddc6e950c5b61fb15c2a1bb685189a",
"assets/assets/ach_4_2.svg": "e65047ee3e0e29abac35398765435aca",
"assets/assets/settings.svg": "46bb07f3fae16da1d19955d8dbe99ddc",
"assets/assets/archive.svg": "4599c242720665a1f5dcb4cb7f8a5df3",
"assets/assets/leaf_loss.svg": "d695a1e8302bb188f52317f970a34cc1",
"assets/assets/leaf_one_guess_dark.svg": "349ccab5aca4e5240d7a7f10f3469635",
"assets/assets/leaf_five_guesses_dark.svg": "2430b80990ebc9b044c9723796ab40cb",
"assets/assets/arrow_up.svg": "05cd781b91f7e824be2f094918ab6e7a",
"assets/assets/ach_level_3.svg": "a56dee87b968c89572352fbe6b584cc8",
"assets/assets/achievements.svg": "4d8a35b651c0bf49b3086d6feae2c83e",
"assets/assets/ach_level_2.svg": "6429a8ec19a484a8c0b507ae9d348c33",
"assets/assets/ach_4_bg_2.svg": "f95ebb4059af3c410f34a1adeb1225be",
"assets/assets/arrow_right.svg": "ccdfb49472f253231ed7b197b6045f87",
"assets/assets/ach_share_bg.svg": "73d6d6a235c31cc96ca73de1e79e4a0c",
"assets/assets/email.svg": "02f6336a5c1dae3ede806a114de21c04",
"assets/assets/ach_level_1.svg": "b22035799c3f32bd29a5bcc169e9b761",
"assets/assets/close.svg": "864949c0c45ab46412ea3a3e5c9f64f1",
"assets/assets/cira-logo.svg": "2e84a0405bc6f0130c4a0a4b488d9b24",
"assets/assets/ach_games_bg.svg": "58464540a6f21134fc438cb0dc47b3cc",
"assets/assets/leaf_six_guesses_dark.svg": "d700a9f53e4e0f952a9f6bf308df7903",
"assets/assets/back.svg": "4d5f0e6aa5b76f3b6b7b8530276d23a3",
"assets/assets/ach_archive_bg.svg": "8895dd0b4a14f3f9f4fb25428f3dbd3b",
"assets/assets/leaf_six_guesses.svg": "e536b3e9d82c7226080590a1cc1539bc",
"assets/assets/ach_streak_bg.svg": "c0e9998e2b311636a6946a3854803a7f",
"assets/assets/facebook.svg": "31f1853f81f495e25bb4000d0dba2b9a",
"assets/assets/canuckle.svg": "dcd3bf31b6f52289da8cdee0c123b610",
"assets/assets/leaf_three_guesses.svg": "7447e657071c04c58fd895b12fde19f0",
"assets/assets/leaf_four_guesses_dark.svg": "144bbbf87fb16cb8621b0dff6ac6bdb8",
"assets/assets/leaf_three_guesses_dark.svg": "98f1f1ad9881a4f3d3eb031202acfbef",
"assets/assets/ach_streak.svg": "1ef58c722b5e26936827d5a753cc6177",
"assets/assets/twitter.png": "53a82498778b43cf389c7a236bf8f1b3",
"assets/assets/leaf.svg": "fed3b699b46d063327a51f2d70c56993",
"assets/assets/leaf_four_guesses.svg": "475d83ba71fec5be44f32887a7553a33",
"assets/assets/ach_sorry.svg": "467026b99333355a37becca32cf28a9d",
"assets/assets/ach_3_bg.svg": "dba3c5fa784e0f44ac0f09acb9104f57",
"assets/assets/delete.svg": "a4c7f0283a7fc1ab748ba9f07cfc02da",
"assets/assets/ach_3.svg": "659f8e83c76cfaceb8eb727f60d1adc5",
"assets/assets/share.svg": "34207e36d562e6720ce17a2a63d86ee6",
"assets/assets/leaf.png": "76fccd9aec5701e7fd4de1b98182d1da",
"assets/assets/twitter.svg": "2881f962e9910b39966753a6c98b804b",
"assets/assets/leaf_two_guesses_dark.svg": "4d609d1a81af856baf29356098713203",
"assets/assets/ach_1.svg": "35fdba16b05e4247470e9552f7c9164a",
"assets/assets/facebook.png": "5d6ea38a769498dfc19fe6389d14db39",
"assets/assets/leaf_one_guess.svg": "e6e1c1318dc91789a3075572d43ce7c2",
"assets/assets/ach_medal_bg.svg": "bb86ca6ba623c96280feefee47724e84",
"assets/assets/help.svg": "feebe284bf62e628abb890e101844463",
"assets/assets/ach_4.svg": "2b435fd0e541b421e12bed81e78fe3b6",
"assets/assets/ach_games.svg": "ae006e575622ada331d8ccc51204cee6",
"assets/assets/menu.svg": "82158ce2f3fe0d005b2f161f1eb6987a",
"assets/assets/stats.svg": "bb08c344c009eab0aa98389693a64445",
"assets/assets/ach_6.svg": "e559d8d8626e17a24b3a2f19a8e3f23c",
"assets/assets/ach_1_bg.svg": "2041c0699bd89345c168826adf11965d",
"assets/assets/timer.svg": "7fbc77925b25dae0dbddccd464fe3c48",
"assets/assets/leaf_loss_dark.svg": "549da8e6b8326c9caabdd4388b191eb8",
"canvaskit/canvaskit.js": "2bc454a691c631b07a9307ac4ca47797",
"canvaskit/profiling/canvaskit.js": "38164e5a72bdad0faa4ce740c9b8e564",
"canvaskit/profiling/canvaskit.wasm": "95a45378b69e77af5ed2bc72b2209b94",
"canvaskit/canvaskit.wasm": "bf50631470eb967688cca13ee181af62"
};

// The application shell files that are downloaded before a service worker can
// start.
const CORE = [
  "main.dart.js",
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
