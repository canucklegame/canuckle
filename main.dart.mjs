// Compiles a dart2wasm-generated main module from `source` which can then
// be instantiated via the `instantiate` method.
//
// `source` needs to be a `Response` object (or promise thereof) e.g. created
// via the `fetch()` JS API.
export async function compileStreaming(source) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(
      await WebAssembly.compileStreaming(source, builtins), builtins);
}

// Compiles a dart2wasm-generated wasm module from `bytes` which is then
// instantiable via the `instantiate` method.
export async function compile(bytes) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(await WebAssembly.compile(bytes, builtins), builtins);
}

class CompiledApp {
  constructor(module, builtins) {
    this.module = module;
    this.builtins = builtins;
  }

  // The second argument is an options object containing:
  // `loadDeferredModules` is a JS function that takes an array of module names
  //   matching wasm files produced by the dart2wasm compiler. It also takes a
  //   callback that should be invoked for each loaded module with 2 arguments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDeferredId` is a JS function that takes load ID produced by the
  //   compiler when the `use-load-ids` option is passed. Each load ID maps to
  //   one or more wasm files as specified in the emitted JSON file. It also
  //   takes a callback that should be invoked for each loaded module with 2
  //   arguments: (1) the module name, (2) the loaded module in a format
  //   supported by `WebAssembly.compile` or `WebAssembly.compileStreaming`.
  //   The callback returns a Promise that resolves when the module is
  //   instantiated.
  //   loadDeferredId should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  async instantiate(additionalImports, {loadDeferredModules, loadDeferredId} = {}) {
    let dartInstance;

    // Prints to the console
    function printToConsole(value) {
      if (typeof dartPrint == "function") {
        dartPrint(value);
        return;
      }
      if (typeof console == "object" && typeof console.log != "undefined") {
        console.log(value);
        return;
      }
      if (typeof print == "function") {
        print(value);
        return;
      }

      throw "Unable to print message: " + value;
    }

    // A special symbol attached to functions that wrap Dart functions.
    const jsWrappedDartFunctionSymbol = Symbol("JSWrappedDartFunction");

    function finalizeWrapper(dartFunction, wrapped) {
      wrapped.dartFunction = dartFunction;
      wrapped[jsWrappedDartFunctionSymbol] = true;
      return wrapped;
    }

    // Imports
    const dart2wasm = {
            AB: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      AC: Function.prototype.call.bind(DataView.prototype.setInt16),
      AD: x0 => x0.height,
      AE: (x0,x1) => x0.observe(x1),
      AF: x0 => x0.wheelDeltaY,
      AG: x0 => x0.first(),
      AH: x0 => x0.maxWidth,
      AI: (x0,x1) => x0.vibrate(x1),
      AJ: x0 => x0.image,
      AK: x0 => x0.localStorage,
      AL: x0 => globalThis.firebase_firestore.persistentLocalCache(x0),
      AM: (x0,x1,x2,x3,x4,x5,x6) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4,x5,x6),
      B: s => printToConsole(s),
      BB: b => !!b,
      BC: Function.prototype.call.bind(DataView.prototype.setUint16),
      BD: x0 => x0.width,
      BE: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      BF: x0 => x0.wheelDeltaX,
      BG: x0 => x0.next(),
      BH: x0 => x0.minHeight,
      BI: x0 => x0.content,
      BJ: () => globalThis.window.ImageDecoder,
      BK: (x0,x1) => x0.key(x1),
      BL: (x0,x1,x2,x3) => ({ignoreUndefinedProperties: x0,experimentalForceLongPolling: x1,experimentalAutoDetectLongPolling: x2,localCache: x3}),
      BM: (x0,x1,x2,x3,x4,x5,x6,x7) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4,x5,x6,x7),
      C: Function.prototype.call.bind(Number.prototype.toString),
      CB: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      CC: Function.prototype.call.bind(DataView.prototype.setUint8),
      CD: x0 => x0.screen,
      CE: x0 => new ResizeObserver(x0),
      CF: x0 => x0.key,
      CG: x0 => x0.current(),
      CH: x0 => x0.minWidth,
      CI: x0 => x0.document,
      CJ: (o, p) => p in o,
      CK: x0 => x0.length,
      CL: x0 => x0.fromCache,
      CM: (x0,x1,x2,x3,x4,x5,x6,x7,x8) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4,x5,x6,x7,x8),
      D: Function.prototype.call.bind(BigInt.prototype.toString),
      DB: (x0,x1) => x0.focus(x1),
      DC: Function.prototype.call.bind(DataView.prototype.setInt8),
      DD: o => {
        if (o === null || o === undefined) return 0;
        if (typeof(o) === 'string') return 1;
        return 2;
      },
      DE: (x0,x1) => x0.getPropertyValue(x1),
      DF: x0 => x0.identifier,
      DG: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      DH: (x0,x1) => x0.removeProperty(x1),
      DI: x0 => new WeakRef(x0),
      DJ: x0 => x0.groups,
      DK: (x0,x1) => x0.removeItem(x1),
      DL: x0 => x0.hasPendingWrites,
      DM: (x0,x1,x2,x3,x4,x5,x6,x7,x8,x9) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4,x5,x6,x7,x8,x9),
      E: (exn) => {
        let stackString = exn.toString();
        let frames = stackString.split('\n');
        let drop = 4;
        if (frames[0].startsWith('Error')) {
            drop += 1;
        }
        return frames.slice(drop).join('\n');
      },
      EB: () => ({}),
      EC: Function.prototype.call.bind(DataView.prototype.getInt8),
      ED: x0 => x0.tabIndex,
      EE: x0 => globalThis.parseFloat(x0),
      EF: x0 => x0.touches,
      EG: x0 => x0.v8BreakIterator,
      EH: (x0,x1) => x0.add(x1),
      EI: x0 => x0.deref(),
      EJ: (x0,x1) => x0.assign(x1),
      EK: (x0,x1,x2) => x0.setItem(x1,x2),
      EL: x0 => x0.metadata,
      EM: () => globalThis.firebase_firestore.documentId(),
      F: () => new Error().stack,
      FB: (o, p, v) => o[p] = v,
      FC: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int8Array) return 1;
        return 2;
      },
      FD: (x0,x1) => x0.contains(x1),
      FE: (x0,x1) => x0.getComputedStyle(x1),
      FF: x0 => x0.pressure,
      FG: () => globalThis.Intl,
      FH: x0 => x0.data,
      FI: () => globalThis.WeakRef,
      FJ: x0 => x0.location,
      FK: () => globalThis.removeSplashFromWeb(),
      FL: x0 => ({serverTimestamps: x0}),
      FM: (x0,x1) => new firebase_firestore.GeoPoint(x0,x1),
      G: s => JSON.stringify(s),
      GB: () => [],
      GC: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      GD: x0 => x0.activeElement,
      GE: x0 => x0.documentElement,
      GF: x0 => x0.tiltY,
      GG: (x0,x1) => x0.segment(x1),
      GH: (x0,x1) => { x0.scrollTop = x1 },
      GI: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      GJ: () => globalThis.window,
      GK: x0 => x0.measurementId,
      GL: x0 => x0.metadata,
      GM: x0 => globalThis.firebase_firestore.vector(x0),
      H: Function.prototype.call.bind(Number.prototype.toString),
      HB: (a, i) => a.push(i),
      HC: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      HD: x0 => x0.parentNode,
      HE: x0 => x0.computedStyleMap(),
      HF: x0 => x0.tiltX,
      HG: x0 => x0.index,
      HH: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      HI: x0 => x0.abort(),
      HJ: x0 => x0.reload(),
      HK: x0 => x0.appId,
      HL: x0 => x0.toArray(),
      HM: x0 => globalThis.firebase_firestore.Bytes.fromUint8Array(x0),
      I: Function.prototype.call.bind(String.prototype.indexOf),
      IB: x0 => new Int8Array(x0),
      IC: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      ID: x0 => x0.tagName,
      IE: (x0,x1) => x0.get(x1),
      IF: x0 => x0.pointerType,
      IG: x0 => x0.next(),
      IH: (x0,x1) => { x0.value = x1 },
      II: () => new AbortController(),
      IJ: x0 => ({text: x0}),
      IK: x0 => x0.messagingSenderId,
      IL: x0 => x0.toUint8Array(),
      IM: (x0,x1) => globalThis.firebase_firestore.doc(x0,x1),
      J: (s, p, i) => s.lastIndexOf(p, i),
      JB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI8ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      JC: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      JD: x0 => x0.target,
      JE: (o, p) => p in o,
      JF: x0 => x0.pointerId,
      JG: x0 => x0.value,
      JH: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      JI: (x0,x1,x2,x3,x4,x5) => ({method: x0,headers: x1,body: x2,credentials: x3,redirect: x4,signal: x5}),
      JJ: (x0,x1) => x0.share(x1),
      JK: x0 => x0.authDomain,
      JL: () => globalThis.firebase_firestore.Bytes,
      JM: () => globalThis.firebase_firestore.updateDoc,
      K: o => o,
      KB: x0 => new Uint8Array(x0),
      KC: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      KD: x0 => x0.clientY,
      KE: (x0,x1) => { x0.textContent = x1 },
      KF: x0 => x0.getCoalescedEvents(),
      KG: x0 => x0.done,
      KH: (x0,x1) => { x0.value = x1 },
      KI: (x0,x1) => globalThis.fetch(x0,x1),
      KJ: x0 => x0.navigator,
      KK: x0 => x0.projectId,
      KL: () => globalThis.firebase_firestore.VectorValue,
      KM: (x0,x1,x2) => globalThis.firebase_firestore.setDoc(x0,x1,x2),
      L: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'number') return 1;
        return 2;
      },
      LB: x0 => new Uint8ClampedArray(x0),
      LC: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      LD: x0 => x0.clientX,
      LE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      LF: (x0,x1) => x0.getModifierState(x1),
      LG: (o, m, a) => o[m].apply(o, a),
      LH: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      LI: (x0,x1) => x0.get(x1),
      LJ: (x0,x1) => x0.matchMedia(x1),
      LK: x0 => x0.name,
      LL: x0 => x0.longitude,
      LM: (x0,x1) => globalThis.firebase_firestore.setDoc(x0,x1),
      M: x0 => x0.index,
      MB: x0 => new Int16Array(x0),
      MC: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      MD: (x0,x1,x2) => x0.setAttribute(x1,x2),
      ME: x0 => x0.matches,
      MF: s => s.trimLeft(),
      MG: x0 => x0.iterator,
      MH: x0 => x0.value,
      MI: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2) { return wasmFunction(f,arguments.length,x0,x1,x2) }),
      MJ: x0 => x0.matches,
      MK: x0 => x0.message,
      ML: x0 => x0.latitude,
      MM: x0 => ({merge: x0}),
      N: o => String(o),
      NB: x0 => new Uint16Array(x0),
      NC: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      ND: x0 => x0.getBoundingClientRect(),
      NE: (x0,x1) => x0.matchMedia(x1),
      NF: s => s.toUpperCase(),
      NG: () => globalThis.Symbol,
      NH: x0 => x0.selectionDirection,
      NI: (x0,x1) => x0.forEach(x1),
      NJ: (o, t) => typeof o === t,
      NK: x0 => x0.code,
      NL: () => globalThis.firebase_firestore.GeoPoint,
      NM: x0 => globalThis.firebase_firestore.getDoc(x0),
      O: o => o === undefined,
      OB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI16ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      OC: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      OD: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      OE: x0 => x0.matches,
      OF: x0 => x0.pop(),
      OG: (x0,x1) => new Intl.Segmenter(x0,x1),
      OH: x0 => x0.selectionStart,
      OI: x0 => x0.name,
      OJ: () => globalThis.arenaNextUp,
      OK: x0 => x0.name,
      OL: (x0,x1) => x0.data(x1),
      OM: x0 => globalThis.firebase_firestore.getDocFromServer(x0),
      P: (x0,x1) => x0.exec(x1),
      PB: x0 => new Int32Array(x0),
      PC: (x0,x1) => x0.querySelector(x1),
      PD: s => new Date(s * 1000).getTimezoneOffset() * 60,
      PE: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      PF: x0 => x0.flags,
      PG: x0 => x0.Segmenter,
      PH: x0 => x0.selectionEnd,
      PI: x0 => x0.statusText,
      PJ: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      PK: (x0,x1,x2,x3,x4,x5,x6,x7) => ({apiKey: x0,authDomain: x1,databaseURL: x2,projectId: x3,storageBucket: x4,messagingSenderId: x5,measurementId: x6,appId: x7}),
      PL: x0 => x0.nanoseconds,
      PM: x0 => globalThis.firebase_firestore.getDocFromCache(x0),
      Q: (x0,x1) => { x0.lastIndex = x1 },
      QB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      QC: (x0,x1) => x0.item(x1),
      QD: Date.now,
      QE: f => f.dartFunction,
      QF: (a, s) => a.join(s),
      QG: x0 => x0.buffer,
      QH: x0 => x0.value,
      QI: x0 => x0.url,
      QJ: (a, s, e) => a.slice(s, e),
      QK: (x0,x1) => globalThis.firebase_core.initializeApp(x0,x1),
      QL: x0 => x0.seconds,
      QM: x0 => x0.path,
      R: o => o,
      RB: x0 => new Uint32Array(x0),
      RC: x0 => x0.length,
      RD: (handle) => clearTimeout(handle),
      RE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      RF: (x0,x1) => x0.error(x1),
      RG: x0 => x0.wasmMemory,
      RH: x0 => x0.selectionDirection,
      RI: x0 => x0.status,
      RJ: (x0,x1,x2) => x0.insertBefore(x1,x2),
      RK: x0 => globalThis.firebase_core.initializeApp(x0),
      RL: () => globalThis.firebase_firestore.Timestamp,
      RM: (x0,x1) => globalThis.firebase_firestore.collection(x0,x1),
      S: (s, m) => {
        try {
          return new RegExp(s, m);
        } catch (e) {
          return String(e);
        }
      },
      SB: x0 => new Float32Array(x0),
      SC: (x0,x1) => x0.querySelectorAll(x1),
      SD: (x0,x1) => x0.closest(x1),
      SE: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      SF: () => globalThis.console,
      SG: () => globalThis.window._flutter_skwasmInstance,
      SH: x0 => x0.selectionStart,
      SI: x0 => x0.cancel(),
      SJ: x0 => x0.id,
      SK: x0 => x0.storageBucket,
      SL: () => globalThis.firebase_firestore.DocumentReference,
      SM: (x0,x1,x2) => globalThis.firebase_firestore.initializeFirestore(x0,x1,x2),
      T: o => o instanceof RegExp,
      TB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      TC: (x0,x1) => x0.getAttribute(x1),
      TD: x0 => x0.bottom,
      TE: (p, s, f) => p.then(s, (e) => f(e, e === undefined)),
      TF: s => s.trimRight(),
      TG: () => new TextDecoder(),
      TH: x0 => x0.selectionEnd,
      TI: x0 => x0.getReader(),
      TJ: x0 => x0.offsetHeight,
      TK: x0 => x0.databaseURL,
      TL: x0 => x0.path,
      TM: (x0,x1) => globalThis.firebase_firestore.getFirestore(x0,x1),
      U: (string, times) => string.repeat(times),
      UB: x0 => new Float64Array(x0),
      UC: x0 => x0.remove(),
      UD: x0 => x0.top,
      UE: (o, i) => o[i],
      UF: x0 => x0.blur(),
      UG: (a, i) => a.splice(i, 1),
      UH: x0 => x0.keyCode,
      UI: x0 => x0.read(),
      UJ: x0 => x0.offsetWidth,
      UK: x0 => x0.apiKey,
      UL: x0 => x0.ref,
      UM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      V: o => o,
      VB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF64ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      VC: (x0,x1) => x0.appendChild(x1),
      VD: x0 => x0.right,
      VE: o => o.length,
      VF: x0 => x0.button,
      VG: a => a.pop(),
      VH: (x0,x1) => x0.scrollIntoView(x1),
      VI: x0 => x0.value,
      VJ: x0 => x0.stopPropagation(),
      VK: x0 => x0.options,
      VL: x0 => x0.doc,
      VM: x0 => ({maxAttempts: x0}),
      W: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'boolean') return 1;
        return 2;
      },
      WB: x0 => new ArrayBuffer(x0),
      WC: (x0,x1) => x0.append(x1),
      WD: x0 => x0.left,
      WE: o => {
        if (o === undefined) return 1;
        var type = typeof o;
        if (type === 'boolean') return 2;
        if (type === 'number') return 3;
        if (type === 'string') return 4;
        if (o instanceof Array) return 5;
        if (ArrayBuffer.isView(o)) {
          if (o instanceof Int8Array) return 6;
          if (o instanceof Uint8Array) return 7;
          if (o instanceof Uint8ClampedArray) return 8;
          if (o instanceof Int16Array) return 9;
          if (o instanceof Uint16Array) return 10;
          if (o instanceof Int32Array) return 11;
          if (o instanceof Uint32Array) return 12;
          if (o instanceof Float32Array) return 13;
          if (o instanceof Float64Array) return 14;
          if (o instanceof DataView) return 15;
        }
        if (o instanceof ArrayBuffer) return 16;
        // Feature check for `SharedArrayBuffer` before doing a type-check.
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
            return 17;
        }
        if (o instanceof Promise) return 18;
        return 19;
      },
      WF: x0 => x0.innerHeight,
      WG: (map, o, v) => map.set(o, v),
      WH: x0 => x0.multiViewEnabled,
      WI: x0 => x0.done,
      WJ: x0 => x0.disabled,
      WK: x0 => globalThis.firebase_core.getApp(x0),
      WL: x0 => x0.newIndex,
      WM: (x0,x1,x2) => globalThis.firebase_firestore.runTransaction(x0,x1,x2),
      X: x0 => x0.dotAll,
      XB: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      XC: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      XD: x0 => x0.clientY,
      XE: x0 => x0.language,
      XF: x0 => x0.innerWidth,
      XG: (map, o) => map.get(o),
      XH: (x0,x1) => x0.replaceWith(x1),
      XI: x0 => x0.body,
      XJ: (x0,x1) => { x0.min = x1 },
      XK: () => globalThis.firebase_core.getApp(),
      XL: x0 => x0.oldIndex,
      XM: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      Y: x0 => x0.unicode,
      YB: (x0,x1,x2) => new DataView(x0,x1,x2),
      YC: x0 => x0.style,
      YD: x0 => x0.clientX,
      YE: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      YF: x0 => x0.height,
      YG: () => new WeakMap(),
      YH: (x0,x1) => { x0.type = x1 },
      YI: x0 => x0.headers,
      YJ: (x0,x1) => { x0.max = x1 },
      YK: () => globalThis.firebase_core.SDK_VERSION,
      YL: x0 => x0.type,
      YM: (o,s,v) => o[s] = v,
      Z: x0 => x0.ignoreCase,
      ZB: (o, p) => o[p],
      ZC: x0 => x0.debugShowSemanticsNodes,
      ZD: x0 => x0.changedTouches,
      ZE: () => globalThis.window.FinalizationRegistry,
      ZF: x0 => x0.width,
      ZG: x0 => x0.debugSkipFontRetryDelay,
      ZH: (x0,x1) => { x0.className = x1 },
      ZI: x0 => x0.signal,
      ZJ: (x0,x1) => { x0.disabled = x1 },
      ZK: (x0,x1,x2) => globalThis.firebase_core.registerVersion(x0,x1,x2),
      ZL: x0 => x0.docChanges(),
      ZM: () => Symbol("jsBoxedDartObjectProperty"),
      a: x0 => x0.multiline,
      aB: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      aC: (x0,x1) => x0.warn(x1),
      aD: x0 => x0.offsetY,
      aE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      aF: x0 => x0.clientHeight,
      aG: x0 => x0.status,
      aH: (x0,x1) => { x0.tabIndex = x1 },
      aI: (x0,x1) => x0.revokeObjectURL(x1),
      aJ: (x0,x1) => { x0.scrollLeft = x1 },
      aK: x0 => x0.sessionStorage,
      aL: x0 => x0.docs,
      aM: (x0,x1) => x0.get(x1),
      b: (exn) => {
        if (exn instanceof Error) {
          return exn.stack;
        } else {
          return null;
        }
      },
      bB: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      bC: x0 => x0.console,
      bD: x0 => x0.offsetX,
      bE: x0 => new window.FinalizationRegistry(x0),
      bF: x0 => x0.clientWidth,
      bG: (x0,x1,x2) => x0.set(x1,x2),
      bH: (x0,x1) => { x0.name = x1 },
      bI: (x0,x1) => { x0.src = x1 },
      bJ: (x0,x1) => { x0.spellcheck = x1 },
      bK: (x0,x1) => x0.createElement(x1),
      bL: x0 => globalThis.firebase_firestore.getDocs(x0),
      bM: (x0,x1,x2) => x0.set(x1,x2),
      c: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      cB: o => o.byteOffset,
      cC: () => globalThis.window,
      cD: x0 => x0.type,
      cE: (x0,x1) => x0.unregister(x1),
      cF: (x0,x1) => { x0.content = x1 },
      cG: x0 => x0.arrayBuffer(),
      cH: (x0,x1) => { x0.placeholder = x1 },
      cI: (x0,x1,x2,x3,x4) => globalThis.createImageBitmap(x0,x1,x2,x3,x4),
      cJ: (x0,x1) => { x0.disabled = x1 },
      cK: (x0,x1) => x0.debug(x1),
      cL: x0 => globalThis.firebase_firestore.getDocsFromServer(x0),
      cM: x0 => x0.length,
      d: (x0,x1) => x0.didCreateEngineInitializer(x1),
      dB: o => o.buffer,
      dC: (o, c) => o instanceof c,
      dD: x0 => x0.maxTouchPoints,
      dE: (x0,x1) => x0.contains(x1),
      dF: (x0,x1) => { x0.name = x1 },
      dG: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof ArrayBuffer) return 1;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 2;
        }
        return 3;
      },
      dH: (x0,x1) => { x0.autocomplete = x1 },
      dI: x0 => x0.naturalHeight,
      dJ: (x0,x1) => x0.transferFromImageBitmap(x1),
      dK: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      dL: x0 => globalThis.firebase_firestore.getDocsFromCache(x0),
      dM: x0 => x0.getReader(),
      e: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      eB: Function.prototype.call.bind(DataView.prototype.getUint8),
      eC: (x0,x1) => x0[x1],
      eD: x0 => x0.platform,
      eE: (s) => +s,
      eF: x0 => x0.head,
      eG: (x0,x1) => x0.fetch(x1),
      eH: (x0,x1) => { x0.name = x1 },
      eI: x0 => x0.naturalWidth,
      eJ: (x0,x1) => x0.getContext(x1),
      eK: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      eL: x0 => x0.source,
      eM: x0 => x0.value,
      f: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      fB: (b, o) => new DataView(b, o),
      fC: x0 => x0.length,
      fD: x0 => x0.body,
      fE: s => {
        if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(s)) {
          return NaN;
        }
        return parseFloat(s);
      },
      fF: (x0,x1) => x0.removeChild(x1),
      fG: x0 => x0.fontFallbackBaseUrl,
      fH: (x0,x1) => { x0.placeholder = x1 },
      fI: x0 => x0.decode(),
      fJ: (x0,x1) => { x0.height = x1 },
      fK: (x0,x1) => ({createScript: x0,createScriptURL: x1}),
      fL: x0 => ({source: x0}),
      fM: x0 => x0.done,
      g: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      gB: (b, o, l) => new DataView(b, o, l),
      gC: (string, token) => string.split(token),
      gD: () => globalThis.document,
      gE: s => s.trim(),
      gF: x0 => x0.firstChild,
      gG: (handle) => clearInterval(handle),
      gH: (x0,x1) => { x0.action = x1 },
      gI: (x0,x1) => { x0.decoding = x1 },
      gJ: (x0,x1) => { x0.width = x1 },
      gK: (x0,x1,x2) => x0.createPolicy(x1,x2),
      gL: (x0,x1,x2) => globalThis.firebase_firestore.where(x0,x1,x2),
      gM: x0 => x0.read(),
      h: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      hB: Function.prototype.call.bind(DataView.prototype.getFloat64),
      hC: o => o instanceof Array,
      hD: (x0,x1,x2) => x0.addEventListener(x1,x2),
      hE: x0 => x0.classList,
      hF: x0 => x0.viewConstraints,
      hG: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      hH: (x0,x1) => { x0.method = x1 },
      hI: (x0,x1) => { x0.crossOrigin = x1 },
      hJ: x0 => x0.height,
      hK: (x0,x1) => x0.createScriptURL(x1),
      hL: (x0,x1) => globalThis.firebase_firestore.query(x0,x1),
      hM: x0 => x0.body,
      i: x0 => new Promise(x0),
      iB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float64Array) return 1;
        return 2;
      },
      iC: (a, i) => a[i],
      iD: x0 => x0.hasFocus(),
      iE: x0 => x0.preventDefault(),
      iF: x0 => x0.hostElement,
      iG: () => Date.now(),
      iH: (x0,x1) => { x0.noValidate = x1 },
      iI: (x0,x1) => x0.createObjectURL(x1),
      iJ: x0 => x0.width,
      iK: (x0,x1,x2) => x0.createScript(x1,x2),
      iL: (x0,x1) => new firebase_firestore.Timestamp(x0,x1),
      iM: (x0,x1) => new OffscreenCanvas(x0,x1),
      j: (x0,x1,x2) => x0.call(x1,x2),
      jB: Function.prototype.call.bind(DataView.prototype.setFloat64),
      jC: a => a.length,
      jD: x0 => x0.relatedTarget,
      jE: x0 => x0.parent,
      jF: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      jG: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      jH: (x0,x1) => x0.removeAttribute(x1),
      jI: x0 => x0.URL,
      jJ: x0 => x0.rasterEndMilliseconds,
      jK: (x0,x1) => x0.appendChild(x1),
      jL: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      jM: x0 => x0.assetBase,
      k: (constructor, args) => {
        const factoryFunction = constructor.bind.apply(
            constructor, [null, ...args]);
        return new factoryFunction();
      },
      kB: (t, s) => t.set(s),
      kC: (x0,x1) => x0.test(x1),
      kD: x0 => x0.shiftKey,
      kE: x0 => x0.timeStamp,
      kF: x0 => ({runApp: x0}),
      kG: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      kH: x0 => x0.isConnected,
      kI: x0 => new Blob(x0),
      kJ: x0 => x0.rasterStartMilliseconds,
      kK: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      kL: x0 => globalThis.firebase_firestore.increment(x0),
      kM: x0 => x0.loader,
      l: x0 => new Array(x0),
      lB: Function.prototype.call.bind(DataView.prototype.setFloat32),
      lC: x0 => x0.userAgent,
      lD: (decoder, codeUnits) => decoder.decode(codeUnits),
      lE: (x0,x1) => x0.hasAttribute(x1),
      lF: x0 => x0.baseURI,
      lG: x0 => x0.history,
      lH: x0 => x0.click(),
      lI: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      lJ: x0 => x0.imageBitmaps,
      lK: (o, p) => delete o[p],
      lL: () => globalThis.firebase_firestore.and,
      lM: () => globalThis._flutter,
      m: o => [o],
      mB: Function.prototype.call.bind(DataView.prototype.getFloat32),
      mC: x0 => x0.navigator,
      mD: () => new TextDecoder("utf-8", {fatal: true}),
      mE: x0 => x0.buttons,
      mF: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      mG: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      mH: (x0,x1) => x0.getElementsByClassName(x1),
      mI: x0 => new window.ImageDecoder(x0),
      mJ: x0 => x0.canvasKitMaximumSurfaces,
      mK: (o, p, v) => o[p] = v,
      mL: () => globalThis.firebase_firestore.or,
      n: (o0, o1) => [o0, o1],
      nB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float32Array) return 1;
        return 2;
      },
      nC: Function.prototype.call.bind(String.prototype.toLowerCase),
      nD: () => new TextDecoder("utf-8", {fatal: false}),
      nE: x0 => x0.ctrlKey,
      nF: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      nG: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      nH: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      nI: x0 => x0.name,
      nJ: x0 => x0.hostElement,
      nK: (x0,x1) => { x0.text = x1 },
      nL: x0 => globalThis.firebase_firestore.limitToLast(x0),
      o: (o0, o1, o2) => [o0, o1, o2],
      oB: Function.prototype.call.bind(DataView.prototype.getUint32),
      oC: Object.is,
      oD: (a, i, v) => a[i] = v,
      oE: x0 => x0.y,
      oF: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      oG: o => Object.keys(o),
      oH: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      oI: x0 => x0.repetitionCount,
      oJ: x0 => x0.location,
      oK: x0 => x0.head,
      oL: x0 => globalThis.firebase_firestore.limit(x0),
      p: (o0, o1, o2, o3) => [o0, o1, o2, o3],
      pB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint32Array) return 1;
        return 2;
      },
      pC: x0 => x0.vendor,
      pD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI8ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      pE: x0 => x0.x,
      pF: () => typeof dartUseDateNowForTicks !== "undefined",
      pG: x0 => x0.state,
      pH: (x0,x1) => x0.dispatchEvent(x1),
      pI: x0 => x0.frameCount,
      pJ: (x0,x1) => x0.getModifierState(x1),
      pK: (x0,x1) => { x0.text = x1 },
      pL: () => globalThis.firebase_firestore.endBefore,
      q: (x0,x1,x2) => { x0[x1] = x2 },
      qB: Function.prototype.call.bind(DataView.prototype.getInt32),
      qC: (x0,x1) => x0.createTextNode(x1),
      qD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI16ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      qE: x0 => x0.scrollTop,
      qF: () => Date.now(),
      qG: x0 => x0.search,
      qH: (x0,x1) => x0.createEvent(x1),
      qI: x0 => x0.selectedTrack,
      qJ: x0 => x0.metaKey,
      qK: x0 => x0.trustedTypes,
      qL: () => globalThis.firebase_firestore.endAt,
      r: (o, p) => o[p],
      rB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int32Array) return 1;
        return 2;
      },
      rC: (x0,x1) => { x0.id = x1 },
      rD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      rE: x0 => x0.offsetTop,
      rF: () => 1000 * performance.now(),
      rG: x0 => x0.location,
      rH: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      rI: x0 => x0.completed,
      rJ: x0 => x0.altKey,
      rK: () => globalThis.console,
      rL: () => globalThis.firebase_firestore.startAfter,
      s: () => globalThis,
      sB: o => o instanceof Uint16Array,
      sC: (x0,x1) => { x0.nonce = x1 },
      sD: x0 => x0.visibilityState,
      sE: x0 => x0.scrollLeft,
      sF: (x0,x1) => x0.requestAnimationFrame(x1),
      sG: x0 => x0.pathname,
      sH: x0 => x0.readText(),
      sI: x0 => x0.ready,
      sJ: x0 => x0.ctrlKey,
      sK: x0 => x0.trustedTypes,
      sL: () => globalThis.firebase_firestore.startAt,
      t: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      tB: Function.prototype.call.bind(DataView.prototype.getUint16),
      tC: x0 => x0.nonce,
      tD: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      tE: x0 => x0.offsetLeft,
      tF: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      tG: x0 => x0.state,
      tH: x0 => x0.clipboard,
      tI: x0 => x0.tracks,
      tJ: x0 => x0.isComposing,
      tK: (x0,x1) => { x0.crossOrigin = x1 },
      tL: (x0,x1) => globalThis.firebase_firestore.orderBy(x0,x1),
      u: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      uB: o => o instanceof Int16Array,
      uC: () => globalThis.window.flutterConfiguration,
      uD: x0 => x0.disconnect(),
      uE: x0 => x0.offsetParent,
      uF: x0 => x0.now(),
      uG: (x0,x1) => x0.go(x1),
      uH: (x0,x1) => x0.writeText(x1),
      uI: x0 => x0.close(),
      uJ: x0 => x0.code,
      uK: (x0,x1) => { x0.type = x1 },
      uL: x0 => new firebase_firestore.FieldPath(x0),
      v: (x0,x1) => ({addView: x0,removeView: x1}),
      vB: Function.prototype.call.bind(DataView.prototype.getInt16),
      vC: (x0,x1) => x0.attachShadow(x1),
      vD: x0 => new Intl.Locale(x0),
      vE: (o, p, r) => o.replace(p, () => r),
      vF: x0 => x0.performance,
      vG: x0 => x0.hash,
      vH: x0 => x0.unlock(),
      vI: (x0,x1) => ({frameIndex: x0,completeFramesOnly: x1}),
      vJ: x0 => x0.repeat,
      vK: () => globalThis.document,
      vL: (x0,x1) => new firebase_firestore.FieldPath(x0,x1),
      w: (l, r) => l === r,
      wB: o => o instanceof Uint8ClampedArray,
      wC: (x0,x1) => x0.createElement(x1),
      wD: x0 => x0.region,
      wE: (o, p, r) => o.replaceAll(p, () => r),
      wF: x0 => new Uint8Array(x0),
      wG: x0 => x0.parentElement,
      wH: (x0,x1) => x0.lock(x1),
      wI: (x0,x1) => x0.decode(x1),
      wJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      wK: (x0,x1,x2,x3) => globalThis.firebase_analytics.logEvent(x0,x1,x2,x3),
      wL: (x0,x1,x2) => new firebase_firestore.FieldPath(x0,x1,x2),
      x: x0 => x0.random(),
      xB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint8Array) return 1;
        return 2;
      },
      xC: x0 => x0.scale,
      xD: x0 => x0.script,
      xE: x0 => x0.deltaMode,
      xF: (x0,x1,x2) => x0.slice(x1,x2),
      xG: (x0,x1) => x0.querySelectorAll(x1),
      xH: x0 => x0.orientation,
      xI: x0 => x0.displayHeight,
      xJ: x0 => x0.userAgent,
      xK: (x0,x1) => globalThis.firebase_analytics.initializeAnalytics(x0,x1),
      xL: (x0,x1,x2,x3) => new firebase_firestore.FieldPath(x0,x1,x2,x3),
      y: () => globalThis.Math,
      yB: Function.prototype.call.bind(DataView.prototype.setInt32),
      yC: x0 => x0.visualViewport,
      yD: x0 => x0.language,
      yE: x0 => x0.deltaY,
      yF: (x0,x1) => x0.decode(x1),
      yG: (d, digits) => d.toFixed(digits),
      yH: (x0,x1) => x0.querySelector(x1),
      yI: x0 => x0.displayWidth,
      yJ: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      yK: x0 => globalThis.firebase_firestore.memoryLocalCache(x0),
      yL: (x0,x1,x2,x3,x4) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4),
      z: (x0,x1) => x0.prepend(x1),
      zB: Function.prototype.call.bind(DataView.prototype.setUint32),
      zC: x0 => x0.devicePixelRatio,
      zD: x0 => x0.languages,
      zE: x0 => x0.deltaX,
      zF: (x0,x1) => x0.adoptText(x1),
      zG: x0 => x0.maxHeight,
      zH: (x0,x1) => { x0.title = x1 },
      zI: x0 => x0.duration,
      zJ: (x0,x1) => x0.getItem(x1),
      zK: x0 => ({cacheSizeBytes: x0}),
      zL: (x0,x1,x2,x3,x4,x5) => new firebase_firestore.FieldPath(x0,x1,x2,x3,x4,x5),

    };

    const baseImports = {
      _: dart2wasm,
      Math: Math,
      Date: Date,
      Object: Object,
      Array: Array,
      Reflect: Reflect,
      WebAssembly: {
        JSTag: WebAssembly.JSTag,
      },
      "": new Proxy({}, { get(_, prop) { return prop; } }),

    };

    const jsStringPolyfill = {
      "charCodeAt": (s, i) => s.charCodeAt(i),
      "compare": (s1, s2) => {
        if (s1 < s2) return -1;
        if (s1 > s2) return 1;
        return 0;
      },
      "concat": (s1, s2) => s1 + s2,
      "equals": (s1, s2) => s1 === s2,
      "fromCharCode": (i) => String.fromCharCode(i),
      "length": (s) => s.length,
      "substring": (s, a, b) => s.substring(a, b),
      "fromCharCodeArray": (a, start, end) => {
        if (end <= start) return '';

        const read = dartInstance.exports.$wasmI16ArrayGet;
        let result = '';
        let index = start;
        const chunkLength = Math.min(end - index, 500);
        let array = new Array(chunkLength);
        while (index < end) {
          const newChunkLength = Math.min(end - index, 500);
          for (let i = 0; i < newChunkLength; i++) {
            array[i] = read(a, index++);
          }
          if (newChunkLength < chunkLength) {
            array = array.slice(0, newChunkLength);
          }
          result += String.fromCharCode(...array);
        }
        return result;
      },
      "intoCharCodeArray": (s, a, start) => {
        if (s === '') return 0;

        const write = dartInstance.exports.$wasmI16ArraySet;
        for (var i = 0; i < s.length; ++i) {
          write(a, start++, s.charCodeAt(i));
        }
        return s.length;
      },
      "test": (s) => typeof s == "string",
    };


    

    dartInstance = await WebAssembly.instantiate(this.module, {
      ...baseImports,
      ...additionalImports,
      
      "wasm:js-string": jsStringPolyfill,
    });

    return new InstantiatedApp(this, dartInstance);
  }
}

class InstantiatedApp {
  constructor(compiledApp, instantiatedModule) {
    this.compiledApp = compiledApp;
    this.instantiatedModule = instantiatedModule;
  }

  // Call the main function with the given arguments.
  invokeMain(...args) {
    this.instantiatedModule.exports.$invokeMain(args);
  }
}
