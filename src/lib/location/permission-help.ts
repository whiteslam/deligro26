/**
 * What to tell someone whose browser has blocked location for this site.
 *
 * Once a site's location permission is denied the browser will not show its
 * prompt again — calling `getCurrentPosition` just fails straight away — so the
 * only way back is the person turning it on themselves. A bare "turn it on in
 * settings" is not enough for most of our customers, so these are the concrete
 * taps, for the phone they are actually holding.
 *
 * Client-only (reads `navigator`); safe to call during render of a client
 * component because it is only used after a denial has happened.
 */
export function locationSettingsSteps(): string[] {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const ios =
    /iPhone|iPad|iPod/i.test(ua) ||
    // iPadOS reports itself as a Mac with touch.
    (/Macintosh/i.test(ua) &&
      typeof navigator !== "undefined" &&
      navigator.maxTouchPoints > 1);

  if (ios) {
    return [
      "Open iPhone Settings → Privacy & Security → Location Services. Turn it On.",
      "In the same list, tap your browser (Safari, Chrome or Brave) → choose \"While Using the App\".",
      "Back in the browser, tap the aA / site-settings icon in the address bar and allow Location for this site.",
      "Reload this page, then tap \"Use my current location\" again.",
    ];
  }

  return [
    "Tap the lock / settings icon next to the web address at the top.",
    "Open Permissions → Location and choose \"Allow\".",
    "Make sure your phone's Location (GPS) is switched on.",
    "Reload this page, then tap \"Use my current location\" again.",
  ];
}
