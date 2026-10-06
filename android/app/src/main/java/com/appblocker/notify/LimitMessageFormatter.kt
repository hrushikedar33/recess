package com.appblocker.notify

import com.appblocker.engine.BlockReason
import com.appblocker.engine.EngineAction
import com.appblocker.quotes.Quote
import com.appblocker.store.GoalConfig

/**
 * What the user is told, in parts so each surface can lay it out itself: the notification (collapsed
 * and expanded), the lock-screen version and the full-screen cover.
 *
 * @property status what happened and when the app opens again
 * @property quote the quote with its author, on one line
 * @property goals the "Your goals" section as text, or a nudge when there is nothing to list
 * @property quoteText the quote on its own, and [quoteAuthor] who said it (for layouts that style them apart)
 * @property goalTitles every unfinished goal, shortened, in order; a layout shows as many as fit
 * @property goalsNote what to say instead of a list when there are no unfinished goals, else null
 * @property blockedUntilMs when the block ends, and [daily] whether it is the "done for today" one
 */
data class LimitMessage(
    val title: String,
    val status: String,
    val quote: String,
    val goals: String,
    val quoteText: String = "",
    val quoteAuthor: String = "",
    val goalTitles: List<String> = emptyList(),
    val goalsNote: String? = null,
    val blockedUntilMs: Long = 0L,
    val daily: Boolean = false,
) {
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
                        "${event.appName} is on timeout until ${formatTime(event.blockedUntilMs)}. Go touch grass."
                BlockReason.DAILY_LIMIT ->
                    "${event.appName} is done for today" to
                        "That's a wrap. It opens again tomorrow, no cap."
            }
        val quoteLine = "$OPEN_QUOTE${quote.text}$CLOSE_QUOTE $DASH ${quote.author}"
        val unfinished = goals.filter { !it.done }
        return LimitMessage(
            title = title,
            status = status,
            quote = quoteLine,
            goals = goalsSection(goals),
            quoteText = quote.text,
            quoteAuthor = quote.author,
            goalTitles = unfinished.map { shorten(it.title) },
            goalsNote = goalsNote(goals, unfinished),
            blockedUntilMs = event.blockedUntilMs,
            daily = event.reason == BlockReason.DAILY_LIMIT,
        )
    }

    private const val NO_GOALS = "Add a goal in Recess so it shows up here."
    private const val ALL_DONE = "All your goals are done. Nice work."

    /** What replaces the list when there is nothing to list; null when there is a list. */
    private fun goalsNote(goals: List<GoalConfig>, unfinished: List<GoalConfig>): String? =
        when {
            goals.isEmpty() -> NO_GOALS
            unfinished.isEmpty() -> ALL_DONE
            else -> null
        }

    private fun goalsSection(goals: List<GoalConfig>): String {
        if (goals.isEmpty()) return NO_GOALS
        val unfinished = goals.filter { !it.done }
        if (unfinished.isEmpty()) return ALL_DONE

        val lines = mutableListOf("Your goals:")
        unfinished.take(MAX_GOALS_SHOWN).forEach { lines += "$BULLET ${shorten(it.title)}" }
        val hidden = unfinished.size - MAX_GOALS_SHOWN
        if (hidden > 0) lines += "+$hidden more"
        return lines.joinToString("\n")
    }

    private fun shorten(title: String): String =
        if (title.length <= MAX_GOAL_CHARS) title else title.take(MAX_GOAL_CHARS - 1) + ELLIPSIS
}
