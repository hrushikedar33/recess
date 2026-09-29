package com.appblocker.notify

import com.appblocker.engine.BlockReason
import com.appblocker.engine.EngineAction.NotifyLimitReached
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

private fun event(reason: BlockReason, appName: String = "Instagram", until: Long = 1_000L) =
    NotifyLimitReached("com.instagram.android", appName, reason, until, 600_000L, 3_600_000L)

class LimitMessageFormatterTest {
    private val time = { millis: Long -> "at $millis" }

    @Test
    fun `a session limit says time is up and when the app opens again`() {
        val message = LimitMessageFormatter.format(event(BlockReason.SESSION_COOLDOWN, until = 5_000L), time)

        assertEquals("Time's up on Instagram", message.title)
        assertTrue(message.text.contains("Instagram is paused until at 5000"))
    }

    @Test
    fun `a daily limit says the app is finished for today, not a clock time`() {
        val message = LimitMessageFormatter.format(event(BlockReason.DAILY_LIMIT), time)

        assertEquals("Instagram is done for today", message.title)
        assertTrue(message.text.contains("tomorrow"))
        assertTrue(!message.text.contains("at 1000"))
    }

    @Test
    fun `the app name is used as given`() {
        val message = LimitMessageFormatter.format(event(BlockReason.SESSION_COOLDOWN, appName = "YouTube"), time)

        assertTrue(message.title.contains("YouTube"))
    }
}
