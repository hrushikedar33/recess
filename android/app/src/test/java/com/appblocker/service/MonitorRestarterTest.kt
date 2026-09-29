package com.appblocker.service

import com.appblocker.service.MonitorRestarter.Result
import com.appblocker.store.InMemoryKeyValueStore
import com.appblocker.store.RecessPrefs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MonitorRestarterTest {
    private val prefs = RecessPrefs(InMemoryKeyValueStore())
    private var running = false
    private var starts = 0
    private var startFailure: Exception? = null

    private val restarter =
        MonitorRestarter(
            prefs = prefs,
            isRunning = { running },
            start = {
                starts++
                startFailure?.let { throw it }
            },
        )

    @Test
    fun `it starts the service when the user wants monitoring and it is not running`() {
        prefs.setMonitoringEnabled(true)

        assertEquals(Result.STARTED, restarter.restartIfNeeded("boot"))
        assertEquals(1, starts)
    }

    @Test
    fun `it leaves a running service alone`() {
        prefs.setMonitoringEnabled(true)
        running = true

        assertEquals(Result.ALREADY_RUNNING, restarter.restartIfNeeded("watchdog"))
        assertEquals(0, starts)
    }

    @Test
    fun `it never starts anything the user turned off`() {
        prefs.setMonitoringEnabled(false)

        assertEquals(Result.NOT_NEEDED, restarter.restartIfNeeded("boot"))
        assertEquals(0, starts)
    }

    @Test
    fun `it does not start anything when the intent was never set`() {
        assertEquals(Result.NOT_NEEDED, restarter.restartIfNeeded("boot"))
        assertEquals(0, starts)
    }

    @Test
    fun `a refused start is reported, recorded with its reason, and does not throw`() {
        prefs.setMonitoringEnabled(true)
        startFailure = IllegalStateException("app is in the background")

        val result = restarter.restartIfNeeded("alarm")

        assertEquals(Result.FAILED, result)
        assertTrue(prefs.lastStopReason()!!.contains("alarm"))
        assertTrue(prefs.lastStopReason()!!.contains("IllegalStateException"))
    }

    @Test
    fun `a successful restart does not disturb the recorded stop reason`() {
        prefs.setMonitoringEnabled(true)
        prefs.recordStopReason("previous process ended: LOW_MEMORY")

        restarter.restartIfNeeded("boot")

        assertEquals("previous process ended: LOW_MEMORY", prefs.lastStopReason())
    }

    @Test
    fun `nothing is recorded when nothing was needed`() {
        prefs.setMonitoringEnabled(false)

        restarter.restartIfNeeded("boot")

        assertNull(prefs.lastStopReason())
    }
}
