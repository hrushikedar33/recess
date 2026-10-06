package com.appblocker.service

import com.appblocker.engine.AppRule
import com.appblocker.engine.EngineAction
import com.appblocker.engine.EnforcementEngine
import com.appblocker.store.HealthIssue
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
 * whole design exists to fix. Trouble is recorded as health issues instead, so the UI can say so.
 */
class MonitorTicker(
    private val prefs: RecessPrefs,
    private val engine: EnforcementEngine,
    private val pollForeground: () -> String?,
    private val isScreenOn: () -> Boolean,
    private val healthProbe: HealthProbe,
    private val sink: ActionSink,
    private val clock: () -> Long,
    private val onError: (String, Throwable) -> Unit = { _, _ -> },
    private val coordinator: TakeoverCoordinator = TakeoverCoordinator(),
) {
    private val persistPolicy = PersistPolicy()
    private val ejectThrottle = EjectThrottle()
    private var rules: List<AppRule> = emptyList()
    private var loadedConfigVersion: Long? = null
    private var lastHeartbeatMs: Long? = null
    private var lastPersistedState = engine.snapshot()
    private var lastPersistMs: Long? = null
    private var probeIssues: Set<HealthIssue> = emptySet()
    private var savedHealth: Set<HealthIssue>? = null
    private var intentUnknown = false
    private var rulesUnreadable = false
    private var pollFailing = false
    private var lastIneffectiveEjectMs: Long? = null
    private var foregroundReported = false
    private var reportedForeground: String? = null

    fun tick(): TickOutcome =
        try {
            tickOnce()
        } catch (e: Throwable) {
            onError("Monitor tick failed", e)
            TickOutcome(ERROR_BACKOFF_MS, stop = false)
        }

    private fun tickOnce(): TickOutcome {
        if (!prefs.isMonitoringEnabled()) {
            // A known "off" is the user's decision. An intent that was never written may only mean
            // that storage could not be read, and stopping then is exactly how the toggle used to
            // turn itself off: keep running and say so.
            intentUnknown = !prefs.isIntentKnown()
            if (!intentUnknown) return TickOutcome(SLOW_DELAY_MS, stop = true)
        } else {
            intentUnknown = false
        }

        val nowMs = clock()
        reloadRulesIfChanged()
        beatIfDue(nowMs)

        var foreground: String? = null
        var nextDelayMs = SLOW_DELAY_MS
        if (rules.any { it.isActive } && isScreenOn()) {
            try {
                foreground = pollForeground()
                pollFailing = false
                nextDelayMs = FAST_DELAY_MS
            } catch (e: Exception) {
                // Most likely Usage Access was revoked. Keep the service alive and retry later.
                onError("Foreground poll failed", e)
                pollFailing = true
                nextDelayMs = ERROR_BACKOFF_MS
            }
        }

        ejectThrottle.noteForeground(foreground)
        reportForeground(foreground)
        coordinator.onForeground(foreground)
        // Ticked even when nothing was polled, so a pending block end is never missed.
        engine.tick(nowMs, foreground, rules).forEach { perform(it, nowMs) }
        persistIfDue(nowMs)
        recordHealth(nowMs)
        return TickOutcome(nextDelayMs, stop = false)
    }

    private fun reloadRulesIfChanged() {
        val version = prefs.configVersion()
        if (version == loadedConfigVersion) return
        rules = prefs.blockedApps().map { it.toRule() }
        rulesUnreadable = prefs.hasUnreadableRules()
        loadedConfigVersion = version
    }

    /** Heartbeat and the (comparatively expensive) OS permission checks share one 30 s cadence. */
    private fun beatIfDue(nowMs: Long) {
        val last = lastHeartbeatMs
        if (last != null && nowMs - last < HEARTBEAT_INTERVAL_MS) return
        prefs.recordHeartbeat()
        lastHeartbeatMs = nowMs
        try {
            probeIssues = healthProbe.issues()
        } catch (e: Exception) {
            onError("Health probe failed", e)
        }
    }

    private fun perform(action: EngineAction, nowMs: Long) {
        try {
            when (action) {
                is EngineAction.EjectToHome -> eject(action.packageName, nowMs)
                is EngineAction.NotifyLimitReached -> sink.limitReached(action)
                is EngineAction.BlockEnded -> sink.blockEnded(action)
            }
        } catch (e: Exception) {
            // One failed action must not cost the others, nor the persistence that follows.
            onError("Could not perform ${action::class.java.simpleName}", e)
        }
    }

    /** Tells the sink when the app in front changes; a failed report is retried on the next tick. */
    private fun reportForeground(current: String?) {
        if (foregroundReported && current == reportedForeground) return
        try {
            sink.foregroundChanged(current)
            foregroundReported = true
            reportedForeground = current
        } catch (e: Exception) {
            onError("Could not report the foreground app", e)
        }
    }

    private fun eject(packageName: String, nowMs: Long) {
        // The cover is what really keeps the app unusable, so it is drawn on every tick and does not
        // wait for the eject throttle; a failure to draw it must not cost the attempt to go home.
        try {
            sink.blockedAppInFront(packageName)
        } catch (e: Exception) {
            onError("Could not cover the blocked app", e)
        }
        val plan = coordinator.onBlockedAppInFront(packageName, nowMs)
        plan.launchBreakAfterMs?.let { delayMs ->
            try {
                sink.launchBreak(delayMs)
            } catch (e: Exception) {
                onError("Could not start the Break screen", e)
            }
        }
        // While the Break screen is on its way a HOME would land on top of it, so it waits.
        if (!plan.allowHome) return
        val verdict = ejectThrottle.onEject(packageName, nowMs)
        if (verdict.ineffective) lastIneffectiveEjectMs = nowMs
        if (verdict.send) sink.ejectToHome(packageName)
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

    private fun recordHealth(nowMs: Long) {
        val issues = probeIssues.toMutableSet()
        if (intentUnknown) issues += HealthIssue.INTENT_UNKNOWN
        if (rulesUnreadable) issues += HealthIssue.RULES_UNREADABLE
        if (pollFailing) issues += HealthIssue.POLL_FAILING
        val ineffective = lastIneffectiveEjectMs
        if (ineffective != null && nowMs - ineffective < EJECT_WARNING_MS) issues += HealthIssue.EJECT_INEFFECTIVE

        if (issues == (savedHealth ?: prefs.healthIssues())) {
            savedHealth = issues
            return
        }
        prefs.saveHealthIssues(issues)
        savedHealth = issues
    }

    companion object {
        const val FAST_DELAY_MS = 1_000L
        const val SLOW_DELAY_MS = 5_000L
        const val ERROR_BACKOFF_MS = 5_000L
        const val HEARTBEAT_INTERVAL_MS = 30_000L
        private const val EJECT_WARNING_MS = 30_000L
    }
}
