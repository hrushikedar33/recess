package com.appblocker.store

import com.appblocker.engine.EngineState
import com.appblocker.engine.EngineStateCodec
import com.appblocker.quotes.Quote
import com.appblocker.quotes.QuoteCodec
import com.appblocker.quotes.QuotePool

data class MonitorStatus(
    val enabled: Boolean,
    val running: Boolean,
    val lastHeartbeatAt: Long?,
    val lastStopReason: String?,
    val lastStopReasonAt: Long?,
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
    fun saveBlockedApps(json: String?) {
        val apps = ConfigCodec.parseBlockedApps(json ?: throw ConfigFormatException("apps: payload is missing"))
        store.putString(KEY_BLOCKED_APPS, ConfigCodec.encodeBlockedApps(apps))
        advanceConfigVersion()
    }

    fun goals(): List<GoalConfig> = readOrEmpty(KEY_GOALS, ConfigCodec::parseGoals)

    /** Validates first: on a [ConfigFormatException] nothing is stored and the old goals stay. */
    fun saveGoals(json: String?) {
        val goals = ConfigCodec.parseGoals(json ?: throw ConfigFormatException("goals: payload is missing"))
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

    /**
     * Quotes fetched online (an opt-in feature), replacing the previous set. The payload must be a
     * JSON list. It comes from the internet, so it is checked here, before anything is stored:
     * entries that are not safe quotes (see [QuotePool]) are dropped, as are repeats and anything
     * past the cap. The write is durable, so a process kill cannot bring back a set the user just
     * switched off. An empty result also clears the saved limit event, which may hold one of the
     * quotes that were just removed.
     */
    fun saveExtraQuotes(json: String?) {
        val payload = json ?: throw ConfigFormatException("quotes: payload is missing")
        val entries =
            try {
                org.json.JSONArray(payload).length()
            } catch (e: org.json.JSONException) {
                throw ConfigFormatException("quotes: not a JSON list")
            }
        if (entries > MAX_EXTRA_QUOTE_ENTRIES) throw ConfigFormatException("quotes: more than $MAX_EXTRA_QUOTE_ENTRIES entries")
        val safe = QuotePool.merge(emptyList(), QuoteCodec.parse(payload))
        check(store.putStringDurable(KEY_EXTRA_QUOTES, QuoteCodec.encode(safe))) { "Could not persist the extra quotes" }
        if (safe.isEmpty()) {
            check(store.removeDurable(KEY_LIMIT_EVENT)) { "Could not clear the saved limit event" }
        }
    }

    fun extraQuotes(): List<Quote> = QuoteCodec.parse(store.getString(KEY_EXTRA_QUOTES))

    fun engineState(): EngineState = EngineStateCodec.decode(store.getString(KEY_ENGINE_STATE))

    /** Durable: a block that is lost to a process kill would let a cooldown be evaded. */
    fun saveEngineState(state: EngineState) {
        store.putStringDurable(KEY_ENGINE_STATE, EngineStateCodec.encode(state))
    }

    fun recordHeartbeat() = store.putLong(KEY_HEARTBEAT, clock())

    fun lastHeartbeatAt(): Long? = store.getLong(KEY_HEARTBEAT)

    /** Recorded with its time, so the same reason happening twice can be told apart. */
    fun recordStopReason(reason: String) {
        store.putStringDurable(KEY_STOP_REASON, reason)
        store.putLong(KEY_STOP_REASON_AT, clock())
    }

    fun lastStopReason(): String? = store.getString(KEY_STOP_REASON)

    fun lastStopReasonAt(): Long? = store.getLong(KEY_STOP_REASON_AT)

    /** [running] is the live in-process flag, which is exact; the heartbeat is not. */
    fun status(running: Boolean): MonitorStatus =
        MonitorStatus(
            isMonitoringEnabled(),
            running,
            lastHeartbeatAt(),
            lastStopReason(),
            lastStopReasonAt(),
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

        private const val KEY_ENABLED = "monitoringEnabled"
        private const val KEY_BLOCKED_APPS = "blockedAppsJson"
        private const val KEY_GOALS = "goalsJson"
        private const val KEY_CONFIG_VERSION = "configVersion"
        private const val KEY_ENGINE_STATE = "engineStateJson"
        private const val KEY_HEARTBEAT = "lastHeartbeatAt"
        private const val KEY_INTENT_UPDATED_AT = "intentUpdatedAt"
        private const val KEY_HEALTH = "healthIssues"
        private const val KEY_LIMIT_EVENT = "lastLimitEventJson"
        private const val KEY_EXTRA_QUOTES = "extraQuotesJson"
        private const val MAX_EXTRA_QUOTE_ENTRIES = 500
        private const val KEY_STOP_REASON = "lastStopReason"
        private const val KEY_STOP_REASON_AT = "lastStopReasonAt"
    }
}
