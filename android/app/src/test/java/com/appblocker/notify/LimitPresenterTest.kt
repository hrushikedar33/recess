package com.appblocker.notify

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

private val MESSAGE = LimitMessage("Time's up on Instagram", "Take a break.", "“A quote.” — Someone", "Your goals:\n• Read")

class LimitPresenterTest {
    private val log = mutableListOf<String>()
    private val errors = mutableListOf<String>()

    private fun presenter(
        notify: (String, LimitMessage) -> Unit = { pkg, _ -> log += "notify $pkg" },
        takeover: (String, LimitMessage) -> Boolean = { pkg, _ -> log += "takeover $pkg"; true },
        fallback: () -> Unit = { log += "fallback" },
    ) = LimitPresenter(notify, takeover, fallback) { what, _ -> errors += what }

    @Test
    fun `the notification comes first and then the takeover`() {
        presenter().present("com.instagram.android", MESSAGE)

        assertEquals(listOf("notify com.instagram.android", "takeover com.instagram.android"), log)
    }

    @Test
    fun `the Break screen is only opened when the takeover could not be shown`() {
        presenter(takeover = { _, _ -> log += "takeover"; false }).present("p", MESSAGE)

        assertEquals(listOf("notify p", "takeover", "fallback"), log)
    }

    @Test
    fun `a takeover that fails still leaves the notification and falls back to the Break screen`() {
        presenter(takeover = { _, _ -> throw IllegalStateException("no window") }).present("p", MESSAGE)

        assertEquals(listOf("notify p", "fallback"), log)
        assertEquals(1, errors.size)
    }

    @Test
    fun `a notification that fails does not stop the takeover`() {
        presenter(notify = { _, _ -> throw SecurityException("blocked") }).present("p", MESSAGE)

        assertEquals(listOf("takeover p"), log)
        assertEquals(1, errors.size)
    }

    @Test
    fun `nothing that goes wrong escapes, even the fallback`() {
        presenter(
            notify = { _, _ -> throw SecurityException("a") },
            takeover = { _, _ -> throw IllegalStateException("b") },
            fallback = { throw IllegalStateException("c") },
        ).present("p", MESSAGE)

        assertEquals(3, errors.size)
        assertTrue(log.isEmpty())
    }

    @Test
    fun `the takeover is given the same message as the notification`() {
        var notified: LimitMessage? = null
        var shown: LimitMessage? = null

        presenter(
            notify = { _, m -> notified = m },
            takeover = { _, m -> shown = m; true },
        ).present("p", MESSAGE)

        assertEquals(MESSAGE, notified)
        assertEquals(MESSAGE, shown)
    }
}
