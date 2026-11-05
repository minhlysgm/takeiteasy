// Node 26 ships a native experimental global `localStorage`. Vitest's jsdom
// environment copies jsdom's window properties onto the global object, but
// its populateGlobal() only copies keys that are either explicitly
// allow-listed or not already present on `global` -- and "localStorage"
// already exists (as Node's native, non-functional stub), so jsdom's real
// localStorage never gets copied over. Because populateGlobal also does
// `global.window = global`, the `window` global is globalThis itself, so
// `window.localStorage` resolves to that same broken native value -- it is
// NOT a route to jsdom's real per-file window.
//
// Vitest does, however, stash the actual per-file JSDOM instance at
// `globalThis.jsdom` for the duration of the test file (see
// vitest/dist/chunks/index.*.js, the jsdom environment's setup()). We read
// its real `.window.localStorage` and rebind the global to it so tests use
// one consistent, working Storage implementation.
const jsdomInstance = (globalThis as unknown as { jsdom?: { window: Window } })
  .jsdom;

if (!jsdomInstance?.window?.localStorage) {
  throw new Error(
    "vitest.setup.ts: expected globalThis.jsdom.window.localStorage to be " +
      "available from the jsdom test environment, but it was not found. " +
      "This setup relies on an internal vitest implementation detail; if " +
      "vitest's jsdom environment changed how it exposes the per-file DOM, " +
      "this needs to be revisited.",
  );
}

Object.defineProperty(globalThis, "localStorage", {
  value: jsdomInstance.window.localStorage,
  configurable: true,
  writable: true,
});

// jsdom không có scrollTo/scrollBy (in "Not implemented" ra log): thay bằng hàm rỗng.
window.scrollTo = () => {};
window.scrollBy = () => {};
