package com.appblocker.engine

import com.appblocker.engine.EngineAction.BlockEnded
import com.appblocker.engine.EngineAction.EjectToHome
import com.appblocker.engine.EngineAction.NotifyLimitReached

/**
 * Decides what to do about limited apps. Pure: it is told the time and the foreground app and
 * answers with [EngineAction]s; it never touches the OS.
 *
 * Two limits are tracked at once per app:
 *  - a session limit, which blocks the app for the cooldown, and
 *  - an optional daily budget, which blocks it until the next local midnight (and wins a tie).
 *
 * The system clock is trusted: setting the device clock forward is not defended against.
 */
class EnforcementEngine(
    private val dayClock: DayClock,
    private val config: EngineConfig = EngineConfig(),
    initialState: EngineState = EngineState.EMPTY,
) {
    private var state: EngineState = initialState

    fun snapshot(): EngineState = state

    fun tick(
        nowMs: Long,
        foregroundPackage: String?,
        rules: List<AppRule>,
    ): List<EngineAction> {
        val actions = mutableListOf<EngineAction>()
        val today = dayClock.dayKey(nowMs)

        // Every tracked app moves on with the clock, whether or not it is in front.
        val apps = mutableMapOf<String, AppUsage>()
        for ((packageName, saved) in state.apps) {
            val usage = rollForward(packageName, saved, nowMs, today, actions)
            if (!usage.isIdle()) apps[packageName] = usage
        }

        val rule = rules.lastOrNull { it.isActive && it.packageName == foregroundPackage }
        if (foregroundPackage != null && rule != null) {
            val current = apps[foregroundPackage] ?: AppUsage(today, 0L, 0L, null, null)
            val updated = tickForeground(rule, current, nowMs, actions)
            if (updated.isIdle()) apps.remove(foregroundPackage) else apps[foregroundPackage] = updated
        }

        state = EngineState(apps, nowMs, foregroundPackage)
        return actions
    }

    /** Applies a new day and expired blocks to [saved]. */
    private fun rollForward(
        packageName: String,
        saved: AppUsage,
        nowMs: Long,
        today: String,
        actions: MutableList<EngineAction>,
    ): AppUsage {
        var usage = saved
        if (usage.dayKey != today) usage = usage.copy(dayKey = today, dailyUsedMs = 0L)

        val blockedUntil = usage.blockedUntilMs
        val reason = usage.blockReason
        if (blockedUntil != null && reason != null && nowMs >= blockedUntil) {
            actions += BlockEnded(packageName, reason)
            usage = usage.copy(blockedUntilMs = null, blockReason = null, sessionUsedMs = 0L)
        }
        return usage
    }

    private fun tickForeground(
        rule: AppRule,
        current: AppUsage,
        nowMs: Long,
        actions: MutableList<EngineAction>,
    ): AppUsage {
        if (current.blockedUntilMs != null) {
            actions += EjectToHome(rule.packageName)
            return current
        }

        val credit = creditFor(rule.packageName, nowMs)
        val usage =
            current.copy(
                dailyUsedMs = current.dailyUsedMs + credit,
                sessionUsedMs = current.sessionUsedMs + credit,
            )

        val dailyBudgetSpent = rule.dailyLimitMs != null && usage.dailyUsedMs >= rule.dailyLimitMs
        val sessionLimitReached = usage.sessionUsedMs >= rule.sessionLimitMs
        return when {
            dailyBudgetSpent ->
                block(rule, usage, BlockReason.DAILY_LIMIT, dayClock.nextDayStartMs(nowMs), actions)
            sessionLimitReached && rule.cooldownMs > 0 ->
                block(rule, usage, BlockReason.SESSION_COOLDOWN, nowMs + rule.cooldownMs, actions)
            sessionLimitReached -> {
                // No cooldown configured: announce it once and start a fresh session, no block.
                announce(rule, usage, BlockReason.SESSION_COOLDOWN, nowMs, actions)
                usage.copy(sessionUsedMs = 0L)
            }
            else -> usage
        }
    }

    /** Usage to credit for this tick: elapsed time if the same app was in front last tick, capped. */
    private fun creditFor(packageName: String, nowMs: Long): Long {
        val lastTickMs = state.lastTickMs
        if (lastTickMs == null || state.lastForegroundPackage != packageName) return 0L
        return (nowMs - lastTickMs).coerceIn(0L, config.maxCreditMs)
    }

    private fun block(
        rule: AppRule,
        usage: AppUsage,
        reason: BlockReason,
        blockedUntilMs: Long,
        actions: MutableList<EngineAction>,
    ): AppUsage {
        announce(rule, usage, reason, blockedUntilMs, actions)
        return usage.copy(blockedUntilMs = blockedUntilMs, blockReason = reason)
    }

    /** Eject first so the caller can show its screen and notification over the home screen. */
    private fun announce(
        rule: AppRule,
        usage: AppUsage,
        reason: BlockReason,
        blockedUntilMs: Long,
        actions: MutableList<EngineAction>,
    ) {
        actions += EjectToHome(rule.packageName)
        actions +=
            NotifyLimitReached(
                packageName = rule.packageName,
                appName = rule.appName,
                reason = reason,
                blockedUntilMs = blockedUntilMs,
                sessionUsedMs = usage.sessionUsedMs,
                dailyUsedMs = usage.dailyUsedMs,
            )
    }

    private fun AppUsage.isIdle(): Boolean =
        dailyUsedMs == 0L && sessionUsedMs == 0L && blockedUntilMs == null
}
