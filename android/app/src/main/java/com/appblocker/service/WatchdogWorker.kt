package com.appblocker.service

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.appblocker.store.RecessPrefsFactory
import java.util.concurrent.TimeUnit

/**
 * Every 15 minutes, checks that the monitor is still running if the user wants it, and revives
 * it if not. Best effort: WorkManager survives process death but not a user force-stop, and
 * starting a foreground service from here relies on the battery-optimization allowlist.
 */
class WatchdogWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        MonitorRevival.restartIfNeeded(applicationContext, "watchdog")
        return Result.success()
    }

    companion object {
        private const val WORK_NAME = "recess_monitor_watchdog"

        fun ensureScheduled(context: Context) {
            val request = PeriodicWorkRequestBuilder<WatchdogWorker>(15, TimeUnit.MINUTES).build()
            WorkManager.getInstance(context.applicationContext)
                .enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request)
        }

        /** After boot or an update, WorkManager keeps its schedule; this only covers a lost one. */
        fun ensureScheduledIfEnabled(context: Context) {
            if (RecessPrefsFactory.get(context).isMonitoringEnabled()) ensureScheduled(context)
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context.applicationContext).cancelUniqueWork(WORK_NAME)
        }
    }
}
