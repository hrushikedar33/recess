package com.appblocker.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Fired by the alarm that [RestartScheduler] sets. Not exported: only this app can send it. */
class RestartReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == RestartScheduler.ACTION_RESTART) {
            MonitorRevival.restartIfNeeded(context, "alarm")
        }
    }
}
