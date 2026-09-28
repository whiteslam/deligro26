/**
 * Pure helpers for the Android shell builds. No I/O here — build-apk.mjs
 * does the file system and process work; this is what the tests pin.
 */

const REQUIRED = ["role", "appId", "appName", "path", "versionCode", "versionName"];

export function loadRoles(json) {
  const cfg = JSON.parse(json);
  if (typeof cfg.baseUrl !== "string" || !cfg.baseUrl.startsWith("https://")) {
    throw new Error("roles.json: baseUrl must be an https:// URL");
  }
  if (!Array.isArray(cfg.roles) || cfg.roles.length === 0) {
    throw new Error("roles.json: roles must be a non-empty array");
  }
  const seen = new Set();
  for (const r of cfg.roles) {
    for (const k of REQUIRED) {
      if (r[k] === undefined || r[k] === "") throw new Error(`roles.json: role ${r.role ?? "?"} is missing ${k}`);
    }
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(r.appId)) {
      throw new Error(`roles.json: invalid appId ${r.appId}`);
    }
    if (seen.has(r.appId)) throw new Error(`roles.json: duplicate appId ${r.appId}`);
    seen.add(r.appId);
  }
  return cfg;
}

export function capacitorConfigFor(role, baseUrl, oneSignalAppId) {
  const host = new URL(baseUrl).host;
  const url = new URL(role.path, baseUrl).toString();
  return {
    appId: role.appId,
    appName: role.appName,
    webDir: "www",
    server: {
      url,
      // Only the live site loads inside the app; every other link (Maps,
      // WhatsApp, tel:) is handed to Android.
      allowNavigation: [host],
      cleartext: false,
      androidScheme: "https",
      // Shown from www/ when the site can't be reached.
      errorPath: "offline.html",
    },
    android: {
      allowMixedContent: false,
      appendUserAgent: `DeligroApp/${role.role}`,
      // apksigner gives a v2+ signature. Capacitor's default (jarsigner) is
      // v1-only, which Android 11+ refuses to install for SDK 30+ targets.
      buildOptions: { signingType: "apksigner", releaseType: "APK" },
    },
    plugins: {
      DeligroPush: { oneSignalAppId },
    },
  };
}

export function patchMainActivity(appId) {
  return `package ${appId};

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.ractrotech.deligro.push.DeligroPushPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeligroPushPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`;
}

const ONESIGNAL_DEP = "    implementation 'com.onesignal:OneSignal:[5.1.0, 5.99.99]'";

export function patchAppGradle(src, versionCode, versionName) {
  let out = src
    .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
    .replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);
  if (!out.includes("com.onesignal:OneSignal")) {
    out = out.replace(/dependencies\s*\{\n/, (m) => `${m}${ONESIGNAL_DEP}\n`);
  }
  return out;
}

const PERMS = [
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
];

export function patchManifestPermissions(xml) {
  const missing = PERMS.filter((p) => !xml.includes(p));
  if (missing.length === 0) return xml;
  const lines = missing.map((p) => `    <uses-permission android:name="${p}" />`).join("\n");
  return xml.replace(/<\/manifest>\s*$/, `${lines}\n</manifest>\n`);
}

/**
 * argv for `npx cap build android`, as an array so passwords are never
 * re-parsed by a shell (quotes, %VAR%, $, backticks all survive as typed).
 */
export function signedBuildArgs({ keystore, storePass, keyPass, alias }) {
  return [
    "cap", "build", "android",
    "--keystorepath", keystore,
    "--keystorepass", storePass,
    "--keystorealias", alias,
    "--keystorealiaspass", keyPass,
    "--androidreleasetype", "APK",
    "--signing-type", "apksigner",
  ];
}

/** The same argv with the two password values masked, for logging. */
export function redactArgs(args) {
  return args.map((a, i) =>
    i > 0 && (args[i - 1] === "--keystorepass" || args[i - 1] === "--keystorealiaspass") ? "***" : a
  );
}

/**
 * The app's offline page, with Retry pointed at the role's live URL.
 * Capacitor serves errorPath from the local www folder, so a plain reload
 * would only reload the offline page itself.
 */
export function offlinePageFor(html, url) {
  return html.replace(/location\.reload\(\)/g, `location.replace(${JSON.stringify(url)})`);
}
