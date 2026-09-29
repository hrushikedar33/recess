package com.appblocker.service

import com.appblocker.store.RecessPrefs

/**
 * The one place the ON/OFF toggle is honoured, so its guarantees can be tested without a device:
 *
 * - Turning ON writes the user's intent first (and fails loudly if it did not reach storage), then
 *   starts the service, then sets up the safety nets. If the service cannot start, the intent is put
 *   back to what it was, so the toggle never claims ON while nothing runs.
 * - Turning OFF removes every way of reviving the monitor *before* stopping it, so nothing can bring
 *   it back. If the stop call itself fails the OFF still stands: the service sees the intent and
 *   stops itself on its next tick.
 */
class MonitorSwitch(
    private val prefs: RecessPrefs,
    private val startService: () -> Unit,
    private val stopService: () -> Unit,
    private val onEnabled: () -> Unit,
    private val onDisabled: () -> Unit,
) {
    fun setEnabled(enabled: Boolean) {
        if (enabled) enable() else disable()
    }

    private fun enable() {
        val previous = prefs.isMonitoringEnabled()
        try {
            prefs.setMonitoringEnabled(true)
            startService()
            onEnabled()
        } catch (e: Exception) {
            // Best effort, and never allowed to hide the original problem.
            runCatching { prefs.setMonitoringEnabled(previous) }
            prefs.recordStopReason("enable_failed: ${e.javaClass.simpleName}")
            throw e
        }
    }

    private fun disable() {
        prefs.setMonitoringEnabled(false)
        onDisabled()
        try {
            stopService()
        } catch (e: Exception) {
            prefs.recordStopReason("stop_call_failed: ${e.javaClass.simpleName}")
        }
    }
}
