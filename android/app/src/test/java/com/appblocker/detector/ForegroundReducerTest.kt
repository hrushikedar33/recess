package com.appblocker.detector

import com.appblocker.detector.UsageEventKind.OTHER
import com.appblocker.detector.UsageEventKind.RESUMED
import org.junit.Assert.assertEquals
import org.junit.Test

private const val LAUNCHER = "com.oneplus.launcher"
private const val INSTAGRAM = "com.instagram.android"
private const val YOUTUBE = "com.google.android.youtube"

private fun resumed(pkg: String, at: Long) = UsageEventRecord(RESUMED, pkg, at)

private fun other(pkg: String, at: Long) = UsageEventRecord(OTHER, pkg, at)

class ForegroundReducerTest {
    private val nothingYet = ForegroundState.UNKNOWN

    // ---- reducing events -------------------------------------------------------------------

    @Test
    fun `no events leave the state unchanged`() {
        val state = ForegroundState(INSTAGRAM, 1_000L)

        assertEquals(state, ForegroundReducer.reduce(state, emptyList()))
    }

    @Test
    fun `a resume event makes that package the foreground`() {
        val result = ForegroundReducer.reduce(nothingYet, listOf(resumed(INSTAGRAM, 5_000L)))

        assertEquals(ForegroundState(INSTAGRAM, 5_000L), result)
    }

    @Test
    fun `the latest resume wins when events arrive in order`() {
        val events = listOf(resumed(LAUNCHER, 1_000L), resumed(INSTAGRAM, 2_000L), resumed(YOUTUBE, 3_000L))

        assertEquals(YOUTUBE, ForegroundReducer.reduce(nothingYet, events).packageName)
    }

    @Test
    fun `the event with the highest timestamp wins even when events arrive out of order`() {
        val events = listOf(resumed(YOUTUBE, 3_000L), resumed(INSTAGRAM, 2_000L), resumed(LAUNCHER, 1_000L))

        assertEquals(YOUTUBE, ForegroundReducer.reduce(nothingYet, events).packageName)
    }

    @Test
    fun `on equal timestamps the later event in the list wins`() {
        val events = listOf(resumed(INSTAGRAM, 2_000L), resumed(YOUTUBE, 2_000L))

        assertEquals(YOUTUBE, ForegroundReducer.reduce(nothingYet, events).packageName)
    }

    @Test
    fun `an event older than the current state is ignored`() {
        val state = ForegroundState(INSTAGRAM, 5_000L)

        val result = ForegroundReducer.reduce(state, listOf(resumed(YOUTUBE, 4_000L)))

        assertEquals(state, result)
    }

    @Test
    fun `an event at the same time as the current state can replace it`() {
        val state = ForegroundState(INSTAGRAM, 5_000L)

        val result = ForegroundReducer.reduce(state, listOf(resumed(YOUTUBE, 5_000L)))

        assertEquals(YOUTUBE, result.packageName)
    }

    @Test
    fun `events other than resume are ignored`() {
        val state = ForegroundState(INSTAGRAM, 1_000L)

        val result = ForegroundReducer.reduce(state, listOf(other(YOUTUBE, 9_000L)))

        assertEquals(state, result)
    }

    @Test
    fun `resume then pause then resume of another package ends on the other package`() {
        val events =
            listOf(
                resumed(INSTAGRAM, 1_000L),
                other(INSTAGRAM, 2_000L), // paused
                resumed(YOUTUBE, 3_000L),
            )

        assertEquals(YOUTUBE, ForegroundReducer.reduce(nothingYet, events).packageName)
    }

    @Test
    fun `reducing in several steps gives the same result as all at once`() {
        val events = listOf(resumed(LAUNCHER, 1_000L), resumed(INSTAGRAM, 2_000L), resumed(YOUTUBE, 3_000L))

        val stepwise = events.fold(nothingYet) { state, event -> ForegroundReducer.reduce(state, listOf(event)) }

        assertEquals(ForegroundReducer.reduce(nothingYet, events), stepwise)
    }

    // ---- choosing the query window ---------------------------------------------------------

    @Test
    fun `the first query looks back over the bootstrap window`() {
        assertEquals(1_000_000L - ForegroundReducer.BOOTSTRAP_LOOKBACK_MS, ForegroundReducer.windowStartMs(1_000_000L, null))
    }

    @Test
    fun `a later query starts a little before the previous one ended`() {
        val start = ForegroundReducer.windowStartMs(nowMs = 1_001_000L, previousQueryEndMs = 1_000_000L)

        assertEquals(1_000_000L - ForegroundReducer.OVERLAP_MS, start)
    }

    @Test
    fun `after a long gap the window is capped at the bootstrap lookback`() {
        val now = 100_000_000L // more than a day after the epoch, so the cap is well inside the timeline

        val start = ForegroundReducer.windowStartMs(nowMs = now, previousQueryEndMs = 1_000L)

        assertEquals(now - ForegroundReducer.BOOTSTRAP_LOOKBACK_MS, start)
    }

    @Test
    fun `when the clock has gone backwards the window never starts in the future`() {
        val start = ForegroundReducer.windowStartMs(nowMs = 1_000_000L, previousQueryEndMs = 2_000_000L)

        assertEquals(1_000_000L, start)
    }
}
