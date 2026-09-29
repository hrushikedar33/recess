package com.appblocker.notify

import com.appblocker.engine.BlockReason
import com.appblocker.engine.EngineAction

data class LimitMessage(val title: String, val text: String)

/** Wording for the limit notification. Pure, so it is testable without Android. */
object LimitMessageFormatter {
    fun format(event: EngineAction.NotifyLimitReached, formatTime: (Long) -> String): LimitMessage =
        when (event.reason) {
            BlockReason.SESSION_COOLDOWN ->
                LimitMessage(
                    title = "Time's up on ${event.appName}",
                    text = "Take a break. ${event.appName} is paused until ${formatTime(event.blockedUntilMs)}.",
                )
            BlockReason.DAILY_LIMIT ->
                LimitMessage(
                    title = "${event.appName} is done for today",
                    text = "You have used your daily time. It opens again tomorrow.",
                )
        }
}
