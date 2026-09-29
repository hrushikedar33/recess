package com.appblocker.notify

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.appblocker.R
import com.appblocker.engine.EngineAction
import java.text.DateFormat
import java.util.Date

/** Posts and cancels the "limit reached" notification, one per app. */
class LimitNotifier(context: Context) {
    private val context = context.applicationContext

    fun post(event: EngineAction.NotifyLimitReached) {
        ensureChannel()
        val manager = NotificationManagerCompat.from(context)
        if (!manager.areNotificationsEnabled()) {
            // The block still happens; the health probe reports the blocked permission.
            Log.w(TAG, "Limit reached but notifications are blocked")
            return
        }

        val message = LimitMessageFormatter.format(event, ::formatTime)
        val notification =
            NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(message.title)
                .setContentText(message.text)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setOnlyAlertOnce(true)
                .setAutoCancel(true)
                .setContentIntent(openAppIntent())
                .build()
        try {
            manager.notify(idFor(event.packageName), notification)
            Log.i(TAG, "limit notification posted")
        } catch (e: SecurityException) {
            Log.w(TAG, "Could not post the limit notification", e)
        }
    }

    fun cancel(packageName: String) {
        NotificationManagerCompat.from(context).cancel(idFor(packageName))
    }

    private fun openAppIntent(): PendingIntent? {
        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
        return PendingIntent.getActivity(
            context,
            0,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel =
            NotificationChannel(CHANNEL_ID, "Limit alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Tells you when an app reached its limit"
            }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun formatTime(millis: Long): String =
        DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(millis))

    /** One notification per app, so a second app's block never replaces or cancels the first. */
    private fun idFor(packageName: String): Int = BASE_ID + (packageName.hashCode() and 0xFFFF)

    private companion object {
        const val TAG = "Recess"
        const val CHANNEL_ID = "recess_limit_alerts"
        const val BASE_ID = 40_000
    }
}
