package com.appblocker.detector

import com.appblocker.detector.UsageEventKind.RESUMED
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test

private const val INSTAGRAM = "com.instagram.android"
private const val LAUNCHER = "com.oneplus.launcher"
private const val T0 = 1_700_000_000_000L

private class FakeSource : UsageEventSource {
    var interactive = true
    var events: List<UsageEventRecord> = emptyList()
    var fallbackPackage: String? = null
    var failNextQuery = false
    val windows = mutableListOf<Pair<Long, Long>>()
    var fallbackQueries = 0

    override fun isInteractive() = interactive

    override fun queryEvents(beginMs: Long, endMs: Long): List<UsageEventRecord> {
        windows += beginMs to endMs
        if (failNextQuery) {
            failNextQuery = false
            throw IllegalStateException("usage stats unavailable")
        }
        return events.filter { it.timestampMs in beginMs..endMs }
    }

    override fun mostRecentlyUsedPackage(beginMs: Long, endMs: Long): String? {
        fallbackQueries++
        return fallbackPackage
    }
}

class ForegroundAppDetectorTest {
    private val source = FakeSource()
    private var now = T0
    private val detector = ForegroundAppDetector(source) { now }

    private fun resumed(pkg: String, at: Long) = UsageEventRecord(RESUMED, pkg, at)

    @Test
    fun `the first poll reads the bootstrap window`() {
        detector.poll()

        assertEquals(listOf(T0 - ForegroundReducer.BOOTSTRAP_LOOKBACK_MS to T0), source.windows)
    }

    @Test
    fun `the first poll reports the app that was already in front`() {
        source.events = listOf(resumed(INSTAGRAM, T0 - 30_000L))

        assertEquals(INSTAGRAM, detector.poll())
    }

    @Test
    fun `later polls only read a few seconds instead of the whole bootstrap window`() {
        detector.poll()
        now = T0 + 1_000L
        detector.poll()

        val (begin, end) = source.windows.last()
        assertEquals(T0 - ForegroundReducer.OVERLAP_MS, begin)
        assertEquals(T0 + 1_000L, end)
        assertEquals(true, end - begin < 10_000L)
    }

    @Test
    fun `opening another app is reported on the next poll`() {
        source.events = listOf(resumed(LAUNCHER, T0 - 5_000L))
        assertEquals(LAUNCHER, detector.poll())

        source.events += resumed(INSTAGRAM, T0 + 500L)
        now = T0 + 1_000L

        assertEquals(INSTAGRAM, detector.poll())
    }

    @Test
    fun `the app stays reported while nothing new happens`() {
        source.events = listOf(resumed(INSTAGRAM, T0 - 5_000L))
        detector.poll()

        now = T0 + 1_000L
        assertEquals(INSTAGRAM, detector.poll())
        now = T0 + 2_000L
        assertEquals(INSTAGRAM, detector.poll())
    }

    @Test
    fun `a late-arriving older event does not replace the newer foreground app`() {
        source.events = listOf(resumed(INSTAGRAM, T0 - 1_000L))
        detector.poll()

        source.events += resumed(LAUNCHER, T0 - 4_000L)
        now = T0 + 1_000L

        assertEquals(INSTAGRAM, detector.poll())
    }

    @Test
    fun `nothing is reported and nothing is queried while the screen is off`() {
        source.interactive = false

        assertNull(detector.poll())
        assertEquals(emptyList<Pair<Long, Long>>(), source.windows)
    }

    @Test
    fun `after the screen comes back the app that was in front is still reported`() {
        source.events = listOf(resumed(INSTAGRAM, T0 - 5_000L))
        detector.poll()

        source.interactive = false
        now = T0 + 60_000L
        assertNull(detector.poll())

        source.interactive = true
        now = T0 + 61_000L
        assertEquals(INSTAGRAM, detector.poll())
    }

    @Test
    fun `after a long screen-off the query window is capped instead of covering hours`() {
        detector.poll()
        source.interactive = false
        now = T0 + 8 * 60 * 60 * 1000L
        detector.poll()

        source.interactive = true
        detector.poll()

        val (begin, end) = source.windows.last()
        assertEquals(ForegroundReducer.BOOTSTRAP_LOOKBACK_MS, end - begin)
    }

    @Test
    fun `usage stats are used only when no event tells us what is in front`() {
        source.fallbackPackage = "com.example.fallback"

        assertEquals("com.example.fallback", detector.poll())
    }

    @Test
    fun `usage stats are not consulted when an event is found`() {
        source.events = listOf(resumed(INSTAGRAM, T0 - 5_000L))
        source.fallbackPackage = "com.example.fallback"

        detector.poll()

        assertEquals(0, source.fallbackQueries)
    }

    @Test
    fun `with no events and no usage stats nothing is reported`() {
        assertNull(detector.poll())
    }

    @Test
    fun `a failed query does not advance the cursor, so the next poll re-reads the full window`() {
        source.events = listOf(resumed(INSTAGRAM, T0 - 5_000L))
        source.failNextQuery = true
        assertThrows(IllegalStateException::class.java) { detector.poll() }

        now = T0 + 1_000L
        val result = detector.poll()

        val (begin, end) = source.windows.last()
        assertEquals(INSTAGRAM, result)
        assertEquals(ForegroundReducer.BOOTSTRAP_LOOKBACK_MS, end - begin)
    }

    @Test
    fun `an app that has simply been open for hours is still found after a restart`() {
        source.events = listOf(resumed(INSTAGRAM, T0 - 3 * 60 * 60 * 1000L))

        assertEquals(INSTAGRAM, detector.poll())
    }

    @Test
    fun `usage stats that found nothing are not asked again on every poll`() {
        detector.poll()
        now = T0 + 1_000L
        detector.poll()
        now = T0 + 2_000L
        detector.poll()

        assertEquals(1, source.fallbackQueries)
    }

    @Test
    fun `usage stats are asked again after a while if there is still nothing`() {
        detector.poll()

        now = T0 + 31_000L
        detector.poll()

        assertEquals(2, source.fallbackQueries)
    }
}
