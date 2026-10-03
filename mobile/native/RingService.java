package com.ractrotech.deligro.push;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.util.HashMap;
import java.util.Map;

/**
 * Rings until somebody deals with the order.
 *
 * Started by DeligroNotificationExtension when a push carries ring=start, or by
 * the open board (DeligroPushPlugin.startRing). Keeps one timeout per active
 * ring id — two orders arriving together ring once and stop only when both are
 * handled — and stops on ring=stop or when the last timeout runs out
 * (src/lib/alerts/ring.ts RING_TIMEOUT_SEC).
 *
 * Plays on the ALARM stream so a phone on silent still rings; a kitchen phone
 * on silent is the normal case, not the edge case.
 *
 * Also handled:
 *   - start() reports failure (Android 12+ refuses a foreground start without
 *     the high-priority exemption), so the extension can let OneSignal show its
 *     ordinary notification instead of showing nothing at all;
 *   - FCM does not order messages: a stop is remembered for a while (prefs
 *     "deligro_ring_stopped", keyed by ring id, holding the stop's server
 *     sentAt) and a start the server sent BEFORE that stop is ignored, rather
 *     than ringing five minutes for a cancelled order. A later re-offer to the
 *     same rider is newer than the stop and rings normally;
 *   - a ring nobody answered leaves a "missed order" notification behind, so a
 *     kitchen back from the stove still finds the order.
 */
public class RingService extends Service {
    static final String CHANNEL = "deligro_ring";
    static final int NOTIF_ID = 4711;
    static final int MISSED_ID = 4712;
    static final String MISSED_CHANNEL = "deligro_missed";
    private static final String STOPPED_PREFS = "deligro_ring_stopped";
    /** Longer than any ring's timeout (src/lib/alerts/ring.ts clamps to 600 s). */
    private static final long STOPPED_TTL_MS = 15 * 60 * 1000L;

    /** Active ring id → its timeout. Handler tokens compare by identity, so keep the runnable. */
    private final Map<String, Runnable> active = new HashMap<>();
    /** What each active ring said, for its "missed order" notification. */
    private final Map<String, String[]> texts = new HashMap<>();
    /** The newest start command; stopping with it cannot discard a later one. */
    private int lastStartId = 0;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaPlayer player;
    private Vibrator vibrator;
    private PowerManager.WakeLock wake;

    /**
     * True when the ring is handled: started, or deliberately not started
     * because this order was already stopped. False when Android refused —
     * the caller should then let the ordinary notification show.
     */
    public static boolean start(Context ctx, String ringId, String title, String body, int timeoutSec, long sentAt) {
        if (ringId == null || ringId.isEmpty()) return false;
        if (stoppedAfter(ctx, ringId, sentAt)) return true;
        Intent i = new Intent(ctx, RingService.class).setAction("start")
            .putExtra("ringId", ringId).putExtra("title", title).putExtra("body", body)
            .putExtra("timeoutSec", timeoutSec).putExtra("sentAt", sentAt);
        try {
            ComponentName started = ContextCompat.startForegroundService(ctx, i);
            return started != null; // null: no RingService in this app's manifest
        } catch (Exception refused) {
            // ForegroundServiceStartNotAllowedException (Android 12+) and kin.
            return false;
        }
    }

    /** `sentAt`: the stop's server time, or 0 for a stop made on this phone. */
    public static void stop(Context ctx, String ringId, long sentAt) {
        if (ringId != null && !ringId.isEmpty() && !"*".equals(ringId)) {
            if (sentAt > 0) rememberStopped(ctx, ringId, sentAt);
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(ringId, MISSED_ID);
        }
        try {
            ctx.startService(new Intent(ctx, RingService.class).setAction("stop").putExtra("ringId", ringId));
        } catch (IllegalStateException notRunning) {
            // Not ringing, and the app is in the background: nothing to stop.
        }
    }

    private static SharedPreferences stoppedPrefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(STOPPED_PREFS, Context.MODE_PRIVATE);
    }

    /** Stored as "<stop sentAt>|<expiry on this phone's clock>"; expired entries are pruned. */
    private static void rememberStopped(Context ctx, String ringId, long sentAt) {
        SharedPreferences prefs = stoppedPrefs(ctx);
        long now = System.currentTimeMillis();
        SharedPreferences.Editor ed = prefs.edit();
        for (Map.Entry<String, ?> e : prefs.getAll().entrySet()) {
            if (expiryOf(e.getValue()) < now) ed.remove(e.getKey());
        }
        ed.putString(ringId, sentAt + "|" + (now + STOPPED_TTL_MS)).apply();
    }

    private static long expiryOf(Object v) {
        try {
            return Long.parseLong(String.valueOf(v).split("\\|")[1]);
        } catch (Exception e) {
            return 0L;
        }
    }

    /** True when this start was sent before a stop we already received. */
    private static boolean stoppedAfter(Context ctx, String ringId, long startSentAt) {
        if (startSentAt <= 0) return false;
        String v = stoppedPrefs(ctx).getString(ringId, null);
        if (v == null || expiryOf(v) < System.currentTimeMillis()) return false;
        try {
            return Long.parseLong(v.split("\\|")[0]) >= startSentAt;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        lastStartId = startId;
        String action = intent == null ? "" : intent.getAction();
        String ringId = intent == null ? null : intent.getStringExtra("ringId");
        if (ringId == null) ringId = "";

        if ("start".equals(action)) {
            String title = intent.getStringExtra("title");
            String body = intent.getStringExtra("body");
            if (title == null || title.isEmpty()) title = "Deligro";
            if (body == null) body = "";
            // Always first: this command came through startForegroundService,
            // and returning without startForeground() crashes the app.
            Notification n = build(title, body);
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIF_ID, n);
            }
            if (ringId.isEmpty() || stoppedAfter(this, ringId, intent.getLongExtra("sentAt", 0L))) {
                if (active.isEmpty()) finish();
                return START_NOT_STICKY;
            }
            int timeoutSec = Math.max(1, Math.min(600, intent.getIntExtra("timeoutSec", 180)));
            Runnable previous = active.remove(ringId);
            if (previous != null) handler.removeCallbacks(previous);
            final String id = ringId;
            Runnable timeout = () -> {
                postMissed(id);
                remove(id);
            };
            active.put(id, timeout);
            texts.put(id, new String[] {title, body});
            handler.postDelayed(timeout, timeoutSec * 1000L);
            startSound();
        } else if ("stop".equals(action)) {
            if ("*".equals(ringId)) {
                for (Runnable r : active.values()) handler.removeCallbacks(r);
                active.clear();
                texts.clear();
                finish();
            } else {
                remove(ringId);
            }
        } else if (active.isEmpty()) {
            // Started with nothing to ring for (e.g. a stop that arrived first).
            finish();
        }
        return START_NOT_STICKY;
    }

    private void remove(String ringId) {
        Runnable r = active.remove(ringId);
        if (r != null) handler.removeCallbacks(r);
        texts.remove(ringId);
        if (active.isEmpty()) finish();
    }

    /** Nobody answered: leave a plain notification so the order is not lost. */
    private void postMissed(String ringId) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(MISSED_CHANNEL) == null) {
            nm.createNotificationChannel(new NotificationChannel(
                MISSED_CHANNEL, "Orders still waiting", NotificationManager.IMPORTANCE_HIGH));
        }
        String[] t = texts.get(ringId);
        String detail = t == null ? "" : (t[0] + (t[1].isEmpty() ? "" : " — " + t[1]));
        nm.notify(ringId, MISSED_ID, new NotificationCompat.Builder(this, MISSED_CHANNEL)
            .setSmallIcon(getApplicationInfo().icon)
            .setContentTitle("ऑर्डर इंतज़ार में · Order still waiting")
            .setContentText(detail)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(openApp())
            .build());
    }

    private void startSound() {
        if (player != null) return;
        AudioAttributes attrs = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        try {
            int raw = getResources().getIdentifier("deligro_ring", "raw", getPackageName());
            Uri uri = raw != 0
                ? Uri.parse("android.resource://" + getPackageName() + "/" + raw)
                : RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            player = new MediaPlayer();
            player.setAudioAttributes(attrs);
            player.setDataSource(this, uri);
            player.setLooping(true);
            player.prepare();
            player.start();
        } catch (Exception e) {
            player = null; // vibration and the notification still go ahead
        }
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && Build.VERSION.SDK_INT >= 26) {
            vibrator.vibrate(VibrationEffect.createWaveform(new long[] {0, 800, 600}, 0), attrs);
        }
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null && wake == null) {
            wake = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "deligro:ring");
            wake.acquire(10 * 60 * 1000L);
        }
    }

    /**
     * Nothing left to ring for. The sound always stops; the service itself
     * stops only if no newer start is queued — stopping past one would kill it
     * before that start's startForeground() and crash the app.
     */
    private void finish() {
        stopSound();
        if (stopSelfResult(lastStartId)) stopForeground(true);
    }

    private void stopSound() {
        if (player != null) {
            try { player.stop(); } catch (Exception ignored) { }
            player.release();
            player = null;
        }
        if (vibrator != null) {
            vibrator.cancel();
            vibrator = null;
        }
        if (wake != null) {
            if (wake.isHeld()) wake.release();
            wake = null;
        }
    }

    private PendingIntent openApp() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launch == null) launch = new Intent();
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(this, 0, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private Notification build(String title, String body) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "New orders (ringing)", NotificationManager.IMPORTANCE_HIGH);
            ch.setSound(null, null);      // MediaPlayer plays the ring
            ch.enableVibration(false);    // and the Vibrator vibrates
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            ch.setBypassDnd(true);
            nm.createNotificationChannel(ch);
        }
        PendingIntent open = openApp();
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(getApplicationInfo().icon)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setContentIntent(open)
            .setFullScreenIntent(open, true)
            .build();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        stopSound();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
