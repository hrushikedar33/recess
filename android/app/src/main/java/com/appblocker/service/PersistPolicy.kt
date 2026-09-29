package com.appblocker.service

import com.appblocker.engine.EngineState

/**
 * Decides when engine state must be written to storage. Block changes are written immediately
 * (losing one would let a cooldown be evaded by a restart); usage that merely ticks up is written
 * at most once per [intervalMs] so a 1 s loop does not write to disk every second.
 */
class PersistPolicy(private val intervalMs: Long = DEFAULT_INTERVAL_MS) {
    fun shouldPersist(
        previous: EngineState,
        current: EngineState,
        nowMs: Long,
        lastPersistMs: Long?,
    ): Boolean {
        if (lastPersistMs == null) return true
        if (blocksOf(previous) != blocksOf(current)) return true
        // Compare the usage itself, not the whole state: the tick time changes every tick, which
        // would otherwise make every interval write happen even while nothing is being counted.
        if (previous.apps == current.apps) return false
        return nowMs - lastPersistMs >= intervalMs
    }

    private fun blocksOf(state: EngineState) =
        state.apps
            .mapNotNull { (packageName, usage) ->
                usage.blockedUntilMs?.let { packageName to (it to usage.blockReason) }
            }
            .toMap()

    companion object {
        const val DEFAULT_INTERVAL_MS = 10_000L
    }
}
