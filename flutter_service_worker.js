'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';

const RESOURCES = {"flutter_bootstrap.js": "e7dd08b6289a2dc3b327b52c4f869f91",
"version.json": "df963bce92ed374b7679742ede1d665e",
"index.html": "8aa8eaaea30a49e0e8ebbb854f375990",
"main.dart.js": "1bf4d22e5946c2f8379485938a431153",
"main.dart.wasm": "d7be0a12dff36d84b9c8cad7058e8566",
"main.dart.mjs": "a4b8246f2c861aec3b008f29ce7c0190",
"flutter.js": "a84fb19d509ce3514a76dee32608551c",
"manifest.json": "0f4f8b499044b92618410d6b28ba02e8",
"/": "8aa8eaaea30a49e0e8ebbb854f375990",
"assets/AssetManifest.bin": "2c469e3411983e9e7fe56ac37507d184",
"assets/AssetManifest.bin.json": "2e228a46ada8496a6ee4f05d56747d51",
"assets/assets/ach_1.svg": "35fdba16b05e4247470e9552f7c9164a",
"assets/assets/ach_1_bg.svg": "2041c0699bd89345c168826adf11965d",
"assets/assets/ach_3.svg": "659f8e83c76cfaceb8eb727f60d1adc5",
"assets/assets/ach_3_bg.svg": "dba3c5fa784e0f44ac0f09acb9104f57",
"assets/assets/ach_4.svg": "2b435fd0e541b421e12bed81e78fe3b6",
"assets/assets/ach_4_2.svg": "e65047ee3e0e29abac35398765435aca",
"assets/assets/ach_4_bg.svg": "8d27b26b3e10c53f7375785bf85716a4",
"assets/assets/ach_4_bg_2.svg": "f95ebb4059af3c410f34a1adeb1225be",
"assets/assets/ach_6.svg": "e559d8d8626e17a24b3a2f19a8e3f23c",
"assets/assets/ach_6_bg.svg": "37c8e2fe80c92a1d1e92800ab1093b71",
"assets/assets/ach_archive.svg": "0359a8d8977be2daf73f8032dbcde05f",
"assets/assets/ach_archive_bg.svg": "8895dd0b4a14f3f9f4fb25428f3dbd3b",
"assets/assets/ach_games.svg": "ae006e575622ada331d8ccc51204cee6",
"assets/assets/ach_games_bg.svg": "58464540a6f21134fc438cb0dc47b3cc",
"assets/assets/ach_level_1.svg": "b22035799c3f32bd29a5bcc169e9b761",
"assets/assets/ach_level_2.svg": "6429a8ec19a484a8c0b507ae9d348c33",
"assets/assets/ach_level_3.svg": "a56dee87b968c89572352fbe6b584cc8",
"assets/assets/ach_level_4.svg": "68ddc6e950c5b61fb15c2a1bb685189a",
"assets/assets/ach_level_5.svg": "de024e893095e8944ae1f5b2be123854",
"assets/assets/ach_medal.svg": "cf43636367a0e157e5053a94fc6231c1",
"assets/assets/ach_medal_bg.svg": "bb86ca6ba623c96280feefee47724e84",
"assets/assets/ach_share.svg": "0e8e32f7e4e1f593c2b800d833b55865",
"assets/assets/ach_share_bg.svg": "73d6d6a235c31cc96ca73de1e79e4a0c",
"assets/assets/ach_sorry.svg": "467026b99333355a37becca32cf28a9d",
"assets/assets/ach_sorry_bg.svg": "4c40afbce74e3d302918fbc075176fc4",
"assets/assets/ach_streak.svg": "1ef58c722b5e26936827d5a753cc6177",
"assets/assets/ach_streak_bg.svg": "c0e9998e2b311636a6946a3854803a7f",
"assets/assets/achievements.svg": "4d8a35b651c0bf49b3086d6feae2c83e",
"assets/assets/archive.svg": "3b9a9cb9a6c72f4199ce4fc89aa1d198",
"assets/assets/arrow_left.svg": "e6d6c700ea925a106559f4e397b0f8e3",
"assets/assets/arrow_right.svg": "ccdfb49472f253231ed7b197b6045f87",
"assets/assets/arrow_up.svg": "05cd781b91f7e824be2f094918ab6e7a",
"assets/assets/back.svg": "e8f07aa4fef7c7392e120816df792f78",
"assets/assets/canoku_logo.svg": "2d3b9d21a50dff712c3b8c9b5011c69b",
"assets/assets/canuckle.svg": "4095794012b048e64a3aa1bff4db75d6",
"assets/assets/cira-darkmode.svg": "3e6afe9342b42ab3ce6176288b9bf3d6",
"assets/assets/cira-logo.svg": "2e84a0405bc6f0130c4a0a4b488d9b24",
"assets/assets/close.svg": "864949c0c45ab46412ea3a3e5c9f64f1",
"assets/assets/close_dark.svg": "ddd71205e917ca75d0efde9000d49371",
"assets/assets/delete.svg": "a4c7f0283a7fc1ab748ba9f07cfc02da",
"assets/assets/dropdown.svg": "6178a98d54ca21e0198957d10eda19d4",
"assets/assets/email.svg": "02f6336a5c1dae3ede806a114de21c04",
"assets/assets/facebook.svg": "aff4724877774ac2f0100963545e5c7e",
"assets/assets/facebook_darkmode.svg": "37c63932e2a95067f5a010f1e743ad07",
"assets/assets/help.svg": "feebe284bf62e628abb890e101844463",
"assets/assets/instagram.svg": "8821f813202ef10512182b831d233a00",
"assets/assets/instagram_darkmode.svg": "cd640e48f1456494b3ab60da7dd8f7eb",
"assets/assets/kofi.svg": "a02b6daee4bdf4c2b994df44fce4dd3d",
"assets/assets/leaf.svg": "9328cb116f215c81d26ac303fcc39ec3",
"assets/assets/leaf_border.svg": "3c5a9539ff017916445b8ac47a249843",
"assets/assets/leaf_empty.svg": "c3b3cbb7388a30048b15c3b918a98318",
"assets/assets/leaf_five_guesses.svg": "84cb6a58d19139b0c7bb400da39c8eb4",
"assets/assets/leaf_five_guesses_dark.svg": "320cd72b9338eec24b2535fb7fc184f1",
"assets/assets/leaf_four_guesses.svg": "0a794cc306189d5fa3f872161bf214dd",
"assets/assets/leaf_four_guesses_dark.svg": "cb3b15855b8608ed1bdad0cb0abeb712",
"assets/assets/leaf_loading.svg": "b53bfdb70118f436f5aaca4f8570a592",
"assets/assets/leaf_loss.svg": "7cf5b8f3b17f0c5f13d70b910917e091",
"assets/assets/leaf_loss_dark.svg": "7bbeacb8911915bed04351eba7874a81",
"assets/assets/leaf_one_guess.svg": "eefe81011eb5f29e9fc25edfe6db0533",
"assets/assets/leaf_one_guess_dark.svg": "ad3f5dd91fb480d149917b95dad32af6",
"assets/assets/leaf_six_guesses.svg": "4468ed49c3fa9d7256222a5a85431b13",
"assets/assets/leaf_six_guesses_dark.svg": "a01ab00e767ec0f67aca1e5e93a91b3a",
"assets/assets/leaf_three_guesses.svg": "dbe659109943e96ddc62c364ca445375",
"assets/assets/leaf_three_guesses_dark.svg": "c55ee9705c099f7d901fb64dd30bf639",
"assets/assets/leaf_two_guesses.svg": "039577f20023da4b38dc970c36cf7c24",
"assets/assets/leaf_two_guesses_dark.svg": "ef0cb8bf225a5421f843664c2736aa2a",
"assets/assets/menu.svg": "82158ce2f3fe0d005b2f161f1eb6987a",
"assets/assets/merch.svg": "253234b9b2618b103851298fd5d5bedb",
"assets/assets/merch-darkmode.svg": "8544ebc00abb9042305e32c96b6cb62d",
"assets/assets/plus.svg": "b11d208969f81e265fd6910f49c01626",
"assets/assets/practice.svg": "e55d734afdc4ef62efaaf899565b299a",
"assets/assets/reload.svg": "04ae2cc582e6d1f2c8b904b105b35d30",
"assets/assets/settings.svg": "46bb07f3fae16da1d19955d8dbe99ddc",
"assets/assets/share.svg": "34207e36d562e6720ce17a2a63d86ee6",
"assets/assets/stats.svg": "bb08c344c009eab0aa98389693a64445",
"assets/assets/timer.svg": "7fbc77925b25dae0dbddccd464fe3c48",
"assets/assets/twitter.svg": "b174fa8b5c953217bcd6194aa80dc27e",
"assets/assets/twitter_darkmode.svg": "cd1fddfcd020433ccdb92beb9f386855",
"assets/FontManifest.json": "7d802299eadccfb43c796ce55fa20603",
"assets/fonts/ClearSans-Bold.woff2": "e64f46d11a61304aa70fd34b1e25b92d",
"assets/fonts/ClearSans-Medium.woff2": "3a46a63f89c4c1ed61450dc3e5f6ef06",
"assets/fonts/ClearSans-Regular.woff2": "70cdcab17d5c7ba544f4dde9b73335c2",
"assets/shaders/ink_sparkle.frag": "2815c3cf1e7af2d8a2d328064a62e3a0",
"assets/shaders/stretch_effect.frag": "f0ab847ccb98001d214e09f120664284"
};
// The application shell files that are downloaded before a service worker can
// start.
// NOTE: Update this list whenever font files change (e.g. adding WOFF2 variants).
// Also update the MD5 hashes for any changed files in RESOURCES above,
// and bump serviceWorkerVersion in flutter_bootstrap.js after any edit here.
const CORE = [
"main.dart.js",
"index.html",
"flutter_bootstrap.js",
"assets/AssetManifest.bin.json",
"assets/FontManifest.json",
"assets/fonts/ClearSans-Regular.woff2",
"assets/fonts/ClearSans-Medium.woff2",
"assets/fonts/ClearSans-Bold.woff2"
];

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
