package com.appblocker.detector

/**
 * Reports which app is in front. The first poll reads a wide window to learn the current app;
 * every later poll reads only the events since the previous one, so a 1 s poll loop stays cheap.
 * Not thread-safe: poll from one thread.
 */
class ForegroundAppDetector(
    private val source: UsageEventSource,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private var state = ForegroundState.UNKNOWN
    private var previousQueryEndMs: Long? = null
    private var lastFallbackAttemptMs: Long? = null

    /** The foreground package, or null when the screen is off or nothing is known. */
    fun poll(): String? {
        if (!source.isInteractive()) return null

        val nowMs = clock()
        val events = source.queryEvents(ForegroundReducer.windowStartMs(nowMs, previousQueryEndMs), nowMs)
        state = ForegroundReducer.reduce(state, events)
        // Only after a successful query, so a failure is retried over the same window.
        previousQueryEndMs = nowMs

        if (state.packageName == null && fallbackIsDue(nowMs)) {
            lastFallbackAttemptMs = nowMs
            source.mostRecentlyUsedPackage(nowMs - FALLBACK_LOOKBACK_MS, nowMs)?.let {
                state = ForegroundState(it, nowMs)
            }
        }
        return state.packageName
    }

    /** Not every poll: with nothing to find (or permission revoked) that would hammer the OS. */
    private fun fallbackIsDue(nowMs: Long): Boolean {
        val last = lastFallbackAttemptMs ?: return true
        return nowMs - last >= FALLBACK_RETRY_MS
    }

    private companion object {
        const val FALLBACK_LOOKBACK_MS = 60 * 1000L
        const val FALLBACK_RETRY_MS = 30 * 1000L
    }
}
