package com.ractrotech.deligro.push;

import androidx.annotation.NonNull;
import com.onesignal.notifications.INotification;
import com.onesignal.notifications.INotificationReceivedEvent;
import com.onesignal.notifications.INotificationServiceExtension;
import org.json.JSONObject;

/**
 * Turns a ring payload (src/lib/alerts/ring.ts) into RingService start/stop.
 * Registered in the manifest as com.onesignal.NotificationServiceExtension for
 * the Vendor and Rider apps only (mobile/scripts/lib.mjs patchManifestRing).
 * Any push without "ring" is left alone and shows as normal.
 */
public class DeligroNotificationExtension implements INotificationServiceExtension {
    @Override
    public void onNotificationReceived(@NonNull INotificationReceivedEvent event) {
        INotification n = event.getNotification();
        JSONObject data = n.getAdditionalData();
        if (data == null) return;
        String ring = data.optString("ring", "");
        String ringId = data.optString("ringId", "");
        if (ringId.isEmpty()) return;

        if ("start".equals(ring)) {
            // Suppress OneSignal's notification only once the ring is really
            // going (RingService shows its own). If Android refused the
            // foreground start — common on budget phones in a restricted
            // battery bucket — the ordinary high-priority notification still
            // shows, which is what v1.0.0 gave and far better than nothing.
            if (RingService.start(event.getContext(), ringId, n.getTitle(), n.getBody(),
                    data.optInt("timeoutSec", 180), data.optLong("sentAt", 0L))) {
                event.preventDefault();
            }
        } else if ("stop".equals(ring)) {
            event.preventDefault();
            RingService.stop(event.getContext(), ringId, data.optLong("sentAt", 0L));
        }
    }
}
