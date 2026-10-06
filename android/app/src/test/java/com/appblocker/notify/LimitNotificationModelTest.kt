package com.appblocker.notify

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

private const val NOW = 1_700_000_000_000L
private const val ELAPSED = 5_000_000L

private fun message(
    goalTitles: List<String> = listOf("Gig work", "Setup complete"),
    note: String? = null,
    until: Long = NOW + 300_000L,
    daily: Boolean = false,
) = LimitMessage(
    title = "Time's up on Instagram",
    status = "Instagram is on timeout until 16:45. Go touch grass.",
    quote = "“To be everywhere is to be nowhere.” — Seneca",
    goals = "Your goals:\n• Gig work",
    quoteText = "To be everywhere is to be nowhere.",
    quoteAuthor = "Seneca",
    goalTitles = goalTitles,
    goalsNote = note,
    blockedUntilMs = until,
    daily = daily,
)

private fun model(message: LimitMessage = message(), now: Long = NOW) =
    LimitNotificationModel.from(message, nowMs = now, elapsedRealtimeMs = ELAPSED)

class LimitNotificationModelTest {
    @Test
    fun `it carries the words through unchanged`() {
        val result = model()

        assertEquals("Time's up on Instagram", result.title)
        assertEquals("Instagram is on timeout until 16:45. Go touch grass.", result.status)
        assertEquals("To be everywhere is to be nowhere.", result.quoteText)
        assertEquals("Seneca", result.quoteAuthor)
    }

    @Test
    fun `it shows up to three goals and counts the rest, because the expanded notification is short`() {
        val result = model(message(goalTitles = (1..5).map { "Goal $it" }))

        assertEquals(listOf("Goal 1", "Goal 2", "Goal 3"), result.goalRows)
        assertEquals(2, result.moreGoals)
        assertEquals(5, result.goalsToGo)
    }

    @Test
    fun `exactly three goals leave nothing to count`() {
        val result = model(message(goalTitles = (1..3).map { "Goal $it" }))

        assertEquals(3, result.goalRows.size)
        assertEquals(0, result.moreGoals)
    }

    @Test
    fun `two goals show two rows`() {
        val result = model()

        assertEquals(listOf("Gig work", "Setup complete"), result.goalRows)
        assertEquals(0, result.moreGoals)
        assertEquals(2, result.goalsToGo)
        assertNull(result.goalsNote)
    }

    @Test
    fun `with nothing to list it shows the note instead`() {
        val result = model(message(goalTitles = emptyList(), note = "Add a goal in Recess so it shows up here."))

        assertTrue(result.goalRows.isEmpty())
        assertEquals("Add a goal in Recess so it shows up here.", result.goalsNote)
        assertEquals(0, result.goalsToGo)
    }

    @Test
    fun `a session block counts down to its end`() {
        val result = model(message(until = NOW + 90_000L))

        // The phone's chronometer counts against the elapsed-realtime clock.
        assertEquals(ELAPSED + 90_000L, result.countdownBase)
    }

    @Test
    fun `the daily block has no countdown, it is back tomorrow`() {
        assertNull(model(message(daily = true, until = NOW + 5 * 3_600_000L)).countdownBase)
    }

    @Test
    fun `a block that has already ended has no countdown`() {
        assertNull(model(message(until = NOW - 1L)).countdownBase)
        assertNull(model(message(until = NOW)).countdownBase)
    }
}
