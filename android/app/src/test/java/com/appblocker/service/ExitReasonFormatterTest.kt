package com.appblocker.service

import org.junit.Assert.assertEquals
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
}
