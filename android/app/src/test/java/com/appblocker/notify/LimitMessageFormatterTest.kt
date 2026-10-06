package com.appblocker.notify

import com.appblocker.engine.BlockReason
import com.appblocker.engine.EngineAction.NotifyLimitReached
import com.appblocker.quotes.Quote
import com.appblocker.store.GoalConfig
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

private val QUOTE = Quote("Confine yourself to the present.", "Marcus Aurelius", "Meditations 7.29")

private fun event(reason: BlockReason = BlockReason.SESSION_COOLDOWN, appName: String = "Instagram", until: Long = 1_000L) =
    NotifyLimitReached("com.instagram.android", appName, reason, until, 600_000L, 3_600_000L)

private fun goal(id: Int, done: Boolean = false, title: String = "Goal $id") = GoalConfig("g$id", title, done)

class LimitMessageFormatterTest {
    private val time = { millis: Long -> "at $millis" }

    private fun format(goals: List<GoalConfig> = emptyList(), event: NotifyLimitReached = event(), quote: Quote = QUOTE) =
        LimitMessageFormatter.format(event, quote, goals, time)

    // ---- title and status ------------------------------------------------------------------

    @Test
    fun `a session limit says time is up and when the app opens again`() {
        val message = format(event = event(until = 5_000L))

        assertEquals("Time's up on Instagram", message.title)
        assertTrue(message.status.contains("Instagram is on timeout until at 5000"))
        assertTrue(message.bigText.contains("Instagram is on timeout until at 5000"))
    }

    @Test
    fun `a daily limit says the app is finished for today, not a clock time`() {
        val message = format(event = event(BlockReason.DAILY_LIMIT))

        assertEquals("Instagram is done for today", message.title)
        assertTrue(message.status.contains("tomorrow"))
        assertFalse(message.status.contains("at 1000"))
    }

    // ---- what shows without expanding -------------------------------------------------------

    @Test
    fun `the collapsed line is the quote, so it shows without expanding the notification`() {
        val message = format()

        assertEquals("“Confine yourself to the present.” — Marcus Aurelius", message.text)
        assertEquals(message.quote, message.text)
    }

    @Test
    fun `the parts are available separately for the full-screen takeover`() {
        val message = format(goals = listOf(goal(1), goal(2)), event = event(until = 5_000L))

        assertEquals("“Confine yourself to the present.” — Marcus Aurelius", message.quote)
        assertEquals("Your goals:\n• Goal 1\n• Goal 2", message.goals)
        assertEquals("Instagram is on timeout until at 5000. Go touch grass.", message.status)
    }

    @Test
    fun `the expanded text holds the quote, the goals and the status`() {
        val body = format(goals = listOf(goal(1))).bigText

        assertEquals(
            "“Confine yourself to the present.” — Marcus Aurelius\n\n" +
                "Your goals:\n• Goal 1\n\n" +
                "Instagram is on timeout until at 1000. Go touch grass.",
            body,
        )
    }

    // ---- the quote -------------------------------------------------------------------------

    @Test
    fun `the expanded text opens with the quote and its author`() {
        val body = format().bigText

        assertTrue(body.startsWith("“Confine yourself to the present.” — Marcus Aurelius"))
    }

    // ---- the goals -------------------------------------------------------------------------

    @Test
    fun `only unfinished goals are listed, in order`() {
        val body = format(goals = listOf(goal(1), goal(2, done = true), goal(3))).bigText

        assertTrue(body.contains("• Goal 1"))
        assertFalse(body.contains("Goal 2"))
        assertTrue(body.indexOf("Goal 1") < body.indexOf("Goal 3"))
    }

    @Test
    fun `up to five goals are listed with no overflow line`() {
        val body = format(goals = (1..5).map { goal(it) }).bigText

        assertTrue(body.contains("• Goal 5"))
        assertFalse(body.contains("more"))
    }

    @Test
    fun `beyond five goals the rest are counted instead of listed`() {
        val body = format(goals = (1..8).map { goal(it) }).bigText

        assertTrue(body.contains("• Goal 5"))
        assertFalse(body.contains("Goal 6"))
        assertTrue(body.contains("+3 more"))
    }

    @Test
    fun `with no goals at all it nudges to add one`() {
        val body = format(goals = emptyList()).bigText

        assertTrue(body.contains("Add a goal"))
        assertFalse(body.contains("•"))
    }

    @Test
    fun `when every goal is done it says so instead of listing nothing`() {
        val body = format(goals = listOf(goal(1, done = true), goal(2, done = true))).bigText

        assertTrue(body.contains("All your goals are done"))
        assertFalse(body.contains("•"))
    }

    @Test
    fun `a very long goal title is shortened so the notification stays readable`() {
        val body = format(goals = listOf(goal(1, title = "x".repeat(200)))).bigText

        val line = body.lines().first { it.startsWith("•") }
        assertTrue(line.length <= 62)
        assertTrue(line.endsWith("…"))
    }

    @Test
    fun `the daily limit shows the quote and goals too`() {
        val body = format(goals = listOf(goal(1)), event = event(BlockReason.DAILY_LIMIT)).bigText

        assertTrue(body.contains("Marcus Aurelius"))
        assertTrue(body.contains("• Goal 1"))
    }

    // ---- the structured parts the rich notification is built from ----------------------------------

    @Test
    fun `the quote text and author are also given separately`() {
        val message = format()

        assertEquals("Confine yourself to the present.", message.quoteText)
        assertEquals("Marcus Aurelius", message.quoteAuthor)
    }

    @Test
    fun `every unfinished goal is listed, shortened, with no limit of five`() {
        val message = format(goals = (1..8).map { goal(it) } + goal(9, done = true))

        assertEquals((1..8).map { "Goal $it" }, message.goalTitles)
        assertEquals(null, message.goalsNote)
    }

    @Test
    fun `a very long goal title is shortened in the list too`() {
        val message = format(goals = listOf(goal(1, title = "x".repeat(200))))

        assertTrue(message.goalTitles.single().length <= 60)
        assertTrue(message.goalTitles.single().endsWith("…"))
    }

    @Test
    fun `with no goals the list is empty and there is a note to add one`() {
        val message = format(goals = emptyList())

        assertTrue(message.goalTitles.isEmpty())
        assertTrue(message.goalsNote!!.contains("Add a goal"))
    }

    @Test
    fun `with every goal done the list is empty and the note says so`() {
        val message = format(goals = listOf(goal(1, done = true)))

        assertTrue(message.goalTitles.isEmpty())
        assertTrue(message.goalsNote!!.contains("All your goals are done"))
    }

    @Test
    fun `it knows when the block ends and whether it is the daily one`() {
        assertEquals(5_000L, format(event = event(until = 5_000L)).blockedUntilMs)
        assertEquals(false, format().daily)
        assertEquals(true, format(event = event(BlockReason.DAILY_LIMIT)).daily)
    }
}
