package com.appblocker.service

import com.appblocker.engine.AppRule
import com.appblocker.engine.EngineAction
import com.appblocker.engine.EnforcementEngine
import com.appblocker.store.RecessPrefs
import com.appblocker.store.toRule

/** What the loop should do after a tick: wait [nextDelayMs] and go again, unless [stop]. */
data class TickOutcome(val nextDelayMs: Long, val stop: Boolean)

/**
 * One step of the monitor, free of Android so it can be unit-tested: check the user's intent,
 * poll the foreground app, let the engine decide, carry out the decisions, and persist. The
 * Android service only supplies the collaborators and the timer.
 *
 * Nothing in here may throw out of [tick]: a monitor that dies on one bad tick is the bug this
 * whole design exists to fix.
 */
class MonitorTicker(
    private val prefs: RecessPrefs,
    private val engine: EnforcementEngine,
    private val pollForeground: () -> String?,
    private val isScreenOn: () -> Boolean,
    private val sink: ActionSink,
    private val clock: () -> Long,
    private val onError: (String, Throwable) -> Unit = { _, _ -> },
) {
    private val persistPolicy = PersistPolicy()
    private var rules: List<AppRule> = emptyList()
    private var loadedConfigVersion: Long? = null
    private var lastHeartbeatMs: Long? = null
    private var lastPersistedState = engine.snapshot()
    private var lastPersistMs: Long? = null

    fun tick(): TickOutcome {
        if (!prefs.isMonitoringEnabled()) return TickOutcome(SLOW_DELAY_MS, stop = true)

        val nowMs = clock()
        reloadRulesIfChanged()
        beatIfDue(nowMs)

        var foreground: String? = null
        var nextDelayMs = SLOW_DELAY_MS
        if (rules.any { it.isActive } && isScreenOn()) {
            try {
                foreground = pollForeground()
                nextDelayMs = FAST_DELAY_MS
            } catch (e: Exception) {
                // Most likely Usage Access was revoked. Keep the service alive and retry later.
                onError("Foreground poll failed", e)
                nextDelayMs = ERROR_BACKOFF_MS
            }
        }

        // Ticked even when nothing was polled, so blocks still end on time with the screen off.
        engine.tick(nowMs, foreground, rules).forEach(::perform)
        persistIfDue(nowMs)
        return TickOutcome(nextDelayMs, stop = false)
    }

    private fun reloadRulesIfChanged() {
        val version = prefs.configVersion()
        if (version == loadedConfigVersion) return
        rules = prefs.blockedApps().map { it.toRule() }
        loadedConfigVersion = version
    }

    private fun beatIfDue(nowMs: Long) {
        val last = lastHeartbeatMs
        if (last != null && nowMs - last < HEARTBEAT_INTERVAL_MS) return
        prefs.recordHeartbeat()
        lastHeartbeatMs = nowMs
    }

    private fun perform(action: EngineAction) {
        try {
            when (action) {
                is EngineAction.EjectToHome -> sink.ejectToHome(action.packageName)
                is EngineAction.NotifyLimitReached -> sink.limitReached(action)
                is EngineAction.BlockEnded -> sink.blockEnded(action)
            }
        } catch (e: Exception) {
            // One failed action must not cost the others, nor the persistence that follows.
            onError("Could not perform ${action::class.java.simpleName}", e)
        }
    }

    private fun persistIfDue(nowMs: Long) {
        val current = engine.snapshot()
        if (!persistPolicy.shouldPersist(lastPersistedState, current, nowMs, lastPersistMs)) return
        try {
            prefs.saveEngineState(current)
            lastPersistedState = current
            lastPersistMs = nowMs
        } catch (e: Exception) {
            onError("Could not persist engine state", e)
        }
    }

    companion object {
        const val FAST_DELAY_MS = 1_000L
        const val SLOW_DELAY_MS = 5_000L
        const val ERROR_BACKOFF_MS = 5_000L
        const val HEARTBEAT_INTERVAL_MS = 30_000L
    }
}
