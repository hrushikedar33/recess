package com.appblocker.store

import com.appblocker.engine.EngineState
import com.appblocker.engine.EngineStateCodec

data class MonitorStatus(
    val enabled: Boolean,
    val running: Boolean,
    val lastHeartbeatAt: Long?,
    val lastStopReason: String?,
)

/**
 * The single owner of everything the native side persists: the user's intent (enabled), the
 * rules and goals mirrored from JS, the engine's state, and liveness information.
 *
 * Writers are kept apart so they never race: JS writes intent, rules and goals; the monitor
 * service writes engine state, heartbeat and stop reason.
 */
class RecessPrefs(
    private val store: KeyValueStore,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    fun isMonitoringEnabled(): Boolean = store.getBoolean(KEY_ENABLED, false)

    fun setMonitoringEnabled(enabled: Boolean) = store.putBoolean(KEY_ENABLED, enabled)

    fun blockedApps(): List<BlockedAppConfig> =
        readOrEmpty(KEY_BLOCKED_APPS, ConfigCodec::parseBlockedApps)

    /** Validates first: on a [ConfigFormatException] nothing is stored and the old rules stay. */
    fun saveBlockedApps(json: String) {
        val apps = ConfigCodec.parseBlockedApps(json)
        store.putString(KEY_BLOCKED_APPS, ConfigCodec.encodeBlockedApps(apps))
    }

    fun goals(): List<GoalConfig> = readOrEmpty(KEY_GOALS, ConfigCodec::parseGoals)

    /** Validates first: on a [ConfigFormatException] nothing is stored and the old goals stay. */
    fun saveGoals(json: String) {
        val goals = ConfigCodec.parseGoals(json)
        store.putString(KEY_GOALS, ConfigCodec.encodeGoals(goals))
    }

    fun engineState(): EngineState = EngineStateCodec.decode(store.getString(KEY_ENGINE_STATE))

    fun saveEngineState(state: EngineState) = store.putString(KEY_ENGINE_STATE, EngineStateCodec.encode(state))

    fun recordHeartbeat() = store.putLong(KEY_HEARTBEAT, clock())

    fun lastHeartbeatAt(): Long? = store.getLong(KEY_HEARTBEAT)

    /** Liveness is inferred from the heartbeat, which the service writes while it runs. */
    fun isRunning(): Boolean {
        val heartbeat = lastHeartbeatAt() ?: return false
        return clock() - heartbeat <= HEARTBEAT_STALE_MS
    }

    fun recordStopReason(reason: String) = store.putString(KEY_STOP_REASON, reason)

    fun lastStopReason(): String? = store.getString(KEY_STOP_REASON)

    fun status(): MonitorStatus =
        MonitorStatus(isMonitoringEnabled(), isRunning(), lastHeartbeatAt(), lastStopReason())

    /** Stored config was validated when saved; if it is unreadable anyway, behave as if unset. */
    private fun <T> readOrEmpty(key: String, parse: (String) -> List<T>): List<T> {
        val stored = store.getString(key) ?: return emptyList()
        return try {
            parse(stored)
        } catch (e: ConfigFormatException) {
            emptyList()
        }
    }

    companion object {
        /** A heartbeat older than this means the service is no longer running. */
        const val HEARTBEAT_STALE_MS = 90_000L

        private const val KEY_ENABLED = "monitoringEnabled"
        private const val KEY_BLOCKED_APPS = "blockedAppsJson"
        private const val KEY_GOALS = "goalsJson"
        private const val KEY_ENGINE_STATE = "engineStateJson"
        private const val KEY_HEARTBEAT = "lastHeartbeatAt"
        private const val KEY_STOP_REASON = "lastStopReason"
    }
}
