package com.appblocker.service

import android.content.Context
import android.util.Log
import com.appblocker.store.RecessPrefsFactory

/** Android wiring for [MonitorRestarter], shared by the receivers and the watchdog. */
object MonitorRevival {
    fun restartIfNeeded(context: Context, reason: String) {
        val restarter =
            MonitorRestarter(
                prefs = RecessPrefsFactory.get(context),
                isRunning = { MonitorRuntime.isRunning },
                start = { MonitorServiceController.start(context) },
            )
        Log.i("Recess", "Revival check ($reason): ${restarter.restartIfNeeded(reason)}")
    }

    /** Everything that keeps the monitor alive, set up when the user turns monitoring on. */
    fun onMonitoringEnabled(context: Context) {
        WatchdogWorker.ensureScheduled(context)
    }

    /** The user turned monitoring off: stop every path that could bring it back. */
    fun onMonitoringDisabled(context: Context) {
        RestartScheduler.cancel(context)
        WatchdogWorker.cancel(context)
    }
}
