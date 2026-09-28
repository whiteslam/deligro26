package com.ractrotech.deligro.push;

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
 *   requestPermission — the Android 13+ notification prompt.
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
        OneSignal.logout();
        call.resolve();
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        OneSignal.getNotifications().requestPermission(true, Continue.none());
        call.resolve();
    }
}
