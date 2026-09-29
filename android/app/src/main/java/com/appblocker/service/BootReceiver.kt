package com.appblocker.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Restarts the monitor after a reboot or an app update. Both are protected system broadcasts, so
 * the action is checked anyway: this receiver is exported only because the system must reach it.
 * BOOT_COMPLETED (after unlock) is used rather than LOCKED_BOOT_COMPLETED because the stored
 * intent lives in credential-encrypted storage.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val reason =
            when (intent?.action) {
                Intent.ACTION_BOOT_COMPLETED -> "boot"
                Intent.ACTION_MY_PACKAGE_REPLACED -> "package_replaced"
                else -> return
            }
        MonitorRevival.restartIfNeeded(context, reason)
        WatchdogWorker.ensureScheduledIfEnabled(context)
    }
}
