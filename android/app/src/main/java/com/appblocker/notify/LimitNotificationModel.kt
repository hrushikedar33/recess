package com.appblocker.notify

/**
 * Everything the rich notification shows, already decided, so the Android layout code only has to
 * put it on screen. Pure, so the budget (how many goal rows fit) and the countdown are unit-tested.
 *
 * @property goalRows the goals to list, at most [MAX_GOAL_ROWS]: Android caps an expanded custom
 *   notification at roughly 256 dp, and the full list is one tap away on the Break screen
 * @property moreGoals how many unfinished goals did not fit
 * @property goalsToGo how many unfinished goals there are in all
 * @property goalsNote what to show instead of the rows when there are none (null when there are rows)
 * @property countdownBase the elapsed-realtime moment the block ends, for a chronometer that counts
 *   down; null when there is nothing to count down to (the daily block, or one that already ended)
 */
data class LimitNotificationModel(
    val title: String,
    val status: String,
    val quoteText: String,
    val quoteAuthor: String,
    val goalRows: List<String>,
    val moreGoals: Int,
    val goalsToGo: Int,
    val goalsNote: String?,
    val countdownBase: Long?,
) {
    companion object {
        const val MAX_GOAL_ROWS = 3

        fun from(message: LimitMessage, nowMs: Long, elapsedRealtimeMs: Long): LimitNotificationModel {
            val remainingMs = message.blockedUntilMs - nowMs
            val countdown =
                if (message.daily || remainingMs <= 0L) null else elapsedRealtimeMs + remainingMs
            return LimitNotificationModel(
                title = message.title,
                status = message.status,
                quoteText = message.quoteText,
                quoteAuthor = message.quoteAuthor,
                goalRows = message.goalTitles.take(MAX_GOAL_ROWS),
                moreGoals = (message.goalTitles.size - MAX_GOAL_ROWS).coerceAtLeast(0),
                goalsToGo = message.goalTitles.size,
                goalsNote = message.goalsNote,
                countdownBase = countdown,
            )
        }
    }
}
