package com.ractrotech.deligro.push;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.onesignal.Continue;
import com.onesignal.OneSignal;

/**
 * Native push for the Deligro shells. The website calls these through
 * window.Capacitor.Plugins.DeligroPush (src/lib/native/bridge.ts):
 *   login  — ties this device to the signed-in profile id (OneSignal external_id),
 *            which is what the server targets (src/lib/notifications/onesignal.ts);
 *   logout — detaches it, so a shared kitchen phone stops getting the last
 *            person's orders;
 *   requestPermission — the Android 13+ notification prompt;
 *   startRing / stopRing — the open board rings for orders it can see
 *            (RingService; Vendor and Rider apps only — src/lib/alerts/ring.ts);
 *   ringSetup / openRingSettings — the phone settings that silently stop a
 *            ring (src/components/notifications/ring-setup.tsx).
 */
@CapacitorPlugin(name = "DeligroPush")
public class DeligroPushPlugin extends Plugin {

    @Override
    public void load() {
        String appId = getConfig().getString("oneSignalAppId", "");
        if (appId != null && !appId.isEmpty()) {
            OneSignal.initWithContext(getContext(), appId);
        }
    }

    @PluginMethod
    public void login(PluginCall call) {
        String userId = call.getString("userId");
        if (userId == null || userId.isEmpty()) {
            call.reject("userId is required");
            return;
        }
        OneSignal.login(userId);
        call.resolve();
    }

    @PluginMethod
    public void logout(PluginCall call) {
        // A shared kitchen phone must not keep ringing for the last person's order.
        RingService.stop(getContext(), "*", 0L);
        OneSignal.logout();
        call.resolve();
    }

    /**
     * fallbackToSettings (default false): when the user already refused, open
     * the app's notification settings. The web app passes true only for an
     * explicit tap, so opening the app never drags anyone into Settings.
     */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        boolean fallbackToSettings = Boolean.TRUE.equals(call.getBoolean("fallbackToSettings", false));
        OneSignal.getNotifications().requestPermission(fallbackToSettings, Continue.none());
        call.resolve();
    }

    /** The open board starts the ring for an order it can see (covers a lost push). */
    @PluginMethod
    public void startRing(PluginCall call) {
        String ringId = call.getString("ringId", "");
        if (ringId == null || ringId.isEmpty()) {
            call.reject("ringId is required");
            return;
        }
        Integer timeout = call.getInt("timeoutSec", 180);
        // sentAt 0: the board only starts rings for orders it can see waiting
        // right now, so an earlier stop must not suppress it.
        boolean ok = RingService.start(getContext(), ringId, call.getString("title", "Deligro"),
            call.getString("body", ""), timeout == null ? 180 : timeout, 0L);
        // Not ok: no RingService in this app's manifest (Customer/Manager), or
        // Android refused a foreground start.
        if (ok) call.resolve();
        else call.reject("ring unavailable");
    }

    @PluginMethod
    public void stopRing(PluginCall call) {
        RingService.stop(getContext(), call.getString("ringId", "*"), 0L);
        call.resolve();
    }

    /** What stands between this phone and a ring that actually wakes it. */
    @PluginMethod
    public void ringSetup(PluginCall call) {
        Context ctx = getContext();
        JSObject out = new JSObject();
        out.put("notifications", NotificationManagerCompat.from(ctx).areNotificationsEnabled());
        boolean fullScreen = true;
        if (Build.VERSION.SDK_INT >= 34) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            fullScreen = nm != null && nm.canUseFullScreenIntent();
        }
        out.put("fullScreen", fullScreen);
        PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        out.put("batteryUnrestricted", pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName()));
        out.put("manufacturer", Build.MANUFACTURER);
        call.resolve(out);
    }

    @PluginMethod
    public void openRingSettings(PluginCall call) {
        Context ctx = getContext();
        String which = call.getString("which", "notifications");
        Uri pkg = Uri.parse("package:" + ctx.getPackageName());
        Intent i;
        if ("autostart".equals(which)) {
            openAutostart(ctx, pkg);
            call.resolve();
            return;
        }
        if ("battery".equals(which)) {
            i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, pkg);
        } else if ("fullScreen".equals(which) && Build.VERSION.SDK_INT >= 34) {
            i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pkg);
        } else {
            i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, ctx.getPackageName());
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            ctx.startActivity(i);
        } catch (Exception e) {
            ctx.startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        }
        call.resolve();
    }

    /**
     * The maker's own Autostart screen, where one exists; otherwise the app's
     * details page. These activities are not public API and move between OS
     * versions, so each is tried in turn.
     */
    private static void openAutostart(Context ctx, Uri pkg) {
        String[][] screens = {
            {"com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"},
            {"com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"},
            {"com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager"},
            {"com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"},
            {"com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"},
        };
        for (String[] c : screens) {
            try {
                Intent i = new Intent().setClassName(c[0], c[1]).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(i);
                return;
            } catch (Exception ignored) {
                // not this maker / not this OS version
            }
        }
        ctx.startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }
}
