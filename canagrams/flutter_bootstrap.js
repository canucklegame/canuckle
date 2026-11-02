// Engine bootstrap.
//
// Adapted from solitaireSourceCode/web/flutter_bootstrap.js, which took it from
// canuckleSourceCode -- the most battle-tested file in the family. Everything
// structural is kept: relative paths, CanvasKit forced, a gstatic reachability
// probe before falling back to the local copy, and the ad tag injected only
// after the first frame.
//
// EVERY PATH HERE IS RELATIVE. Canuckle runs at the site root, so its
// '/canvaskit/' and '/flutter_service_worker.js' are correct there and silently
// wrong under <base href="/portage/">. flutter.js resolves every path with
// `new URL(path, document.baseURI)`, so relative paths follow the base href and
// one build artifact serves any subpath.

(()=>{var C={blink:!0,gecko:!1,webkit:!1,unknown:!1},A=()=>navigator.vendor==="Google Inc."||navigator.userAgent.includes("Edg/")?"blink":navigator.vendor==="Apple Computer, Inc."?"webkit":navigator.vendor===""&&navigator.userAgent.includes("Firefox")?"gecko":"unknown",T=A(),x=()=>typeof ImageDecoder>"u"?!1:T==="blink",R=()=>typeof Intl.v8BreakIterator<"u"&&typeof Intl.Segmenter<"u",j=()=>typeof window.TextCluster<"u",B=()=>{let n=[0,97,115,109,1,0,0,0,1,5,1,95,1,120,0];return WebAssembly.validate(new Uint8Array(n))},K=()=>{let n=document.createElement("canvas");return n.width=1,n.height=1,n.getContext("webgl2")!=null?2:n.getContext("webgl")!=null?1:-1},$=()=>window.chrome&&chrome.runtime&&chrome.runtime.id,f={browserEngine:T,hasImageCodecs:x(),hasChromiumBreakIterators:R(),hasTextCluster:j(),supportsWasmGC:B(),crossOriginIsolated:window.crossOriginIsolated,webGLVersion:K(),isChromeExtension:$()};function m(...n){return new URL(W(...n),document.baseURI).toString()}function W(...n){return n.filter(e=>!!e).map((e,s)=>s===0?L(e):F(L(e))).filter(e=>e.length).join("/")}function F(n){let e=0;for(;e<n.length&&n.charAt(e)==="/";)e++;return n.substring(e)}function L(n){let e=n.length;for(;e>0&&n.charAt(e-1)==="/";)e--;return n.substring(0,e)}function _(n,e){return n.canvasKitBaseUrl?n.canvasKitBaseUrl:e.engineRevision&&!e.useLocalCanvasKit?W("https://www.gstatic.com/flutter-canvaskit",e.engineRevision):"canvaskit"}var g=class{constructor(){this._scriptLoaded=!1}setTrustedTypesPolicy(e){this._ttPolicy=e}async loadEntrypoint(e){let{entrypointUrl:s=m("main.dart.js"),onEntrypointLoaded:t,nonce:r}=e||{};return this._loadJSEntrypoint(s,t,r)}async load(e,s,t,r,i){i??=a=>{a.initializeEngine(t).then(l=>l.runApp())};let{entrypointBaseUrl:o}=t,{entryPointBaseUrl:c}=t;if(!o&&c&&(console.warn("[deprecated] `entryPointBaseUrl` is deprecated and will be removed in a future release. Use `entrypointBaseUrl` instead."),o=c),e.compileTarget==="dart2wasm")return this._loadWasmEntrypoint(e,s,o,i);{let a=e.mainJsPath??"main.dart.js",l=m(o,a);return this._loadJSEntrypoint(l,i,r)}}didCreateEngineInitializer(e){typeof this._didCreateEngineInitializerResolve=="function"&&(this._didCreateEngineInitializerResolve(e),this._didCreateEngineInitializerResolve=null,delete _flutter.loader.didCreateEngineInitializer),typeof this._onEntrypointLoaded=="function"&&this._onEntrypointLoaded(e)}_loadJSEntrypoint(e,s,t){let r=typeof s=="function";if(!this._scriptLoaded){this._scriptLoaded=!0;let i=this._createScriptTag(e,t);if(r)console.debug("Injecting <script> tag. Using callback."),this._onEntrypointLoaded=s,document.head.append(i);else return new Promise((o,c)=>{console.debug("Injecting <script> tag. Using Promises. Use the callback approach instead!"),this._didCreateEngineInitializerResolve=o,i.addEventListener("error",c),document.head.append(i)})}}async _loadWasmEntrypoint(e,s,t,r){if(!this._scriptLoaded){this._scriptLoaded=!0,this._onEntrypointLoaded=r;let{mainWasmPath:i,jsSupportRuntimePath:o}=e,c=m(t,i),a=m(t,o);this._ttPolicy!=null&&(a=this._ttPolicy.createScriptURL(a));let p=(await import(a)).compileStreaming(fetch(c)),d;e.renderer==="skwasm"?d=(async()=>{let u=await s.skwasm;return window._flutter_skwasmInstance=u,{skwasm:u.wasmExports,skwasmWrapper:u,ffi:{memory:u.wasmMemory}}})():d=Promise.resolve({}),await(await(await p).instantiate(await d)).invokeMain()}}_createScriptTag(e,s){let t=document.createElement("script");t.type="application/javascript",s&&(t.nonce=s);let r=e;return this._ttPolicy!=null&&(r=this._ttPolicy.createScriptURL(e)),t.src=r,t}};async function E(n,e,s){if(e<0)return n;let t,r=new Promise((i,o)=>{t=setTimeout(()=>{o(new Error(`${s} took more than ${e}ms to resolve. Moving on.`,{cause:E}))},e)});return Promise.race([n,r]).finally(()=>{clearTimeout(t)})}var v=class{setTrustedTypesPolicy(e){this._ttPolicy=e}loadServiceWorker(e){if(!e||!("serviceWorker"in navigator))return Promise.resolve();let s=()=>{console.warn(`Loading the service worker using Flutter bootstrap is deprecated and will stop working in a future release.
For more details, see: https://github.com/flutter/flutter/issues/156910`)},t=()=>{let{serviceWorkerVersion:r,serviceWorkerUrl:i=m(`flutter_service_worker.js?v=${r}`),timeoutMillis:o=4e3}=e,c=i;this._ttPolicy!=null&&(c=this._ttPolicy.createScriptURL(c));let a=navigator.serviceWorker.register(c).then(l=>this._getNewServiceWorker(l,r)).then(this._waitForServiceWorkerActivation);return E(a,o,"prepareServiceWorker")};return e.serviceWorkerUrl!=null?(s(),t()):navigator.serviceWorker.getRegistration().then(r=>r?t():Promise.resolve())}async _getNewServiceWorker(e,s){if(!e.active&&(e.installing||e.waiting))return console.debug("Installing/Activating first service worker."),e.installing||e.waiting;if(e.active.scriptURL.endsWith(s))return console.debug("Loading from existing service worker."),e.active;{let t=await e.update();return console.debug("Updating service worker."),t.installing||t.waiting||t.active}}async _waitForServiceWorkerActivation(e){if(!e||e.state==="activated")if(e){console.debug("Service worker already active.");return}else throw new Error("Cannot activate a null service worker!");return new Promise((s,t)=>{e.addEventListener("statechange",()=>{e.state==="activated"&&(console.debug("Activated new service worker."),s())})})}};var y=class{constructor(e,s="flutter-js"){let t=e||[/\.js$/,/\.mjs$/];window.trustedTypes&&(this.policy=trustedTypes.createPolicy(s,{createScriptURL:function(r){if(r.startsWith("blob:"))return r;let i=new URL(r,window.location),o=i.pathname.split("/").pop();if(t.some(a=>a.test(o)))return i.toString();console.error("URL rejected by TrustedTypes policy",s,":",r,"(download prevented)")}}))}};var b=(n,e)=>{let s=window._flutter?.buildConfig?.wasmHashes,t=s?.[e];if(!t&&e.includes("/")){let a=e.split("/").pop();t=s?.[a]}let r="crossOriginStorage"in navigator&&"requestFileHandles"in navigator.crossOriginStorage;r&&console.log("Cross-Origin Storage is supported. See https://wicg.github.io/cross-origin-storage/ for more details.");let i=async a=>{let l={algorithm:"SHA-256",value:a};try{let[p]=await navigator.crossOriginStorage.requestFileHandles([l]),d=await p.getFile();return new Response(d,{headers:{"Content-Type":"application/wasm"}})}catch(p){p.name==="NotAllowedError"?console.warn(`Not allowed to retrieve ${e} (hash: ${a}).`):p.name!=="NotFoundError"&&console.warn(`Unexpected error during retrieval of ${e} (hash: ${a}).`,p)}},o=async()=>{if(r&&t){let l=await i(t);if(l)return l}let a=await fetch(n);if(r&&t&&a.ok){let l={algorithm:"SHA-256",value:t},p=a.clone();(async()=>{try{let d=await p.blob(),[h]=await navigator.crossOriginStorage.requestFileHandles([l],{create:!0}),w=await h.createWritable();await w.write(d),await w.close()}catch(d){console.warn(`Error storing ${e} (hash: ${t}):`,d)}})()}return a},c=WebAssembly.compileStreaming(o());return(a,l)=>((async()=>{let p=await c,d=await WebAssembly.instantiate(p,a);l(d,p)})(),{})};var I=(n,e,s,t)=>(window.flutterCanvasKitLoaded=(async()=>{if(window.flutterCanvasKit)return window.flutterCanvasKit;let r=s.hasChromiumBreakIterators&&s.hasImageCodecs;if(!r&&e.canvasKitVariant=="chromium")throw"Chromium CanvasKit variant specifically requested, but unsupported in this browser";let i=r&&e.canvasKitVariant!=="full",o=i&&e.preferWebParagraph&&s.hasTextCluster,c=t;o?c=m(c,"webparagraph"):i&&(c=m(c,"chromium"));let a=m(c,"canvaskit.js");n.flutterTT.policy&&(a=n.flutterTT.policy.createScriptURL(a));let l="canvaskit.wasm";o?l="webparagraph/canvaskit.wasm":i&&(l="chromium/canvaskit.wasm");let p=b(m(c,"canvaskit.wasm"),l),d=await import(a);return window.flutterCanvasKit=await d.default({instantiateWasm:p}),window.flutterCanvasKit})(),window.flutterCanvasKitLoaded);var U=async(n,e,s,t)=>{let i=!s.hasImageCodecs||!s.hasChromiumBreakIterators?"skwasm_heavy":e.enableWimp?"wimp":"skwasm",o=m(t,`${i}.js`),c=o;n.flutterTT.policy&&(c=n.flutterTT.policy.createScriptURL(c));let a=b(m(t,`${i}.wasm`),`${i}.wasm`),l=await import(c);return!s.crossOriginIsolated&&!e.forceSingleThreadedSkwasm&&!e.suppressMultithreadingWarning&&console.warn(`Flutter Web: Skwasm uses multi-threading and web workers for better performance, but your page needs to be cross-origin isolated to support multi-threading. Skwasm will run in single-threaded mode.
To enable multithreading, serve your app with these HTTP response headers:
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
See https://web.dev/articles/coop-coep for guidance.
To silence this warning, set \`suppressMultithreadingWarning: true\` in your Flutter configuration.`),await l.default({skwasmSingleThreaded:e.enableWimp||!s.crossOriginIsolated||s.isChromeExtension||e.forceSingleThreadedSkwasm,instantiateWasm:a,locateFile:(p,d)=>p.endsWith(".ww.js")?URL.createObjectURL(new Blob([`
"use strict";

let eventListener;
eventListener = (message) => {
    const pendingMessages = [];
    const data = message.data;
    data["instantiateWasm"] = (info,receiveInstance) => {
        const instance = new WebAssembly.Instance(data["wasm"], info);
        return receiveInstance(instance, data["wasm"])
    };
    import(data.js).then(async (skwasm) => {
        await skwasm.default(data);

        removeEventListener("message", eventListener);
        for (const message of pendingMessages) {
            dispatchEvent(message);
        }
    });
    removeEventListener("message", eventListener);
    eventListener = (message) => {

        pendingMessages.push(message);
    };

    addEventListener("message", eventListener);
};
addEventListener("message", eventListener);
`],{type:"application/javascript"})):m(t,p),mainScriptUrlOrBlob:o})};var P=f.supportsWasmGC,k=class{async loadEntrypoint(e){let{serviceWorker:s,...t}=e||{},r=new y,i=new v;i.setTrustedTypesPolicy(r.policy),await i.loadServiceWorker(s).catch(c=>{console.warn("Exception while loading service worker:",c)});let o=new g;return o.setTrustedTypesPolicy(r.policy),this.didCreateEngineInitializer=o.didCreateEngineInitializer.bind(o),o.loadEntrypoint(t)}async load({serviceWorkerSettings:e,onEntrypointLoaded:s,nonce:t,config:r}={}){r??={};let i=_flutter.buildConfig;if(!i)throw"FlutterLoader.load requires _flutter.buildConfig to be set";let o=r.wasmAllowList?.[f.browserEngine]??C[f.browserEngine],c=u=>{switch(u){case"skwasm":return P?f.webGLVersion>0?o?null:`Skwasm is disabled by your wasmAllowList configuration for browser engine "${f.browserEngine}".`:"Skwasm requires WebGL support; this browser does not provide it.":"Skwasm requires WasmGC support; this browser does not implement it yet.";default:return null}},a=u=>u.compileTarget==="dart2wasm"&&!P?"dart2wasm requires WasmGC support; this browser does not implement it yet.":r.renderer&&r.renderer!=u.renderer?`The application is configured to use the "${r.renderer}" renderer; this build targets "${u.renderer}".`:c(u.renderer),l,p=[];for(let u of i.builds){let S=a(u);if(S===null){l=u;break}p.push({candidate:u,reason:S})}if(r.verboseBuildSelection)for(let u of p)console.warn(`Flutter Web: build ${u.candidate.compileTarget}/${u.candidate.renderer} was skipped: ${u.reason}`);if(!l)throw console.warn("Flutter Web: no compatible build found for this browser."+(r.verboseBuildSelection?"":" Set `verboseBuildSelection: true` in your Flutter configuration to see why each candidate was rejected.")),new Error("FlutterLoader could not find a build compatible with configuration and environment.");let d={};d.flutterTT=new y,e&&(d.serviceWorkerLoader=new v,d.serviceWorkerLoader.setTrustedTypesPolicy(d.flutterTT.policy),await d.serviceWorkerLoader.loadServiceWorker(e).catch(u=>{console.warn("Exception while loading service worker:",u)}));let h=_(r,i);l.renderer==="canvaskit"?d.canvasKit=I(d,r,f,h):l.renderer==="skwasm"&&(d.skwasm=U(d,r,f,h));let w=new g;return w.setTrustedTypesPolicy(d.flutterTT.policy),this.didCreateEngineInitializer=w.didCreateEngineInitializer.bind(w),w.load(l,d,r,t,s)}};window._flutter||(window._flutter={});window._flutter.loader||(window._flutter.loader=new k);})();
//# sourceMappingURL=flutter.js.map

if (!window._flutter) {
  window._flutter = {};
}
_flutter.buildConfig = {"engineRevision":"deb287481e3ce9468f3434937ced4240a70539ca","wasmHashes":{"canvaskit.wasm":"fbed517a43e82452404446683f00f2e876d835aed84410695759e67b6bb01cd3","chromium/canvaskit.wasm":"ae8ff1d858140f7b1300ced3fa89fb8c9dce0a400a0f4f1e11f6dcfb3315fdcf","skwasm.wasm":"e540fd5e8303b7b68ec2718cb49e9c421f8ade3075b15e02a7059a62654df9a1","skwasm_heavy.wasm":"565f5cc1cca6ab120f11934b105f01fec4b58b480c82e0889dca93af8e6f8635","webparagraph/canvaskit.wasm":"0ce1b05082efdc8529550e8a01f6ff0593972d55525035010e26f5600aa9f254","wimp.wasm":"e924eaafd801d41e017d178f3fd5cf8a417f641fe35c9ed34a4e1d7582283e0c"},"builds":[{"compileTarget":"dart2js","renderer":"canvaskit","mainJsPath":"main.dart.js?v=202611012056"},{}]};


// -- Service worker ---------------------------------------------------------
//
// Deliberately NOT registered.
//
// Flutter emits only a self-unregistering cleanup worker, so there is no
// caching benefit to be had, and vercel.json already supplies the cache policy.
//
// Registering the way Canuckle does would be actively harmful here. Its call is
// `navigator.serviceWorker.register('/flutter_service_worker.js')` -- the
// leading slash makes that root-absolute regardless of the base href, so from
// /portage/ it would register canucklegame.ca's ROOT worker. That file's
// activate handler calls registration.unregister() and then navigates every
// window client, which from this page means a spurious reload at best and a
// reload loop racing the engine bootstrap at worst.
//
// If offline support is ever wanted, register it explicitly scoped:
//   navigator.serviceWorker.register('flutter_service_worker.js',
//                                    { scope: './' });

// Local development. A debug build is compiled with DDC and loads hundreds of
// separate module scripts, so first paint takes far longer than a release build
// does -- long enough on a cold start to trip the 60s error UI and show a
// developer a failure that is not real.
//
// So on localhost: no fatal-error timeout, and no ad tag. (The ad tag also
// needs window.CANUCKLE_PROD, which only canucklegame.ca sets -- see below.)
const IS_LOCAL_DEV =
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1' ||
  location.hostname === '::1' ||
  location.hostname === '[::1]';

// The Yolla ad tag.
//
// ONE TAG FOR THE WHOLE FAMILY, and that is deliberate, not an oversight.
// Canuckle's root, Canoku, Sens, brainhealth and solitaire all inject this
// same tag -- it is one publisher account, and Yolla splits inventory by
// domain and path on their side. A per-game tag would have to be created and
// would buy nothing.
const AD_TAG_URL =
  'https://portal.cdn.yollamedia.com/storage/tag/ps6d46b18362b4075b4074ad02399f36e91e9d429e.js';

const FALLBACK_TIMEOUT_MS = 9000;  // when to probe gstatic reachability
const ERROR_TIMEOUT_MS = 60000;    // when to give up and show the error UI
const AD_INJECT_DELAY_MS = 2000;   // grace period after first frame

let entrypointHandled = false;
let fallbackStarted = false;

function showFatalError() {
  if (typeof window.__domShowError === 'function') window.__domShowError();
}

function hideLoadingScreen() {
  if (typeof window.__domHideLoading === 'function') window.__domHideLoading();
}

async function runEntrypoint(engineInitializer) {
  if (entrypointHandled) return; // another attempt already won
  entrypointHandled = true;

  try {
    const appRunner = await engineInitializer.initializeEngine();
    await appRunner.runApp();

    // Belt and braces: 'flutter-first-frame' in index.html is the primary
    // hook. Safe to call twice.
    hideLoadingScreen();

    // The ad tag goes in only after the app is running, plus a grace period.
    // Its own canvas/WebGL contexts can otherwise starve CanvasKit's during
    // the critical startup window -- which here is exactly when a first-time
    // visitor's how-to overlay is painting.
    //
    // Production only: window.CANUCKLE_PROD is set by the host test at the top
    // of deploy/index.html (canucklegame.ca and its subdomains). The sandbox
    // and localhost get the coloured ad-preview placeholders instead, and the
    // dev shell (web/index.html) never sets the flag at all.
    if (!IS_LOCAL_DEV && AD_TAG_URL && window.CANUCKLE_PROD === true) {
      setTimeout(function () {
        const s = document.createElement('script');
        s.async = true;
        s.type = 'text/javascript';
        s.src = AD_TAG_URL;
        document.head.appendChild(s);
      }, AD_INJECT_DELAY_MS);
    }
  } catch (err) {
    console.error('Portage: engine init / runApp failed:', err);
    entrypointHandled = false; // let any other in-flight attempt try
    showFatalError();
  }
}

function startFallbackLoad() {
  if (fallbackStarted) return;
  fallbackStarted = true;
  console.warn('Portage: gstatic CanvasKit timed out -- retrying locally.');
  try {
    _flutter.loader.load({
      // RELATIVE, not '/canvaskit/'. This becomes /portage/canvaskit/, so
      // the fallback stays self-contained.
      //
      // A root-absolute path would quietly borrow Canuckle's copy, which
      // happens to work only while both games are on the same engine revision
      // -- and breaks as a blank canvas with no JS error the moment one of
      // them is upgraded and the other is not.
      config: { canvasKitBaseUrl: 'canvaskit/', renderer: 'canvaskit' },
      onEntrypointLoaded: runEntrypoint,
    });
  } catch (err) {
    console.error('Portage: local-CanvasKit fallback load() threw:', err);
    if (!entrypointHandled) showFatalError();
  }
}

// Primary attempt: default config, i.e. gstatic-hosted CanvasKit.
//
// renderer: 'canvaskit' forces CanvasKit for every browser. skwasm is still
// experimental and can silently fail to get a WebGL context on some
// Chrome/GPU/driver combinations, leaving a blank canvas and no JS-visible
// error. It also means main.dart.wasm/.mjs are never fetched -- which is why
// neither deploy script builds with --wasm.
try {
  _flutter.loader.load({
    config: { renderer: 'canvaskit' },
    onEntrypointLoaded: runEntrypoint,
  });
} catch (err) {
  console.error('Portage: primary load() threw synchronously:', err);
  startFallbackLoad();
}

// At 9s, probe gstatic before deciding to fall back.
//
// A HEAD fetch with mode:'no-cors' resolves for any HTTP response (opaque) and
// rejects only on network failure or abort. So if gstatic is merely slow the
// probe succeeds and the in-progress download is left alone.
setTimeout(async function () {
  if (entrypointHandled) return;
  const rev = _flutter.buildConfig && _flutter.buildConfig.engineRevision;
  if (rev) {
    try {
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), 3000);
      await fetch(
        'https://www.gstatic.com/flutter-canvaskit/' + rev + '/canvaskit.js',
        { method: 'HEAD', mode: 'no-cors', signal: ac.signal }
      );
      clearTimeout(tid);
      return; // reachable, just slow
    } catch (_) {
      // blocked or unreachable -- fall through
    }
  }
  startFallbackLoad();
}, FALLBACK_TIMEOUT_MS);

// Only after 60s: give slow connections a real chance before crying failure.
// Skipped entirely in local development -- see IS_LOCAL_DEV above.
if (!IS_LOCAL_DEV) {
  setTimeout(function () {
    if (!entrypointHandled) {
      console.error('Portage: CanvasKit never started.');
      showFatalError();
    }
  }, ERROR_TIMEOUT_MS);
}
