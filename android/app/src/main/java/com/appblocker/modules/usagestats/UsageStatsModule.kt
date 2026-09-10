package com.appblocker.modules.usagestats

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.util.Log
import android.os.Build
import android.os.PowerManager
import android.os.Process
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.net.Uri
import androidx.core.app.NotificationCompat
import android.provider.Settings
import com.facebook.react.bridge.*
import java.util.concurrent.TimeUnit

class UsageStatsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "UsageStatsModule"
    }

    override fun getName() = "UsageStatsModule"

    /**
     * Check if the app has PACKAGE_USAGE_STATS permission.
     */
    @ReactMethod
    fun hasPermission(promise: Promise) {
        try {
            val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    reactContext.packageName
                )
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    reactContext.packageName
                )
            }
            promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Open the Usage Access settings screen so the user can grant permission.
     */
    @ReactMethod
    fun requestPermission() {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open usage access settings", e)
        }
    }

    /**
     * Check if the app has SYSTEM_ALERT_WINDOW ("Display over other apps") permission.
     */
    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(reactContext))
        } else {
            promise.resolve(true)
        }
    }

    /**
     * Open the "Display over other apps" settings screen for Recess.
     */
    @ReactMethod
    fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + reactContext.packageName)
                ).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to open overlay settings", e)
            }
        }
    }

    /**
     * Check if battery optimization is disabled for this app.
     */
    @ReactMethod
    fun isBatteryOptimizationIgnored(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
            promise.resolve(pm?.isIgnoringBatteryOptimizations(reactContext.packageName) ?: true)
        } else {
            promise.resolve(true)
        }
    }

    /**
     * Prompt user to disable battery optimization so ColorOS/Android doesn't kill the tracker.
     */
    @ReactMethod
    fun requestIgnoreBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:" + reactContext.packageName)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
            } catch (e: Exception) {
                try {
                    val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    reactContext.startActivity(intent)
                } catch (e2: Exception) {
                    Log.e(TAG, "Failed to open battery optimization settings", e2)
                }
            }
        }
    }

    /**
     * Forcefully pop up a full-screen notification intent to guarantee
     * that Recess takes over the screen even if Android restricts background starts.
     */
    @ReactMethod
    fun showLimitNotification(title: String, message: String) {
        try {
            val notificationManager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channelId = "recess_fullscreen_alert"
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(channelId, "Recess Limit Alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Alerts when app limit is reached"
                }
                notificationManager.createNotificationChannel(channel)
            }

            val launchIntent = reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            val pendingIntent = PendingIntent.getActivity(
                reactContext,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
            )

            val notification = NotificationCompat.Builder(reactContext, channelId)
                .setContentTitle(title)
                .setContentText(message)
                .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(pendingIntent, true)
                .setAutoCancel(true)
                .build()

            notificationManager.notify(99991, notification)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show limit notification", e)
        }
    }

    /**
     * Send the user back to the home screen.
     */
    @ReactMethod
    fun sendAppToHome() {
        try {
            val intent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send app to home", e)
        }
    }

    /**
     * Get total foreground time (in milliseconds) for a given package name
     * over the last 24 hours.
     */
    @ReactMethod
    fun getAppUsageToday(packageName: String, promise: Promise) {
        try {
            val usm = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val now = System.currentTimeMillis()
            val start = now - TimeUnit.HOURS.toMillis(24)

            val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, now)
            val appStat = stats?.find { it.packageName == packageName }
            promise.resolve((appStat?.totalTimeInForeground ?: 0L).toDouble())
        } catch (e: Exception) {
            promise.reject("USAGE_ERROR", e.message)
        }
    }

    /**
     * Bring Recess to the foreground.
     */
    @ReactMethod
    fun bringAppToForeground() {
        try {
            val launchIntent = reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            if (launchIntent != null) {
                reactContext.startActivity(launchIntent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to bring app to foreground", e)
        }
    }

    /**
     * Get the package name of the active foreground app in real-time.
     * Uses UsageEvents.Event.ACTIVITY_RESUMED to ensure 100% accuracy on Android 10+.
     */
    @ReactMethod
    fun getForegroundApp(promise: Promise) {
        try {
            val pm = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (pm?.isInteractive == false) {
                promise.resolve(null)
                return
            }

            val usm = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val now = System.currentTimeMillis()

            // Look back up to 10 minutes to find the most recent ACTIVITY_RESUMED event
            val events = usm.queryEvents(now - 10 * 60 * 1000L, now)
            var lastResumedPkg: String? = null
            var lastEventTime = 0L

            val event = UsageEvents.Event()
            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                val type = event.eventType
                // ACTIVITY_RESUMED (1) or MOVE_TO_FOREGROUND (1)
                if (type == UsageEvents.Event.ACTIVITY_RESUMED || type == 1) {
                    if (event.timeStamp >= lastEventTime) {
                        lastEventTime = event.timeStamp
                        lastResumedPkg = event.packageName
                    }
                }
            }

            // Fallback to queryUsageStats if no event was found
            if (lastResumedPkg == null) {
                val stats = usm.queryUsageStats(
                    UsageStatsManager.INTERVAL_BEST,
                    now - 60 * 1000L,
                    now
                )
                lastResumedPkg = stats
                    ?.filter { it.lastTimeUsed > 0 }
                    ?.maxByOrNull { it.lastTimeUsed }
                    ?.packageName
            }

            promise.resolve(lastResumedPkg)
        } catch (e: Exception) {
            promise.reject("FOREGROUND_ERROR", e.message)
        }
    }
}