package com.appblocker.service

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.SystemClock

/**
 * A best-effort nudge: ask Android to wake us shortly after the service went away. Inexact on
 * purpose (no exact-alarm permission needed). Force-stop cancels alarms, so this can only help
 * with kills and swipes, never with a user force-stop.
 */
object RestartScheduler {
    const val ACTION_RESTART = "com.appblocker.action.RESTART_MONITOR"
    private const val REQUEST_CODE = 7301

    fun schedule(context: Context, delayMs: Long) {
        val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarms.setAndAllowWhileIdle(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            SystemClock.elapsedRealtime() + delayMs,
            pendingIntent(context),
        )
    }

    fun cancel(context: Context) {
        val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarms.cancel(pendingIntent(context))
    }

    private fun pendingIntent(context: Context): PendingIntent {
        val app = context.applicationContext
        val intent = Intent(app, RestartReceiver::class.java).setAction(ACTION_RESTART)
        return PendingIntent.getBroadcast(
            app,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
