package com.appblocker.service

/**
 * What to do on this tick while a blocked app is in front.
 *
 * @property launchBreakAfterMs start the Break screen after this many milliseconds (0 = now), or
 *   null if no launch is due.
 * @property allowHome a home-screen attempt is acceptable. It is not while a Break launch is on its
 *   way: a HOME arriving after the Break screen would put the launcher on top of it.
 */
data class TakeoverPlan(val launchBreakAfterMs: Long?, val allowHome: Boolean)

/**
 * Decides, per "episode", how the takeover plays out. An episode is one continuous stretch of a
 * blocked app being in front. In an episode: the Break screen is started shortly after the cover is
 * up (the phone only allows that while the cover window is visible), once more if the blocked app is
 * still in front a little later, and only when both launches had their chance does a plain
 * home-screen attempt become acceptable (the last resort). Pure and clock-injected so the timing is
 * unit-tested; the service only carries the plan out.
 */
class TakeoverCoordinator(
    private val firstLaunchDelayMs: Long = FIRST_LAUNCH_DELAY_MS,
    private val retryDelayMs: Long = RETRY_DELAY_MS,
    private val maxLaunches: Int = MAX_LAUNCHES,
    private val staleAfterMs: Long = STALE_AFTER_MS,
) {
    private class Episode(val packageName: String, var lastTickMs: Long) {
        var launches = 0
        var lastLaunchAtMs = 0L
    }

    private var episode: Episode? = null

    /** Called on every tick the blocked app is in front. */
    fun onBlockedAppInFront(packageName: String, nowMs: Long): TakeoverPlan {
        var current = episode
        // A long silence with no foreground report means something was missed: start over.
        if (current == null || current.packageName != packageName || nowMs - current.lastTickMs > staleAfterMs) {
            current = Episode(packageName, nowMs)
            episode = current
        }
        current.lastTickMs = nowMs

        var launchAfterMs: Long? = null
        if (current.launches == 0) {
            current.launches = 1
            current.lastLaunchAtMs = nowMs + firstLaunchDelayMs
            launchAfterMs = firstLaunchDelayMs
        } else if (current.launches < maxLaunches && nowMs - current.lastLaunchAtMs >= retryDelayMs) {
            current.launches += 1
            current.lastLaunchAtMs = nowMs
            launchAfterMs = 0L
        }

        val exhausted = current.launches >= maxLaunches && nowMs - current.lastLaunchAtMs >= retryDelayMs
        return TakeoverPlan(launchBreakAfterMs = launchAfterMs, allowHome = exhausted)
    }

    /** Called with whatever is in front now (null: nothing). Anything but the blocked app ends the episode. */
    fun onForeground(current: String?) {
        if (current != episode?.packageName) episode = null
    }

    fun reset() {
        episode = null
    }

    companion object {
        const val FIRST_LAUNCH_DELAY_MS = 300L
        const val RETRY_DELAY_MS = 1_500L
        const val MAX_LAUNCHES = 2
        const val STALE_AFTER_MS = 10_000L
    }
}
