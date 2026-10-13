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
// wrong under <base href="/canominoes/">. flutter.js resolves every path with
// `new URL(path, document.baseURI)`, so relative paths follow the base href and
// one build artifact serves any subpath.

(()=>{var _={blink:!0,gecko:!1,webkit:!1,unknown:!1},K=()=>navigator.vendor==="Google Inc."||navigator.userAgent.includes("Edg/")?"blink":navigator.vendor==="Apple Computer, Inc."?"webkit":navigator.vendor===""&&navigator.userAgent.includes("Firefox")?"gecko":"unknown",C=K(),R=()=>typeof ImageDecoder>"u"?!1:C==="blink",B=()=>typeof Intl.v8BreakIterator<"u"&&typeof Intl.Segmenter<"u",z=()=>{let i=[0,97,115,109,1,0,0,0,1,5,1,95,1,120,0];return WebAssembly.validate(new Uint8Array(i))},M=()=>{let i=document.createElement("canvas");return i.width=1,i.height=1,i.getContext("webgl2")!=null?2:i.getContext("webgl")!=null?1:-1},D=()=>window.chrome&&chrome.runtime&&chrome.runtime.id,w={browserEngine:C,hasImageCodecs:R(),hasChromiumBreakIterators:B(),supportsWasmGC:z(),crossOriginIsolated:window.crossOriginIsolated,webGLVersion:M(),isChromeExtension:D()};function c(...i){return new URL(I(...i),document.baseURI).toString()}function I(...i){return i.filter(e=>!!e).map((e,n)=>n===0?S(e):F(S(e))).filter(e=>e.length).join("/")}function F(i){let e=0;for(;e<i.length&&i.charAt(e)==="/";)e++;return i.substring(e)}function S(i){let e=i.length;for(;e>0&&i.charAt(e-1)==="/";)e--;return i.substring(0,e)}function E(i,e){return i.canvasKitBaseUrl?i.canvasKitBaseUrl:e.engineRevision&&!e.useLocalCanvasKit?I("https://www.gstatic.com/flutter-canvaskit",e.engineRevision):"canvaskit"}var v=class{constructor(){this._scriptLoaded=!1}setTrustedTypesPolicy(e){this._ttPolicy=e}async loadEntrypoint(e){let{entrypointUrl:n=c("main.dart.js"),onEntrypointLoaded:t,nonce:r}=e||{};return this._loadJSEntrypoint(n,t,r)}async load(e,n,t,r,a){a??=l=>{l.initializeEngine(t).then(u=>u.runApp())};let{entrypointBaseUrl:s}=t,{entryPointBaseUrl:o}=t;if(!s&&o&&(console.warn("[deprecated] `entryPointBaseUrl` is deprecated and will be removed in a future release. Use `entrypointBaseUrl` instead."),s=o),e.compileTarget==="dart2wasm")return this._loadWasmEntrypoint(e,n,s,a);{let l=e.mainJsPath??"main.dart.js",u=c(s,l);return this._loadJSEntrypoint(u,a,r)}}didCreateEngineInitializer(e){typeof this._didCreateEngineInitializerResolve=="function"&&(this._didCreateEngineInitializerResolve(e),this._didCreateEngineInitializerResolve=null,delete _flutter.loader.didCreateEngineInitializer),typeof this._onEntrypointLoaded=="function"&&this._onEntrypointLoaded(e)}_loadJSEntrypoint(e,n,t){let r=typeof n=="function";if(!this._scriptLoaded){this._scriptLoaded=!0;let a=this._createScriptTag(e,t);if(r)console.debug("Injecting <script> tag. Using callback."),this._onEntrypointLoaded=n,document.head.append(a);else return new Promise((s,o)=>{console.debug("Injecting <script> tag. Using Promises. Use the callback approach instead!"),this._didCreateEngineInitializerResolve=s,a.addEventListener("error",o),document.head.append(a)})}}async _loadWasmEntrypoint(e,n,t,r){if(!this._scriptLoaded){this._scriptLoaded=!0,this._onEntrypointLoaded=r;let{mainWasmPath:a,jsSupportRuntimePath:s}=e,o=c(t,a),l=c(t,s);this._ttPolicy!=null&&(l=this._ttPolicy.createScriptURL(l));let d=(await import(l)).compileStreaming(fetch(o)),p;e.renderer==="skwasm"?p=(async()=>{let h=await n.skwasm;return window._flutter_skwasmInstance=h,{skwasm:h.wasmExports,skwasmWrapper:h,ffi:{memory:h.wasmMemory}}})():p=Promise.resolve({}),await(await(await d).instantiate(await p,{loadDynamicModule:async(h,j)=>{let A=fetch(c(t,h)),L=c(t,j);this._ttPolicy!=null&&(L=this._ttPolicy.createScriptURL(L));let x=import(L);return[await A,await x]}})).invokeMain()}}_createScriptTag(e,n){let t=document.createElement("script");t.type="application/javascript",n&&(t.nonce=n);let r=e;return this._ttPolicy!=null&&(r=this._ttPolicy.createScriptURL(e)),t.src=r,t}};async function T(i,e,n){if(e<0)return i;let t,r=new Promise((a,s)=>{t=setTimeout(()=>{s(new Error(`${n} took more than ${e}ms to resolve. Moving on.`,{cause:T}))},e)});return Promise.race([i,r]).finally(()=>{clearTimeout(t)})}var g=class{setTrustedTypesPolicy(e){this._ttPolicy=e}loadServiceWorker(e){if(!e||!("serviceWorker"in navigator))return Promise.resolve();let n=()=>{console.warn(`Loading the service worker using Flutter bootstrap is deprecated and will stop working in a future release.
For more details, see: https://github.com/flutter/flutter/issues/156910`)},t=()=>{let{serviceWorkerVersion:r,serviceWorkerUrl:a=c(`flutter_service_worker.js?v=${r}`),timeoutMillis:s=4e3}=e,o=a;this._ttPolicy!=null&&(o=this._ttPolicy.createScriptURL(o));let l=navigator.serviceWorker.register(o).then(u=>this._getNewServiceWorker(u,r)).then(this._waitForServiceWorkerActivation);return T(l,s,"prepareServiceWorker")};return e.serviceWorkerUrl!=null?(n(),t()):navigator.serviceWorker.getRegistration().then(r=>r?t():Promise.resolve())}async _getNewServiceWorker(e,n){if(!e.active&&(e.installing||e.waiting))return console.debug("Installing/Activating first service worker."),e.installing||e.waiting;if(e.active.scriptURL.endsWith(n))return console.debug("Loading from existing service worker."),e.active;{let t=await e.update();return console.debug("Updating service worker."),t.installing||t.waiting||t.active}}async _waitForServiceWorkerActivation(e){if(!e||e.state==="activated")if(e){console.debug("Service worker already active.");return}else throw new Error("Cannot activate a null service worker!");return new Promise((n,t)=>{e.addEventListener("statechange",()=>{e.state==="activated"&&(console.debug("Activated new service worker."),n())})})}};var y=class{constructor(e,n="flutter-js"){let t=e||[/\.js$/,/\.mjs$/];window.trustedTypes&&(this.policy=trustedTypes.createPolicy(n,{createScriptURL:function(r){if(r.startsWith("blob:"))return r;let a=new URL(r,window.location),s=a.pathname.split("/").pop();if(t.some(l=>l.test(s)))return a.toString();console.error("URL rejected by TrustedTypes policy",n,":",r,"(download prevented)")}}))}};var k=i=>{let e=WebAssembly.compileStreaming(fetch(i));return(n,t)=>((async()=>{let r=await e,a=await WebAssembly.instantiate(r,n);t(a,r)})(),{})};var U=(i,e,n,t)=>(window.flutterCanvasKitLoaded=(async()=>{if(window.flutterCanvasKit)return window.flutterCanvasKit;let r=n.hasChromiumBreakIterators&&n.hasImageCodecs;if(!r&&e.canvasKitVariant=="chromium")throw"Chromium CanvasKit variant specifically requested, but unsupported in this browser";let a=r&&e.canvasKitVariant!=="full",s=t;e.canvasKitVariant=="experimentalWebParagraph"?s=c(s,"experimental_webparagraph"):a&&(s=c(s,"chromium"));let o=c(s,"canvaskit.js");i.flutterTT.policy&&(o=i.flutterTT.policy.createScriptURL(o));let l=k(c(s,"canvaskit.wasm")),u=await import(o);return window.flutterCanvasKit=await u.default({instantiateWasm:l}),window.flutterCanvasKit})(),window.flutterCanvasKitLoaded);var W=async(i,e,n,t)=>{let a=!n.hasImageCodecs||!n.hasChromiumBreakIterators?"skwasm_heavy":e.enableWimp?"wimp":"skwasm",s=c(t,`${a}.js`),o=s;i.flutterTT.policy&&(o=i.flutterTT.policy.createScriptURL(o));let l=k(c(t,`${a}.wasm`));return await(await import(o)).default({skwasmSingleThreaded:e.enableWimp||!n.crossOriginIsolated||n.isChromeExtension||e.forceSingleThreadedSkwasm,instantiateWasm:l,locateFile:(d,p)=>d.endsWith(".ww.js")?URL.createObjectURL(new Blob([`
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
`],{type:"application/javascript"})):c(t,d),mainScriptUrlOrBlob:s})};var P=w.supportsWasmGC,G=P&&w.webGLVersion>0,b=class{async loadEntrypoint(e){let{serviceWorker:n,...t}=e||{},r=new y,a=new g;a.setTrustedTypesPolicy(r.policy),await a.loadServiceWorker(n).catch(o=>{console.warn("Exception while loading service worker:",o)});let s=new v;return s.setTrustedTypesPolicy(r.policy),this.didCreateEngineInitializer=s.didCreateEngineInitializer.bind(s),s.loadEntrypoint(t)}async load({serviceWorkerSettings:e,onEntrypointLoaded:n,nonce:t,config:r}={}){r??={};let a=_flutter.buildConfig;if(!a)throw"FlutterLoader.load requires _flutter.buildConfig to be set";let s=r.wasmAllowList?.[w.browserEngine]??_[w.browserEngine],o=m=>{switch(m){case"skwasm":return G&&s;default:return!0}},l=m=>m.compileTarget==="dart2wasm"&&!P||r.renderer&&r.renderer!=m.renderer?!1:o(m.renderer),u=a.builds.find(l);if(!u)throw"FlutterLoader could not find a build compatible with configuration and environment.";let d={};d.flutterTT=new y,e&&(d.serviceWorkerLoader=new g,d.serviceWorkerLoader.setTrustedTypesPolicy(d.flutterTT.policy),await d.serviceWorkerLoader.loadServiceWorker(e).catch(m=>{console.warn("Exception while loading service worker:",m)}));let p=E(r,a);u.renderer==="canvaskit"?d.canvasKit=U(d,r,w,p):u.renderer==="skwasm"&&(d.skwasm=W(d,r,w,p));let f=new v;return f.setTrustedTypesPolicy(d.flutterTT.policy),this.didCreateEngineInitializer=f.didCreateEngineInitializer.bind(f),f.load(u,d,r,t,n)}};window._flutter||(window._flutter={});window._flutter.loader||(window._flutter.loader=new b);})();
//# sourceMappingURL=flutter.js.map

if (!window._flutter) {
  window._flutter = {};
}
_flutter.buildConfig = {"engineRevision":"4c525dac5ebe5971c5708ef73558ed8edcf4a362","builds":[{"compileTarget":"dart2js","renderer":"canvaskit","mainJsPath":"main.dart.js?v=202610131207"},{}]};


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
// /canominoes/ it would register canucklegame.ca's ROOT worker. That file's
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
// So on localhost: no fatal-error timeout. (No ad tag either -- localhost is
// not production; see CANUCKLE_PROD below.)
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
    // Production only. window.CANUCKLE_PROD is set by the hostname test at the
    // top of index.html's <head> (true on canucklegame.ca and its subdomains),
    // so the sandbox and localhost never load Yolla and show the coloured
    // placeholder slots instead. Strictly === true: a page without that
    // script must not serve ads by default.
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
    console.error('Canominoes: engine init / runApp failed:', err);
    entrypointHandled = false; // let any other in-flight attempt try
    showFatalError();
  }
}

function startFallbackLoad() {
  if (fallbackStarted) return;
  fallbackStarted = true;
  console.warn('Canominoes: gstatic CanvasKit timed out -- retrying locally.');
  try {
    _flutter.loader.load({
      // RELATIVE, not '/canvaskit/'. This becomes /canominoes/canvaskit/, so
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
    console.error('Canominoes: local-CanvasKit fallback load() threw:', err);
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
  console.error('Canominoes: primary load() threw synchronously:', err);
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
      console.error('Canominoes: CanvasKit never started.');
      showFatalError();
    }
  }, ERROR_TIMEOUT_MS);
}
