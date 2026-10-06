package com.appblocker.service

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

private const val T0 = 1_700_000_000_000L
private const val INSTAGRAM = "com.instagram.android"
private const val REELS = "com.example.reels"

class TakeoverCoordinatorTest {
    // first launch 300 ms after the cover, a retry 1.5 s after that, at most two launches
    private val coordinator = TakeoverCoordinator(firstLaunchDelayMs = 300L, retryDelayMs = 1_500L, maxLaunches = 2)

    @Test
    fun `the first tick of an episode starts the Break screen shortly after the cover and keeps HOME away`() {
        val plan = coordinator.onBlockedAppInFront(INSTAGRAM, T0)

        assertEquals(300L, plan.launchBreakAfterMs)
        assertFalse(plan.allowHome)
    }

    @Test
    fun `while the first launch is still settling nothing new is started and HOME stays away`() {
        coordinator.onBlockedAppInFront(INSTAGRAM, T0)

        val plan = coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 1_000L)

        assertNull(plan.launchBreakAfterMs)
        assertFalse(plan.allowHome)
    }

    @Test
    fun `if the blocked app is still in front a retry is made once, straight away`() {
        coordinator.onBlockedAppInFront(INSTAGRAM, T0)

        val plan = coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 2_000L)

        assertEquals(0L, plan.launchBreakAfterMs)
        assertFalse(plan.allowHome)
    }

    @Test
    fun `the retry is timed from when the first launch happens, not from the tick that asked for it`() {
        coordinator.onBlockedAppInFront(INSTAGRAM, T0) // launch happens at T0 + 300

        assertNull(coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 1_700L).launchBreakAfterMs) // 1.4 s after it
        assertEquals(0L, coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 1_800L).launchBreakAfterMs) // 1.5 s after it
    }

    @Test
    fun `after the retry there is a settling period too`() {
        coordinator.onBlockedAppInFront(INSTAGRAM, T0)
        coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 2_000L)

        val plan = coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 3_000L)

        assertNull(plan.launchBreakAfterMs)
        assertFalse(plan.allowHome)
    }

    @Test
    fun `when the Break screen never arrives, going home is allowed as the last resort`() {
        coordinator.onBlockedAppInFront(INSTAGRAM, T0)
        coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 2_000L)

        val plan = coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 4_000L)

        assertNull(plan.launchBreakAfterMs)
        assertTrue(plan.allowHome)
    }

    @Test
    fun `going home stays allowed for the rest of the episode and no third launch is made`() {
        coordinator.onBlockedAppInFront(INSTAGRAM, T0)
        coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 2_000L)

        val plans = (4..20).map { coordinator.onBlockedAppInFront(INSTAGRAM, T0 + it * 1_000L) }

        assertTrue(plans.all { it.allowHome })
        assertTrue(plans.all { it.launchBreakAfterMs == null })
    }

    @Test
    fun `leaving the blocked app ends the episode, so the next time is a fresh start`() {
        coordinator.onBlockedAppInFront(INSTAGRAM, T0)
        coordinator.onForeground("com.android.launcher")

        val plan = coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 10_000L)

        assertEquals(300L, plan.launchBreakAfterMs)
        assertFalse(plan.allowHome)
    }

    @Test
    fun `the Break screen coming to the front also ends the episode`() {
        coordinator.onBlockedAppInFront(INSTAGRAM, T0)
        coordinator.onForeground("com.appblocker")

        val plan = coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 5_000L)

        assertEquals(300L, plan.launchBreakAfterMs)
    }

    @Test
    fun `nothing in front, such as the screen turning off, ends the episode`() {
        coordinator.onBlockedAppInFront(INSTAGRAM, T0)
        coordinator.onForeground(null)

        assertEquals(300L, coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 1_000L).launchBreakAfterMs)
    }

    @Test
    fun `the blocked app staying in front does not end the episode`() {
        coordinator.onBlockedAppInFront(INSTAGRAM, T0)
        coordinator.onForeground(INSTAGRAM)

        assertNull(coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 1_000L).launchBreakAfterMs)
    }

    @Test
    fun `a different blocked app starts its own episode`() {
        coordinator.onBlockedAppInFront(INSTAGRAM, T0)
        coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 2_000L)

        val plan = coordinator.onBlockedAppInFront(REELS, T0 + 2_500L)

        assertEquals(300L, plan.launchBreakAfterMs)
        assertFalse(plan.allowHome)
    }

    @Test
    fun `an episode that goes quiet and comes back much later starts over`() {
        coordinator.onBlockedAppInFront(INSTAGRAM, T0)

        val plan = coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 60_000L)

        // No foreground change was reported, yet a whole minute passed with no tick: treat it as new.
        assertEquals(300L, plan.launchBreakAfterMs)
        assertFalse(plan.allowHome)
    }

    @Test
    fun `reset forgets everything`() {
        coordinator.onBlockedAppInFront(INSTAGRAM, T0)
        coordinator.reset()

        assertEquals(300L, coordinator.onBlockedAppInFront(INSTAGRAM, T0 + 100L).launchBreakAfterMs)
    }
}
