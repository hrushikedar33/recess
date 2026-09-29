package com.appblocker.store

import com.appblocker.engine.EngineState
import com.appblocker.engine.EngineStateCodec

data class MonitorStatus(
    val enabled: Boolean,
    val running: Boolean,
    val lastHeartbeatAt: Long?,
    val lastStopReason: String?,
    val health: List<String>,
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

    /**
     * Writes the user's intent durably and remembers that it was ever written, so "off because the
     * user said so" can be told apart from "off because the storage could not be read".
     * Throws if the write did not reach storage: the caller must not pretend it worked.
     */
    fun setMonitoringEnabled(enabled: Boolean) {
        check(store.putBoolean(KEY_ENABLED, enabled)) { "Could not persist the monitoring intent" }
        store.putLong(KEY_INTENT_UPDATED_AT, clock())
    }

    fun blockedApps(): List<BlockedAppConfig> =
        readOrEmpty(KEY_BLOCKED_APPS, ConfigCodec::parseBlockedApps)

    /** Validates first: on a [ConfigFormatException] nothing is stored and the old rules stay. */
    fun saveBlockedApps(json: String) {
        val apps = ConfigCodec.parseBlockedApps(json)
        store.putString(KEY_BLOCKED_APPS, ConfigCodec.encodeBlockedApps(apps))
        advanceConfigVersion()
    }

    fun goals(): List<GoalConfig> = readOrEmpty(KEY_GOALS, ConfigCodec::parseGoals)

    /** Validates first: on a [ConfigFormatException] nothing is stored and the old goals stay. */
    fun saveGoals(json: String) {
        val goals = ConfigCodec.parseGoals(json)
        store.putString(KEY_GOALS, ConfigCodec.encodeGoals(goals))
        advanceConfigVersion()
    }

    /**
     * Advances whenever rules or goals are saved, so the monitor can notice a change with one
     * cheap read instead of re-parsing the config on every tick.
     */
    fun configVersion(): Long = store.getLong(KEY_CONFIG_VERSION) ?: 0L

    /** The most recent limit event, kept so the Break screen can show what the notification showed. */
    fun saveLimitEvent(json: String) {
        store.putStringDurable(KEY_LIMIT_EVENT, json)
    }

    fun lastLimitEventJson(): String? = store.getString(KEY_LIMIT_EVENT)

    fun engineState(): EngineState = EngineStateCodec.decode(store.getString(KEY_ENGINE_STATE))

    /** Durable: a block that is lost to a process kill would let a cooldown be evaded. */
    fun saveEngineState(state: EngineState) {
        store.putStringDurable(KEY_ENGINE_STATE, EngineStateCodec.encode(state))
    }

    fun recordHeartbeat() = store.putLong(KEY_HEARTBEAT, clock())

    fun lastHeartbeatAt(): Long? = store.getLong(KEY_HEARTBEAT)

    /** Whether the service wrote a heartbeat recently. Only a hang signal: it can look stale during deep sleep. */
    fun isHeartbeatFresh(): Boolean {
        val heartbeat = lastHeartbeatAt() ?: return false
        return clock() - heartbeat <= HEARTBEAT_STALE_MS
    }

    fun recordStopReason(reason: String) {
        store.putStringDurable(KEY_STOP_REASON, reason)
    }

    fun lastStopReason(): String? = store.getString(KEY_STOP_REASON)

    /** [running] is the live in-process flag, which is exact; the heartbeat is not. */
    fun status(running: Boolean): MonitorStatus =
        MonitorStatus(
            isMonitoringEnabled(),
            running,
            lastHeartbeatAt(),
            lastStopReason(),
            healthIssues().map { it.name }.sorted(),
        )

    /** False if the intent was never written, i.e. an "off" here may just mean unreadable storage. */
    fun isIntentKnown(): Boolean = store.getLong(KEY_INTENT_UPDATED_AT) != null

    fun healthIssues(): Set<HealthIssue> =
        store.getString(KEY_HEALTH)
            .orEmpty()
            .split(',')
            .mapNotNull { name -> HealthIssue.values().firstOrNull { it.name == name.trim() } }
            .toSet()

    fun saveHealthIssues(issues: Set<HealthIssue>) =
        store.putString(KEY_HEALTH, issues.map { it.name }.sorted().joinToString(","))

    /** True when rules are stored but cannot be read, which would otherwise look like "no rules". */
    fun hasUnreadableRules(): Boolean {
        val stored = store.getString(KEY_BLOCKED_APPS) ?: return false
        return try {
            ConfigCodec.parseBlockedApps(stored)
            false
        } catch (e: ConfigFormatException) {
            true
        }
    }

    private fun advanceConfigVersion() = store.putLong(KEY_CONFIG_VERSION, configVersion() + 1)

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
        private const val KEY_CONFIG_VERSION = "configVersion"
        private const val KEY_ENGINE_STATE = "engineStateJson"
        private const val KEY_HEARTBEAT = "lastHeartbeatAt"
        private const val KEY_INTENT_UPDATED_AT = "intentUpdatedAt"
        private const val KEY_HEALTH = "healthIssues"
        private const val KEY_LIMIT_EVENT = "lastLimitEventJson"
        private const val KEY_STOP_REASON = "lastStopReason"
    }
}
