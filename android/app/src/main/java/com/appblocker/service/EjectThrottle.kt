package com.appblocker.service

/**
 * Decides whether an eject (a HOME intent) should really be sent. Usage events lag a little, so the
 * blocked app is still "in front" for a tick or two after HOME; sending HOME every tick would reset
 * the launcher over and over. It also notices when ejecting is not working: the same app coming back
 * again and again means the OS is dropping the HOME intent (or something is fighting it).
 */
class EjectThrottle(
    private val minIntervalMs: Long = MIN_INTERVAL_MS,
    private val ineffectiveAfter: Int = INEFFECTIVE_AFTER,
    private val resetAfterMs: Long = RESET_AFTER_MS,
) {
    data class Verdict(val send: Boolean, val ineffective: Boolean)

    private class State(var lastSentAtMs: Long, var lastSeenAtMs: Long, var streak: Int)

    private val states = mutableMapOf<String, State>()

    /**
     * Tells the throttle what is in front now. An eject only counts as failing while the *same*
     * app stays in front; once it (or anything else) has been replaced, the ejects worked.
     */
    fun noteForeground(currentPackage: String?) {
        for ((packageName, state) in states) {
            if (packageName != currentPackage) state.streak = 0
        }
    }

    fun onEject(packageName: String, nowMs: Long): Verdict {
        val state = states[packageName]
        if (state == null) {
            states[packageName] = State(nowMs, nowMs, 1)
            return Verdict(send = true, ineffective = 1 >= ineffectiveAfter)
        }

        if (nowMs - state.lastSeenAtMs > resetAfterMs) state.streak = 0
        state.lastSeenAtMs = nowMs
        if (nowMs - state.lastSentAtMs < minIntervalMs) {
            return Verdict(send = false, ineffective = state.streak >= ineffectiveAfter)
        }
        state.streak += 1
        state.lastSentAtMs = nowMs
        return Verdict(send = true, ineffective = state.streak >= ineffectiveAfter)
    }

    companion object {
        const val MIN_INTERVAL_MS = 1_500L
        const val INEFFECTIVE_AFTER = 5
        const val RESET_AFTER_MS = 10_000L
    }
}
