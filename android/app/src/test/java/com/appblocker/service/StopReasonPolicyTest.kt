package com.appblocker.service

import org.junit.Assert.assertEquals
import org.junit.Test

class StopReasonPolicyTest {
    @Test
    fun `a stop the user asked for is recorded as such`() {
        assertEquals(StopReasonPolicy.STOPPED_BY_USER, StopReasonPolicy.onDestroy(userStopRequested = true, intentEnabled = false))
    }

    @Test
    fun `it is still the user's stop when they turned it back on before the old service finished stopping`() {
        assertEquals(StopReasonPolicy.STOPPED_BY_USER, StopReasonPolicy.onDestroy(userStopRequested = true, intentEnabled = true))
    }

    @Test
    fun `a service that ends while the user has it turned off is not a problem`() {
        assertEquals(StopReasonPolicy.STOPPED_BY_USER, StopReasonPolicy.onDestroy(userStopRequested = false, intentEnabled = false))
    }

    @Test
    fun `only a service the system ended while the user wants it is an interruption`() {
        assertEquals(StopReasonPolicy.DESTROYED_WHILE_ENABLED, StopReasonPolicy.onDestroy(userStopRequested = false, intentEnabled = true))
    }
}
