package com.appblocker.modules.monitor

import android.util.Log
import com.appblocker.service.MonitorRevival
import com.appblocker.service.MonitorRuntime
import com.appblocker.service.MonitorServiceController
import com.appblocker.service.MonitorSwitch
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

    private val monitorSwitch by lazy {
        MonitorSwitch(
            prefs = prefs,
            startService = { MonitorServiceController.start(reactApplicationContext) },
            stopService = { MonitorServiceController.stop(reactApplicationContext) },
            onEnabled = { MonitorRevival.onMonitoringEnabled(reactApplicationContext) },
            onDisabled = { MonitorRevival.onMonitoringDisabled(reactApplicationContext) },
        )
    }

    /** The toggle. The rules that make it trustworthy live in [MonitorSwitch], where they are tested. */
    @ReactMethod
    fun setMonitoringEnabled(enabled: Boolean, promise: Promise) {
        try {
            monitorSwitch.setEnabled(enabled)
            Log.i(TAG, "Monitoring intent set to $enabled")
            promise.resolve(null)
        } catch (e: Exception) {
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
            val reasonAt = status.lastStopReasonAt
            if (reasonAt != null) map.putDouble("lastStopReasonAt", reasonAt.toDouble()) else map.putNull("lastStopReasonAt")
            map.putArray("health", Arguments.fromList(status.health))
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject(ERROR_MONITOR, e.message, e)
        }
    }

    /** The last limit event as JSON (or null), for the Break screen. */
    @ReactMethod
    fun getLimitEvent(promise: Promise) {
        try {
            promise.resolve(prefs.lastLimitEventJson())
        } catch (e: Exception) {
            promise.reject(ERROR_MONITOR, e.message, e)
        }
    }

    @ReactMethod
    fun syncBlockedApps(json: String?, promise: Promise) {
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
    fun syncGoals(json: String?, promise: Promise) {
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

    /** Quotes fetched online (an opt-in feature); mixed into the bundled ones by the monitor. */
    @ReactMethod
    fun syncExtraQuotes(json: String?, promise: Promise) {
        try {
            prefs.saveExtraQuotes(json)
            Log.i(TAG, "Synced ${prefs.extraQuotes().size} extra quote(s)")
            promise.resolve(null)
        } catch (e: ConfigFormatException) {
            promise.reject(ERROR_INVALID_CONFIG, e.message, e)
        } catch (e: Exception) {
            promise.reject(ERROR_MONITOR, e.message, e)
        }
    }
}
