package com.appblocker.notify

import com.appblocker.engine.BlockReason
import com.appblocker.engine.EngineAction
import com.appblocker.quotes.Quote
import com.appblocker.store.GoalConfig

/**
 * What the user is told, in parts so each surface can lay it out itself: the notification (collapsed
 * and expanded) and the full-screen takeover.
 *
 * @property status what happened and when the app opens again
 * @property quote the quote with its author, on one line
 * @property goals the "Your goals" section, or a nudge when there is nothing to list
 */
data class LimitMessage(val title: String, val status: String, val quote: String, val goals: String) {
    /**
     * The collapsed line, which is all that shows in a heads-up or an unexpanded drawer entry, so
     * it carries the quote rather than the bookkeeping.
     */
    val text: String get() = quote

    /** The expanded body: quote, then goals, then the status. */
    val bigText: String get() = "$quote\n\n$goals\n\n$status"
}

/** Wording for the limit notification. Pure, so it is testable without Android. */
object LimitMessageFormatter {
    private const val MAX_GOALS_SHOWN = 5
    private const val MAX_GOAL_CHARS = 60
    private const val OPEN_QUOTE = "“"
    private const val CLOSE_QUOTE = "”"
    private const val DASH = "—"
    private const val BULLET = "•"
    private const val ELLIPSIS = "…"

    fun format(
        event: EngineAction.NotifyLimitReached,
        quote: Quote,
        goals: List<GoalConfig>,
        formatTime: (Long) -> String,
    ): LimitMessage {
        val (title, status) =
            when (event.reason) {
                BlockReason.SESSION_COOLDOWN ->
                    "Time's up on ${event.appName}" to
                        "Take a break. ${event.appName} is paused until ${formatTime(event.blockedUntilMs)}."
                BlockReason.DAILY_LIMIT ->
                    "${event.appName} is done for today" to
                        "You have used your daily time. It opens again tomorrow."
            }
        val quoteLine = "$OPEN_QUOTE${quote.text}$CLOSE_QUOTE $DASH ${quote.author}"
        return LimitMessage(title, status, quoteLine, goalsSection(goals))
    }

    private fun goalsSection(goals: List<GoalConfig>): String {
        if (goals.isEmpty()) return "Add a goal in Recess so it shows up here."
        val unfinished = goals.filter { !it.done }
        if (unfinished.isEmpty()) return "All your goals are done. Nice work."

        val lines = mutableListOf("Your goals:")
        unfinished.take(MAX_GOALS_SHOWN).forEach { lines += "$BULLET ${shorten(it.title)}" }
        val hidden = unfinished.size - MAX_GOALS_SHOWN
        if (hidden > 0) lines += "+$hidden more"
        return lines.joinToString("\n")
    }

    private fun shorten(title: String): String =
        if (title.length <= MAX_GOAL_CHARS) title else title.take(MAX_GOAL_CHARS - 1) + ELLIPSIS
}
