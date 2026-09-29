package com.appblocker.service

import com.appblocker.store.RecessPrefs

/**
 * Brings the monitor back when the user wants it and it is not running. Every revival path (boot,
 * app update, alarm, watchdog, app open) goes through here, so the rule is written once: only an
 * intent that was explicitly turned on is ever restarted, and a refused start is recorded, never
 * thrown, because these callers run in the background with nobody to handle it.
 */
class MonitorRestarter(
    private val prefs: RecessPrefs,
    private val isRunning: () -> Boolean,
    private val start: () -> Unit,
) {
    enum class Result { NOT_NEEDED, ALREADY_RUNNING, STARTED, FAILED }

    fun restartIfNeeded(reason: String): Result {
        if (!prefs.isMonitoringEnabled()) return Result.NOT_NEEDED
        if (isRunning()) return Result.ALREADY_RUNNING
        return try {
            start()
            Result.STARTED
        } catch (e: Exception) {
            // Keep a more informative reason (say, why the process died) rather than overwrite it
            // with a failure that a periodic watchdog would repeat every fifteen minutes.
            if (prefs.lastStopReason() == null) {
                prefs.recordStopReason("restart_failed ($reason): ${e.javaClass.simpleName}")
            }
            Result.FAILED
        }
    }
}
