/* The one service worker this origin registers, at scope "/".
 *
 * Two things share it, and the order matters:
 *
 *   1. OneSignal's SDK worker, which owns push. The file has to keep this exact
 *      name and location because the v16 page SDK registers it by convention —
 *      renaming it, or registering an app worker of our own alongside it, would
 *      replace the registration and silently kill push delivery.
 *   2. Our own caching/offline logic, imported below.
 *
 * The OneSignal import is guarded: it is fetched from their CDN, and a worker
 * whose top-level throws never installs. Without the try/catch a CDN blip — or
 * simply running this app with no OneSignal credentials, which is the dev and
 * demo case — would take offline support down with it.
 *
 * Load order is deliberate. sw-core.js registers a `fetch` handler; OneSignal's
 * worker registers `push`/`notificationclick`. They do not overlap, but core is
 * imported second so that if the CDN script is slow to parse it cannot prevent
 * ours from being registered.
 */
try {
  importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
} catch {
  // No push on this install. Caching and offline below still work.
}

importScripts("/sw-core.js");
