package com.appblocker.service

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ExitReasonFormatterTest {
    @Test
    fun `the reasons that matter for a killed monitor have readable names`() {
        assertEquals("USER_REQUESTED", ExitReasonFormatter.name(10))
        assertEquals("USER_STOPPED", ExitReasonFormatter.name(11))
        assertEquals("LOW_MEMORY", ExitReasonFormatter.name(3))
        assertEquals("CRASH", ExitReasonFormatter.name(4))
        assertEquals("ANR", ExitReasonFormatter.name(6))
        assertEquals("EXCESSIVE_RESOURCE_USAGE", ExitReasonFormatter.name(9))
        assertEquals("FREEZER", ExitReasonFormatter.name(14))
        assertEquals("PACKAGE_UPDATED", ExitReasonFormatter.name(16))
    }

    @Test
    fun `an unknown code is still described instead of failing`() {
        assertEquals("UNKNOWN_99", ExitReasonFormatter.name(99))
    }

    @Test
    fun `a description names the reason and when the process died`() {
        val text = ExitReasonFormatter.describe(10, 42L) { "t$it" }

        assertTrue(text.contains("USER_REQUESTED"))
        assertTrue(text.contains("t42"))
    }

    // ---- an update is not an interruption --------------------------------------------------------

    private val updatedAt = 1_700_000_000_000L

    @Test
    fun `an exit at the moment the app was updated is not reported`() {
        // Seen on a Samsung: the old process was recorded as OTHER / INVALID START when it was replaced.
        assertFalse(ExitReasonFormatter.shouldReport(13, updatedAt - 300L, updatedAt))
        assertFalse(ExitReasonFormatter.shouldReport(13, updatedAt + 5_000L, updatedAt))
    }

    @Test
    fun `the quiet window around an update is 30 seconds either side`() {
        assertFalse(ExitReasonFormatter.shouldReport(13, updatedAt - 29_999L, updatedAt))
        assertFalse(ExitReasonFormatter.shouldReport(13, updatedAt + 29_999L, updatedAt))
        assertTrue(ExitReasonFormatter.shouldReport(13, updatedAt - 30_001L, updatedAt))
        assertTrue(ExitReasonFormatter.shouldReport(13, updatedAt + 30_001L, updatedAt))
    }

    @Test
    fun `a real kill long after an update is still reported`() {
        val longAfter = updatedAt + 3_600_000L

        for (reason in listOf(3, 4, 6, 9, 13, 14)) {
            assertTrue("reason $reason", ExitReasonFormatter.shouldReport(reason, longAfter, updatedAt))
        }
    }

    @Test
    fun `exits the system itself blames on an update or a package change are never reported`() {
        val longAfter = updatedAt + 3_600_000L

        assertFalse(ExitReasonFormatter.shouldReport(16, longAfter, updatedAt)) // PACKAGE_UPDATED
        assertFalse(ExitReasonFormatter.shouldReport(15, longAfter, updatedAt)) // PACKAGE_STATE_CHANGE
    }

    @Test
    fun `when the update time is unknown only the reason decides`() {
        assertTrue(ExitReasonFormatter.shouldReport(13, updatedAt, null))
        assertFalse(ExitReasonFormatter.shouldReport(16, updatedAt, null))
    }
}
