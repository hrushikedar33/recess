package com.appblocker.store

import com.appblocker.engine.AppUsage
import com.appblocker.engine.BlockReason
import com.appblocker.engine.EngineState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

private const val T0 = 1_700_000_000_000L

private const val ONE_APP =
    """[{"packageName":"com.instagram.android","appName":"Instagram","limitMinutes":10,"cooldownMinutes":5,"isActive":true}]"""
private const val OTHER_APP =
    """[{"packageName":"com.example.reels","appName":"Reels","limitMinutes":3,"cooldownMinutes":1,"dailyLimitMinutes":30,"isActive":false}]"""
private const val ONE_GOAL = """[{"id":"g1","title":"Finish the report","done":false}]"""
private const val OTHER_GOAL = """[{"id":"g2","title":"Call mum","done":true}]"""

class RecessPrefsTest {
    private val store = InMemoryKeyValueStore()
    private var now = T0
    private val prefs = RecessPrefs(store) { now }

    /** A new [RecessPrefs] over the same storage, as after a process restart. */
    private fun restarted() = RecessPrefs(store) { now }

    // ---- the user's intent -----------------------------------------------------------------

    @Test
    fun `monitoring is off until the user turns it on`() {
        assertFalse(prefs.isMonitoringEnabled())
    }

    @Test
    fun `turning monitoring on survives a restart`() {
        prefs.setMonitoringEnabled(true)

        assertTrue(restarted().isMonitoringEnabled())
    }

    @Test
    fun `turning monitoring off survives a restart`() {
        prefs.setMonitoringEnabled(true)
        prefs.setMonitoringEnabled(false)

        assertFalse(restarted().isMonitoringEnabled())
    }

    // ---- mirrored rules and goals ----------------------------------------------------------

    @Test
    fun `saved rules are readable after a restart`() {
        prefs.saveBlockedApps(ONE_APP)

        assertEquals("com.instagram.android", restarted().blockedApps().single().packageName)
    }

    @Test
    fun `saving rules replaces the previous rules`() {
        prefs.saveBlockedApps(ONE_APP)
        prefs.saveBlockedApps(OTHER_APP)

        assertEquals(listOf("com.example.reels"), prefs.blockedApps().map { it.packageName })
    }

    @Test
    fun `a rejected rules payload leaves the previous rules intact`() {
        prefs.saveBlockedApps(ONE_APP)

        assertThrows(ConfigFormatException::class.java) { prefs.saveBlockedApps("[{\"packageName\":\"\"}]") }

        assertEquals(listOf("com.instagram.android"), restarted().blockedApps().map { it.packageName })
    }

    @Test
    fun `saved goals are readable after a restart`() {
        prefs.saveGoals(ONE_GOAL)

        assertEquals("Finish the report", restarted().goals().single().title)
    }

    @Test
    fun `saving goals replaces the previous goals`() {
        prefs.saveGoals(ONE_GOAL)
        prefs.saveGoals(OTHER_GOAL)

        assertEquals(listOf("g2"), prefs.goals().map { it.id })
    }

    @Test
    fun `a rejected goals payload leaves the previous goals intact`() {
        prefs.saveGoals(ONE_GOAL)

        assertThrows(ConfigFormatException::class.java) { prefs.saveGoals("not json") }

        assertEquals(listOf("g1"), restarted().goals().map { it.id })
    }

    @Test
    fun `before anything is synced there are no rules and no goals`() {
        assertTrue(prefs.blockedApps().isEmpty())
        assertTrue(prefs.goals().isEmpty())
    }

    @Test
    fun `corrupt stored rules read as empty instead of crashing`() {
        store.putString("blockedAppsJson", "{corrupt")

        assertTrue(prefs.blockedApps().isEmpty())
    }

    @Test
    fun `corrupt stored goals read as empty instead of crashing`() {
        store.putString("goalsJson", "{corrupt")

        assertTrue(prefs.goals().isEmpty())
    }

    // ---- engine state ----------------------------------------------------------------------

    @Test
    fun `engine state is empty before anything is saved`() {
        assertEquals(EngineState.EMPTY, prefs.engineState())
    }

    @Test
    fun `engine state survives a restart`() {
        val state =
            EngineState(
                apps =
                    mapOf(
                        "com.instagram.android" to
                            AppUsage("2026-09-29", 5_000L, 5_000L, T0 + 60_000L, BlockReason.SESSION_COOLDOWN),
                    ),
                lastTickMs = T0,
                lastForegroundPackage = "com.instagram.android",
            )
        prefs.saveEngineState(state)

        assertEquals(state, restarted().engineState())
    }

    // ---- liveness --------------------------------------------------------------------------

    @Test
    fun `with no heartbeat the service is not running`() {
        assertNull(prefs.lastHeartbeatAt())
        assertFalse(prefs.isRunning())
    }

    @Test
    fun `a fresh heartbeat means running`() {
        prefs.recordHeartbeat()
        now = T0 + RecessPrefs.HEARTBEAT_STALE_MS - 1

        assertEquals(T0, prefs.lastHeartbeatAt())
        assertTrue(prefs.isRunning())
    }

    @Test
    fun `a stale heartbeat means not running`() {
        prefs.recordHeartbeat()
        now = T0 + RecessPrefs.HEARTBEAT_STALE_MS + 1

        assertFalse(prefs.isRunning())
    }

    @Test
    fun `the last stop reason is remembered across a restart`() {
        assertNull(prefs.lastStopReason())

        prefs.recordStopReason("task_removed")

        assertEquals("task_removed", restarted().lastStopReason())
    }

    @Test
    fun `status reports intent, liveness and the last stop reason together`() {
        prefs.setMonitoringEnabled(true)
        prefs.recordHeartbeat()
        prefs.recordStopReason("destroyed")

        assertEquals(MonitorStatus(true, true, T0, "destroyed"), prefs.status())
    }

    // ---- change detection for the monitor --------------------------------------------------

    @Test
    fun `the config version starts at zero`() {
        assertEquals(0L, prefs.configVersion())
    }

    @Test
    fun `saving rules or goals advances the config version`() {
        prefs.saveBlockedApps(ONE_APP)
        assertEquals(1L, prefs.configVersion())

        prefs.saveGoals(ONE_GOAL)
        assertEquals(2L, prefs.configVersion())
    }

    @Test
    fun `the config version survives a restart`() {
        prefs.saveBlockedApps(ONE_APP)

        assertEquals(1L, restarted().configVersion())
    }

    @Test
    fun `a rejected payload does not advance the config version`() {
        prefs.saveBlockedApps(ONE_APP)

        assertThrows(ConfigFormatException::class.java) { prefs.saveBlockedApps("not json") }
        assertThrows(ConfigFormatException::class.java) { prefs.saveGoals("not json") }

        assertEquals(1L, prefs.configVersion())
    }

    @Test
    fun `turning monitoring on or off does not advance the config version`() {
        prefs.setMonitoringEnabled(true)
        prefs.setMonitoringEnabled(false)

        assertEquals(0L, prefs.configVersion())
    }
}
