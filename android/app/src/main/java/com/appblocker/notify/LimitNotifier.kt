package com.appblocker.notify

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.appblocker.R

/**
 * Posts and cancels the "limit reached" notification, one per app. It uses custom collapsed and
 * expanded layouts on the app's palette (see [LimitNotificationViews]) with a live countdown and two
 * actions, rather than a block of plain text.
 */
class LimitNotifier(context: Context) {
    private val context = context.applicationContext
    private val views = LimitNotificationViews(this.context)

    fun post(packageName: String, message: LimitMessage) {
        ensureChannel()
        val manager = NotificationManagerCompat.from(context)
        if (!manager.areNotificationsEnabled()) {
            // The block still happens; the health probe reports the blocked permission.
            Log.w(TAG, "Limit reached but notifications are blocked")
            return
        }

        val open = BreakIntents.pending(context)
        // What anyone can read on a locked screen: the headline only, never the quote or the goals.
        val publicVersion =
            NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(com.appblocker.R.drawable.ic_notification)
                .setContentTitle(message.title)
                .setContentText(message.status)
                .build()
        val model = LimitNotificationModel.from(message, System.currentTimeMillis(), SystemClock.elapsedRealtime())
        val collapsed = views.collapsed(model)
        val builder =
            NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(com.appblocker.R.drawable.ic_notification)
                .setContentTitle(message.title)
                // Plain text for surfaces that do not draw the custom layouts (accessibility, wearables).
                .setContentText(message.text)
                .setStyle(NotificationCompat.DecoratedCustomViewStyle())
                .setCustomContentView(collapsed)
                .setCustomHeadsUpContentView(collapsed)
                .setCustomBigContentView(views.expanded(model))
                .addAction(0, context.getString(R.string.notif_action_open), open)
                .addAction(0, context.getString(R.string.notif_action_home), homePending())
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setOnlyAlertOnce(true)
                .setAutoCancel(true)
                .setContentIntent(open)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
                .setPublicVersion(publicVersion)
        // Where the OS allows it (Android 14+ needs a user grant), also take over the screen.
        if (canUseFullScreenIntent()) builder.setFullScreenIntent(open, true)

        try {
            manager.notify(packageName, NOTIFICATION_ID, builder.build())
            Log.i(TAG, "limit notification posted")
        } catch (e: SecurityException) {
            Log.w(TAG, "Could not post the limit notification", e)
        }
    }

    /** A tap on "Home": the system starts the launcher on our behalf, which is always allowed. */
    private fun homePending(): PendingIntent =
        PendingIntent.getActivity(
            context,
            1,
            Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    fun cancel(packageName: String) {
        NotificationManagerCompat.from(context).cancel(packageName, NOTIFICATION_ID)
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

    private companion object {
        const val TAG = "Recess"
        const val CHANNEL_ID = "recess_limit_alerts"
        /** One notification per app: the package name is the tag, so ids can never collide with other notifications. */
        const val NOTIFICATION_ID = 40_001
    }
}
