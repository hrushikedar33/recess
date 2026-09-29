package com.appblocker.notify

import com.appblocker.engine.BlockReason
import com.appblocker.engine.EngineAction
import com.appblocker.quotes.QuoteRepository
import com.appblocker.store.RecessPrefs

/**
 * Builds what the user sees when a limit is reached and remembers it, so the notification and the
 * Break screen show the very same quote.
 */
class LimitAlerts(
    /** Built per event, so quotes fetched online after the service started are used straight away. */
    private val quotes: () -> QuoteRepository,
    private val prefs: RecessPrefs,
    private val clock: () -> Long,
    private val formatTime: (Long) -> String,
) {
    fun compose(event: EngineAction.NotifyLimitReached): LimitMessage {
        val quote = quotes().next()
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

    /**
     * The message for an app that is already blocked and has been opened again, built from what is
     * stored: who is blocked, until when, and why. Null if the app is not blocked right now. It
     * shows the same quote as the notification did and never overwrites the saved limit event.
     */
    fun composeForBlock(packageName: String): LimitMessage? {
        val usage = prefs.engineState().apps[packageName] ?: return null
        val blockedUntilMs = usage.blockedUntilMs ?: return null
        if (blockedUntilMs <= clock()) return null

        val appName = prefs.blockedApps().firstOrNull { it.packageName == packageName }?.appName ?: packageName
        val event =
            EngineAction.NotifyLimitReached(
                packageName = packageName,
                appName = appName,
                reason = usage.blockReason ?: BlockReason.SESSION_COOLDOWN,
                blockedUntilMs = blockedUntilMs,
                sessionUsedMs = usage.sessionUsedMs,
                dailyUsedMs = usage.dailyUsedMs,
            )
        val saved = LimitEventSnapshotCodec.decode(prefs.lastLimitEventJson())
        val quote = saved?.takeIf { it.packageName == packageName }?.quote ?: quotes().next()
        return LimitMessageFormatter.format(event, quote, prefs.goals(), formatTime)
    }
}
