package com.appblocker.detector

/** The package believed to be in front, and the timestamp of the event that said so. */
data class ForegroundState(
    val packageName: String?,
    val timestampMs: Long,
) {
    companion object {
        val UNKNOWN = ForegroundState(null, 0L)
    }
}

object ForegroundReducer {
    /** First poll looks this far back to learn what is already in front. */
    const val BOOTSTRAP_LOOKBACK_MS = 10 * 60 * 1000L

    /** Later polls re-read this much before the previous query, in case events arrive late. */
    const val OVERLAP_MS = 5_000L

    /**
     * Folds usage [events] into [state]: the latest resume event wins. Events older than the
     * state are ignored (they are re-reads from the overlap or late arrivals), so the result does
     * not depend on how the events were batched.
     */
    fun reduce(state: ForegroundState, events: List<UsageEventRecord>): ForegroundState {
        var current = state
        for (event in events) {
            if (event.kind == UsageEventKind.RESUMED && event.timestampMs >= current.timestampMs) {
                current = ForegroundState(event.packageName, event.timestampMs)
            }
        }
        return current
    }

    /**
     * Where the next query should start: just before the previous one ended, but never earlier than
     * the bootstrap lookback (after a long screen-off) and never in the future (clock moved back).
     */
    fun windowStartMs(nowMs: Long, previousQueryEndMs: Long?): Long {
        val earliest = nowMs - BOOTSTRAP_LOOKBACK_MS
        val previous = previousQueryEndMs ?: return earliest
        return (previous - OVERLAP_MS).coerceIn(earliest, nowMs)
    }
}
