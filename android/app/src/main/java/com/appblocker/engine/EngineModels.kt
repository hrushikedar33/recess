package com.appblocker.engine

/** Why an app is currently blocked. */
enum class BlockReason {
    /** The per-session limit was reached; blocked for the cooldown. */
    SESSION_COOLDOWN,

    /** The daily budget was spent; blocked until the next local midnight. */
    DAILY_LIMIT,
}

/**
 * The limits the user configured for one app. All durations are milliseconds.
 * [dailyLimitMs] is null when the user has not set a daily budget.
 */
data class AppRule(
    val packageName: String,
    val appName: String,
    val sessionLimitMs: Long,
    val cooldownMs: Long,
    val dailyLimitMs: Long?,
    val isActive: Boolean = true,
)

/** What the engine has counted so far for one app on [dayKey]. */
data class AppUsage(
    val dayKey: String,
    val dailyUsedMs: Long,
    val sessionUsedMs: Long,
    val blockedUntilMs: Long?,
    val blockReason: BlockReason?,
)

/** Everything the engine needs to resume after a restart. */
data class EngineState(
    val apps: Map<String, AppUsage>,
    val lastTickMs: Long?,
    val lastForegroundPackage: String?,
) {
    companion object {
        val EMPTY = EngineState(emptyMap(), null, null)
    }
}

data class EngineConfig(
    /** Longest stretch of one tick that may be credited as usage (covers screen-off / paused gaps). */
    val maxCreditMs: Long = 3_000L,
)

/** Side effects the caller must perform. The engine itself never touches the OS. */
sealed interface EngineAction {
    data class EjectToHome(val packageName: String) : EngineAction

    /** Emitted exactly once each time an app becomes blocked. */
    data class NotifyLimitReached(
        val packageName: String,
        val appName: String,
        val reason: BlockReason,
        val blockedUntilMs: Long,
        val sessionUsedMs: Long,
        val dailyUsedMs: Long,
    ) : EngineAction

    data class BlockEnded(val packageName: String, val reason: BlockReason) : EngineAction
}
