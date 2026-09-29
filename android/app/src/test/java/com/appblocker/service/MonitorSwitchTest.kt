package com.appblocker.service

import com.appblocker.store.InMemoryKeyValueStore
import com.appblocker.store.RecessPrefs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class MonitorSwitchTest {
    private val store = InMemoryKeyValueStore()
    private val prefs = RecessPrefs(store)
    private val calls = mutableListOf<String>()
    private var startFailure: Exception? = null
    private var stopFailure: Exception? = null

    private val switch =
        MonitorSwitch(
            prefs = prefs,
            startService = {
                calls += "start"
                startFailure?.let { throw it }
            },
            stopService = {
                calls += "stop"
                stopFailure?.let { throw it }
            },
            onEnabled = { calls += "supervise" },
            onDisabled = { calls += "unsupervise" },
        )

    @Test
    fun `turning it on saves the intent, then starts the service, then sets up its safety nets`() {
        switch.setEnabled(true)

        assertTrue(prefs.isMonitoringEnabled())
        assertEquals(listOf("start", "supervise"), calls)
    }

    @Test
    fun `turning it off removes every way of reviving it before the service is stopped`() {
        switch.setEnabled(true)
        calls.clear()

        switch.setEnabled(false)

        assertFalse(prefs.isMonitoringEnabled())
        assertEquals(listOf("unsupervise", "stop"), calls)
    }

    @Test
    fun `turning it on twice is harmless`() {
        switch.setEnabled(true)
        switch.setEnabled(true)

        assertTrue(prefs.isMonitoringEnabled())
    }

    @Test
    fun `if the service cannot be started the intent goes back to what it was, so the toggle never claims ON`() {
        startFailure = IllegalStateException("app is in the background")

        assertThrows(IllegalStateException::class.java) { switch.setEnabled(true) }

        assertFalse(prefs.isMonitoringEnabled())
        assertFalse("safety nets were set up for a service that never started", "supervise" in calls)
    }

    @Test
    fun `a failed start is recorded, with what went wrong`() {
        startFailure = IllegalStateException("app is in the background")

        assertThrows(IllegalStateException::class.java) { switch.setEnabled(true) }

        assertTrue(prefs.lastStopReason()!!.contains("IllegalStateException"))
    }

    @Test
    fun `a failed start does not turn off something that was already on`() {
        switch.setEnabled(true)
        calls.clear()
        startFailure = IllegalStateException("cannot start again")

        assertThrows(IllegalStateException::class.java) { switch.setEnabled(true) }

        assertTrue("the earlier ON was lost", prefs.isMonitoringEnabled())
    }

    @Test
    fun `if the intent cannot be saved nothing is started`() {
        store.failDurableWrites = true

        assertThrows(IllegalStateException::class.java) { switch.setEnabled(true) }

        assertTrue(calls.isEmpty())
        assertFalse(prefs.isMonitoringEnabled())
    }

    @Test
    fun `the original problem is reported even if putting the intent back also fails`() {
        startFailure = IllegalStateException("cannot start")
        val failing =
            MonitorSwitch(
                prefs = prefs,
                startService = {
                    store.failDurableWrites = true // the storage breaks right after the intent was saved
                    throw IllegalStateException("cannot start")
                },
                stopService = {},
                onEnabled = {},
                onDisabled = {},
            )

        val error = assertThrows(IllegalStateException::class.java) { failing.setEnabled(true) }

        assertEquals("cannot start", error.message)
    }

    @Test
    fun `turning it off stays off even if stopping the service fails, because the service stops itself`() {
        switch.setEnabled(true)
        calls.clear()
        stopFailure = SecurityException("cannot stop")

        switch.setEnabled(false)

        assertFalse("the user's OFF was reverted", prefs.isMonitoringEnabled())
    }
}
