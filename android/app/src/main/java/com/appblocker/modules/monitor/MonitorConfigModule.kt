package com.appblocker.modules.monitor

import android.util.Log
import com.appblocker.service.MonitorRuntime
import com.appblocker.service.MonitorServiceController
import com.appblocker.store.ConfigFormatException
import com.appblocker.store.RecessPrefs
import com.appblocker.store.RecessPrefsFactory
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Lets JS set the user's monitoring intent and mirror rules and goals to native storage.
 * A pure data adapter: validation lives in [com.appblocker.store.ConfigCodec].
 * Goal text is personal, so only counts are ever logged.
 */
class MonitorConfigModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "MonitorConfigModule"
        private const val TAG = "Recess"
        private const val ERROR_INVALID_CONFIG = "INVALID_CONFIG"
        private const val ERROR_MONITOR = "MONITOR_ERROR"
    }

    override fun getName() = NAME

    private val prefs: RecessPrefs
        get() = RecessPrefsFactory.get(reactApplicationContext)

    /**
     * Records the user's intent, then starts or stops the service to match. The intent is written
     * first and verified; if the service then cannot be started the intent is put back, so the
     * toggle never claims ON while nothing runs.
     */
    @ReactMethod
    fun setMonitoringEnabled(enabled: Boolean, promise: Promise) {
        val previous = prefs.isMonitoringEnabled()
        try {
            prefs.setMonitoringEnabled(enabled)
            if (enabled) MonitorServiceController.start(reactApplicationContext) else MonitorServiceController.stop(reactApplicationContext)
            Log.i(TAG, "Monitoring intent set to $enabled")
            promise.resolve(null)
        } catch (e: Exception) {
            runCatching { prefs.setMonitoringEnabled(previous) }
            prefs.recordStopReason("enable_failed: ${e.javaClass.simpleName}")
            promise.reject(ERROR_MONITOR, e.message, e)
        }
    }

    @ReactMethod
    fun getMonitorStatus(promise: Promise) {
        try {
            val status = prefs.status(MonitorRuntime.isRunning)
            val map = Arguments.createMap()
            map.putBoolean("enabled", status.enabled)
            map.putBoolean("running", status.running)
            val heartbeat = status.lastHeartbeatAt
            if (heartbeat != null) map.putDouble("lastHeartbeatAt", heartbeat.toDouble()) else map.putNull("lastHeartbeatAt")
            val reason = status.lastStopReason
            if (reason != null) map.putString("lastStopReason", reason) else map.putNull("lastStopReason")
            map.putArray("health", Arguments.fromList(status.health))
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject(ERROR_MONITOR, e.message, e)
        }
    }

    @ReactMethod
    fun syncBlockedApps(json: String, promise: Promise) {
        try {
            prefs.saveBlockedApps(json)
            Log.i(TAG, "Synced ${prefs.blockedApps().size} rule(s)")
            promise.resolve(null)
        } catch (e: ConfigFormatException) {
            promise.reject(ERROR_INVALID_CONFIG, e.message, e)
        } catch (e: Exception) {
            promise.reject(ERROR_MONITOR, e.message, e)
        }
    }

    @ReactMethod
    fun syncGoals(json: String, promise: Promise) {
        try {
            prefs.saveGoals(json)
            Log.i(TAG, "Synced ${prefs.goals().size} goal(s)")
            promise.resolve(null)
        } catch (e: ConfigFormatException) {
            promise.reject(ERROR_INVALID_CONFIG, e.message, e)
        } catch (e: Exception) {
            promise.reject(ERROR_MONITOR, e.message, e)
        }
    }
}
