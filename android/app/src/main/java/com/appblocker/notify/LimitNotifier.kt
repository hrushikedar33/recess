package com.appblocker.notify

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/** Posts and cancels the "limit reached" notification, one per app. */
class LimitNotifier(context: Context) {
    private val context = context.applicationContext

    fun post(packageName: String, message: LimitMessage) {
        ensureChannel()
        val manager = NotificationManagerCompat.from(context)
        if (!manager.areNotificationsEnabled()) {
            // The block still happens; the health probe reports the blocked permission.
            Log.w(TAG, "Limit reached but notifications are blocked")
            return
        }

        val open = BreakIntents.pending(context)
        val builder =
            NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(com.appblocker.R.drawable.ic_notification)
                .setContentTitle(message.title)
                .setContentText(message.text)
                .setStyle(NotificationCompat.BigTextStyle().bigText(message.bigText))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setOnlyAlertOnce(true)
                .setAutoCancel(true)
                .setContentIntent(open)
        // Where the OS allows it (Android 14+ needs a user grant), also take over the screen.
        if (canUseFullScreenIntent()) builder.setFullScreenIntent(open, true)

        try {
            manager.notify(idFor(packageName), builder.build())
            Log.i(TAG, "limit notification posted")
        } catch (e: SecurityException) {
            Log.w(TAG, "Could not post the limit notification", e)
        }
    }

    fun cancel(packageName: String) {
        NotificationManagerCompat.from(context).cancel(idFor(packageName))
    }

    private fun canUseFullScreenIntent(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE ||
            context.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel =
            NotificationChannel(CHANNEL_ID, "Limit alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Tells you when an app reached its limit"
            }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    /** One notification per app, so a second app's block never replaces or cancels the first. */
    private fun idFor(packageName: String): Int = BASE_ID + (packageName.hashCode() and 0xFFFF)

    private companion object {
        const val TAG = "Recess"
        const val CHANNEL_ID = "recess_limit_alerts"
        const val BASE_ID = 40_000
    }
}
