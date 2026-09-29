package com.appblocker.notify

import com.appblocker.engine.EngineAction
import com.appblocker.quotes.QuoteRepository
import com.appblocker.store.RecessPrefs

/**
 * Builds what the user sees when a limit is reached and remembers it, so the notification and the
 * Break screen show the very same quote.
 */
class LimitAlerts(
    private val quotes: QuoteRepository,
    private val prefs: RecessPrefs,
    private val clock: () -> Long,
    private val formatTime: (Long) -> String,
) {
    fun compose(event: EngineAction.NotifyLimitReached): LimitMessage {
        val quote = quotes.next()
        val message = LimitMessageFormatter.format(event, quote, prefs.goals(), formatTime)
        prefs.saveLimitEvent(
            LimitEventSnapshotCodec.encode(
                LimitEventSnapshot(
                    packageName = event.packageName,
                    appName = event.appName,
                    reason = event.reason,
                    blockedUntilMs = event.blockedUntilMs,
                    quote = quote,
                    createdAtMs = clock(),
                ),
            ),
        )
        return message
    }
}
