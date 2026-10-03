package com.ractrotech.deligro.push;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
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
 */
public class RingService extends Service {
    static final String CHANNEL = "deligro_ring";
    static final int NOTIF_ID = 4711;

    /** Active ring id → its timeout. Handler tokens compare by identity, so keep the runnable. */
    private final Map<String, Runnable> active = new HashMap<>();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaPlayer player;
    private Vibrator vibrator;
    private PowerManager.WakeLock wake;

    public static void start(Context ctx, String ringId, String title, String body, int timeoutSec) {
        Intent i = new Intent(ctx, RingService.class).setAction("start")
            .putExtra("ringId", ringId).putExtra("title", title).putExtra("body", body)
            .putExtra("timeoutSec", timeoutSec);
        ContextCompat.startForegroundService(ctx, i);
    }

    public static void stop(Context ctx, String ringId) {
        try {
            ctx.startService(new Intent(ctx, RingService.class).setAction("stop").putExtra("ringId", ringId));
        } catch (IllegalStateException notRunning) {
            // Not ringing, and the app is in the background: nothing to stop.
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? "" : intent.getAction();
        String ringId = intent == null ? null : intent.getStringExtra("ringId");
        if (ringId == null) ringId = "";

        if ("start".equals(action) && !ringId.isEmpty()) {
            String title = intent.getStringExtra("title");
            String body = intent.getStringExtra("body");
            int timeoutSec = Math.max(1, Math.min(600, intent.getIntExtra("timeoutSec", 180)));
            Notification n = build(title == null || title.isEmpty() ? "Deligro" : title, body == null ? "" : body);
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIF_ID, n);
            }
            Runnable previous = active.remove(ringId);
            if (previous != null) handler.removeCallbacks(previous);
            final String id = ringId;
            Runnable timeout = () -> remove(id);
            active.put(id, timeout);
            handler.postDelayed(timeout, timeoutSec * 1000L);
            startSound();
        } else if ("stop".equals(action)) {
            if ("*".equals(ringId)) {
                for (Runnable r : active.values()) handler.removeCallbacks(r);
                active.clear();
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
        if (active.isEmpty()) finish();
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

    private void finish() {
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
        stopForeground(true);
        stopSelf();
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
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launch == null) launch = new Intent();
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent open = PendingIntent.getActivity(this, 0, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
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
        if (player != null) {
            player.release();
            player = null;
        }
        if (vibrator != null) vibrator.cancel();
        if (wake != null && wake.isHeld()) wake.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
