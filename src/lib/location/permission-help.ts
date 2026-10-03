import { translator, type Lang } from "@/lib/i18n/lang";

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
export function locationSettingsSteps(lang: Lang = "en"): string[] {
  const t = translator(lang);
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const ios =
    /iPhone|iPad|iPod/i.test(ua) ||
    // iPadOS reports itself as a Mac with touch.
    (/Macintosh/i.test(ua) &&
      typeof navigator !== "undefined" &&
      navigator.maxTouchPoints > 1);

  if (ios) {
    return [
      t(
        "Open iPhone Settings → Privacy & Security → Location Services. Turn it On.",
        "iPhone की Settings खोलें → Privacy & Security → Location Services. इसे चालू करें।",
      ),
      t(
        'In the same list, tap your browser (Safari, Chrome or Brave) → choose "While Using the App".',
        'उसी सूची में अपना ब्राउज़र (Safari, Chrome या Brave) दबाएं → "While Using the App" चुनें।',
      ),
      t(
        "Back in the browser, tap the aA / site-settings icon in the address bar and allow Location for this site.",
        "ब्राउज़र में वापस जाकर, ऊपर पते वाली पट्टी में aA / साइट सेटिंग का निशान दबाएं और इस साइट के लिए लोकेशन की अनुमति दें।",
      ),
      t(
        'Reload this page, then tap "Use my current location" again.',
        'यह पेज फिर से खोलें, फिर "मेरी अभी की लोकेशन लें" दोबारा दबाएं।',
      ),
    ];
  }

  return [
    t(
      "Tap the lock / settings icon next to the web address at the top.",
      "ऊपर वेब पते के पास ताले / सेटिंग वाला निशान दबाएं।",
    ),
    t(
      'Open Permissions → Location and choose "Allow".',
      'Permissions → Location खोलें और "Allow" चुनें।',
    ),
    t(
      "Make sure your phone's Location (GPS) is switched on.",
      "देखें कि फ़ोन की लोकेशन (GPS) चालू है।",
    ),
    t(
      'Reload this page, then tap "Use my current location" again.',
      'यह पेज फिर से खोलें, फिर "मेरी अभी की लोकेशन लें" दोबारा दबाएं।',
    ),
  ];
}
