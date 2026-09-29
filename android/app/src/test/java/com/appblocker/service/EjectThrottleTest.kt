package com.appblocker.service

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

private const val T0 = 1_700_000_000_000L
private const val PKG = "com.instagram.android"

class EjectThrottleTest {
    private val throttle = EjectThrottle(minIntervalMs = 1_500L, ineffectiveAfter = 5, resetAfterMs = 10_000L, slowIntervalMs = 30_000L)

    @Test
    fun `the first eject is sent`() {
        assertTrue(throttle.onEject(PKG, T0).send)
    }

    @Test
    fun `a second eject inside the interval is not sent`() {
        throttle.onEject(PKG, T0)

        assertFalse(throttle.onEject(PKG, T0 + 1_000L).send)
    }

    @Test
    fun `an eject after the interval is sent again`() {
        throttle.onEject(PKG, T0)

        assertTrue(throttle.onEject(PKG, T0 + 1_500L).send)
    }

    @Test
    fun `apps are throttled independently`() {
        throttle.onEject(PKG, T0)

        assertTrue(throttle.onEject("com.example.other", T0 + 100L).send)
    }

    @Test
    fun `the eject is not called ineffective at first`() {
        assertFalse(throttle.onEject(PKG, T0).ineffective)
    }

    @Test
    fun `sending five ejects in a row without the app going away is called ineffective`() {
        val verdicts = (0 until 5).map { throttle.onEject(PKG, T0 + it * 2_000L) }

        assertTrue(verdicts.last().ineffective)
        assertFalse(verdicts[3].ineffective)
    }

    @Test
    fun `a quiet spell resets the count`() {
        (0 until 4).forEach { throttle.onEject(PKG, T0 + it * 2_000L) }

        val afterQuiet = throttle.onEject(PKG, T0 + 4 * 2_000L + 20_000L)

        assertFalse(afterQuiet.ineffective)
    }

    @Test
    fun `reopening the app over and over is not called ineffective while it keeps going away in between`() {
        val verdicts =
            (0 until 8).map {
                val v = throttle.onEject(PKG, T0 + it * 2_000L)
                throttle.noteForeground("com.oneplus.launcher") // home screen showed up after the eject
                v
            }

        assertFalse(verdicts.any { it.ineffective })
    }

    @Test
    fun `another app coming to the front resets only the blocked app that left`() {
        (0 until 4).forEach { throttle.onEject(PKG, T0 + it * 2_000L) }
        (0 until 4).forEach { throttle.onEject("com.example.other", T0 + it * 2_000L) }

        throttle.noteForeground("com.example.other")

        assertFalse(throttle.onEject(PKG, T0 + 10_000L).ineffective)
        assertTrue(throttle.onEject("com.example.other", T0 + 10_000L).ineffective)
    }

    @Test
    fun `the same app staying in front does not reset the count`() {
        (0 until 4).forEach {
            throttle.onEject(PKG, T0 + it * 2_000L)
            throttle.noteForeground(PKG)
        }

        assertTrue(throttle.onEject(PKG, T0 + 8_000L).ineffective)
    }

    @Test
    fun `nothing in front resets the count`() {
        (0 until 4).forEach { throttle.onEject(PKG, T0 + it * 2_000L) }
        throttle.noteForeground(null)

        assertFalse(throttle.onEject(PKG, T0 + 8_000L).ineffective)
    }


    // ---- backing off when the phone keeps refusing ---------------------------------------------

    @Test
    fun `once the eject is called ineffective, tries become rare instead of every two seconds`() {
        (0 until 5).forEach { throttle.onEject(PKG, T0 + it * 2_000L) } // the fifth is sent at 8 s

        val tries = (5..18).map { throttle.onEject(PKG, T0 + it * 2_000L) } // 10 s .. 36 s

        assertTrue(tries.none { it.send })
        assertTrue(tries.all { it.ineffective })
    }

    @Test
    fun `a slow try is still made after the slow interval`() {
        (0 until 5).forEach { throttle.onEject(PKG, T0 + it * 2_000L) }
        (5..18).forEach { throttle.onEject(PKG, T0 + it * 2_000L) }

        assertTrue(throttle.onEject(PKG, T0 + 8_000L + 30_000L).send)
    }

    @Test
    fun `the normal pace returns once the blocked app has gone away`() {
        (0 until 5).forEach { throttle.onEject(PKG, T0 + it * 2_000L) }
        throttle.noteForeground("com.oneplus.launcher")

        assertTrue(throttle.onEject(PKG, T0 + 10_000L).send)
        assertFalse(throttle.onEject(PKG, T0 + 10_500L).send)
        assertTrue(throttle.onEject(PKG, T0 + 12_000L).send)
    }
}
