package com.appblocker.service

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** A single-threaded scheduler on virtual time, like a Handler on its own looper. */
private class FakePoster : Poster {
    private class Item(val at: Long, val order: Int, val task: Runnable)

    private val queue = mutableListOf<Item>()
    private var order = 0
    var now = 0L
        private set

    override fun post(task: Runnable) {
        queue += Item(now, order++, task)
    }

    override fun postDelayed(task: Runnable, delayMs: Long) {
        queue += Item(now + delayMs, order++, task)
    }

    override fun removeCallbacks(task: Runnable) {
        queue.removeAll { it.task === task }
    }

    /** Runs everything due up to [time], oldest first, one task at a time. */
    fun advanceTo(time: Long) {
        while (true) {
            val next = queue.filter { it.at <= time }.minWithOrNull(compareBy({ it.at }, { it.order })) ?: break
            queue.remove(next)
            now = maxOf(now, next.at)
            next.task.run()
        }
        now = time
    }

    fun advanceBy(millis: Long) = advanceTo(now + millis)
}

class TickLoopTest {
    private val poster = FakePoster()
    private var ticks = 0
    private var stopped = 0
    private var outcome = TickOutcome(nextDelayMs = 1_000L, stop = false)
    private val loop = TickLoop(poster, { ticks++; outcome }, { stopped++ })

    private fun ticksDuring(millis: Long): Int {
        val before = ticks
        poster.advanceBy(millis)
        return ticks - before
    }

    @Test
    fun `it ticks straight away and then at the pace each tick asks for`() {
        loop.start()

        assertEquals(1, ticksDuring(0))
        assertEquals(5, ticksDuring(5_000))
    }

    @Test
    fun `it follows a changing pace`() {
        loop.start()
        poster.advanceBy(0)
        outcome = TickOutcome(nextDelayMs = 5_000L, stop = false)
        poster.advanceBy(1_000)

        assertEquals(2, ticksDuring(10_000))
    }

    @Test
    fun `a tick that asks to stop ends the loop and reports it once`() {
        loop.start()
        poster.advanceBy(0)
        outcome = TickOutcome(nextDelayMs = 1_000L, stop = true)

        val during = ticksDuring(10_000)

        assertEquals(1, during)
        assertEquals(1, stopped)
    }

    @Test
    fun `pausing does one last tick, so the engine learns nobody is in an app, then stops ticking`() {
        loop.start()
        poster.advanceBy(3_000)

        loop.pause()

        assertEquals(1, ticksDuring(0))
        assertEquals(0, ticksDuring(20_000))
    }

    @Test
    fun `resuming ticks straight away and carries on at the normal pace`() {
        loop.start()
        poster.advanceBy(3_000)
        loop.pause()
        poster.advanceBy(10_000)

        loop.resume()

        assertEquals(1, ticksDuring(0))
        assertEquals(5, ticksDuring(5_000))
    }

    @Test
    fun `resuming a loop that is already running does not start a second loop`() {
        loop.start()
        poster.advanceBy(3_000)

        loop.resume()
        loop.resume()
        loop.resume()
        poster.advanceBy(0)

        assertEquals(5, ticksDuring(5_000))
    }

    @Test
    fun `pausing twice and resuming once leaves exactly one loop`() {
        loop.start()
        poster.advanceBy(2_000)

        loop.pause()
        loop.pause()
        loop.resume()
        poster.advanceBy(0)

        assertEquals(5, ticksDuring(5_000))
    }

    @Test
    fun `any mix of pauses and resumes leaves at most one loop running`() {
        val random = java.util.Random(11L)
        loop.start()
        var running = true
        repeat(300) {
            when (random.nextInt(3)) {
                0 -> { loop.pause(); running = false }
                1 -> { loop.resume(); running = true }
                else -> Unit
            }
            poster.advanceBy(random.nextInt(2_500).toLong())
        }
        // Settle any final control message, then measure the steady state.
        poster.advanceBy(0)
        val steady = ticksDuring(0) // ticks due right now (a final pause tick or the resume tick)
        val over = ticksDuring(10_000)

        if (running) {
            assertTrue("running loop ticked $over times in 10 s", over in 9..11)
        } else {
            assertEquals("a paused loop kept ticking", 0, over)
        }
        assertTrue(steady <= 1)
    }

    @Test
    fun `cancelling stops all ticking for good`() {
        loop.start()
        poster.advanceBy(3_000)

        loop.cancel()

        assertEquals(0, ticksDuring(20_000))
    }
}
