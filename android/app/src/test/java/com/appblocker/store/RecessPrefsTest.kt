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
    fun `there is no heartbeat until the service writes one`() {
        assertNull(prefs.lastHeartbeatAt())
    }

    @Test
    fun `the heartbeat records when the service last checked in`() {
        prefs.recordHeartbeat()

        assertEquals(T0, prefs.lastHeartbeatAt())
    }

    @Test
    fun `the last stop reason is remembered across a restart`() {
        assertNull(prefs.lastStopReason())

        prefs.recordStopReason("task_removed")

        assertEquals("task_removed", restarted().lastStopReason())
    }

    @Test
    fun `status reports intent, the live running flag, heartbeat and last stop reason together`() {
        prefs.setMonitoringEnabled(true)
        prefs.recordHeartbeat()
        prefs.recordStopReason("destroyed")

        assertEquals(MonitorStatus(true, true, T0, "destroyed", T0, emptyList()), prefs.status(running = true))
    }

    @Test
    fun `the running flag in status comes from the caller, not from the heartbeat`() {
        prefs.setMonitoringEnabled(true)
        prefs.recordHeartbeat()

        assertFalse(prefs.status(running = false).running)
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

    // ---- a durable, verifiable intent -------------------------------------------------------

    @Test
    fun `the intent is unknown until it has ever been written`() {
        assertFalse(prefs.isIntentKnown())
    }

    @Test
    fun `writing the intent, on or off, makes it known`() {
        prefs.setMonitoringEnabled(false)

        assertTrue(restarted().isIntentKnown())
    }

    @Test
    fun `an intent that cannot be persisted is reported instead of pretending it worked`() {
        store.failDurableWrites = true

        assertThrows(IllegalStateException::class.java) { prefs.setMonitoringEnabled(true) }
        assertFalse(prefs.isMonitoringEnabled())
    }

    // ---- health ----------------------------------------------------------------------------

    @Test
    fun `there are no health issues until some are recorded`() {
        assertTrue(prefs.healthIssues().isEmpty())
    }

    @Test
    fun `recorded health issues survive a restart and appear in status`() {
        prefs.saveHealthIssues(setOf(HealthIssue.USAGE_ACCESS_MISSING, HealthIssue.OVERLAY_MISSING))

        assertEquals(
            setOf(HealthIssue.USAGE_ACCESS_MISSING, HealthIssue.OVERLAY_MISSING),
            restarted().healthIssues(),
        )
        assertEquals(
            listOf("OVERLAY_MISSING", "USAGE_ACCESS_MISSING"),
            prefs.status(running = true).health,
        )
    }

    @Test
    fun `recording no issues clears the earlier ones`() {
        prefs.saveHealthIssues(setOf(HealthIssue.OVERLAY_MISSING))

        prefs.saveHealthIssues(emptySet())

        assertTrue(prefs.healthIssues().isEmpty())
    }

    @Test
    fun `unknown names in stored health are ignored`() {
        store.putString("healthIssues", "OVERLAY_MISSING,FROM_A_FUTURE_VERSION,")

        assertEquals(setOf(HealthIssue.OVERLAY_MISSING), prefs.healthIssues())
    }

    // ---- unreadable rules ------------------------------------------------------------------

    @Test
    fun `rules that were never saved are not unreadable`() {
        assertFalse(prefs.hasUnreadableRules())
    }

    @Test
    fun `saved rules are not unreadable`() {
        prefs.saveBlockedApps(ONE_APP)

        assertFalse(prefs.hasUnreadableRules())
    }

    @Test
    fun `stored rules that fail to parse are flagged instead of silently reading as none`() {
        store.putString("blockedAppsJson", "{corrupt")

        assertTrue(prefs.hasUnreadableRules())
    }

    // ---- the last limit event ----------------------------------------------------------------

    @Test
    fun `there is no limit event until one is saved`() {
        assertNull(prefs.lastLimitEventJson())
    }

    @Test
    fun `a saved limit event is readable after a restart`() {
        prefs.saveLimitEvent("""{"appName":"Instagram"}""")

        assertEquals("""{"appName":"Instagram"}""", restarted().lastLimitEventJson())
    }

    @Test
    fun `a newer limit event replaces the older one`() {
        prefs.saveLimitEvent("one")
        prefs.saveLimitEvent("two")

        assertEquals("two", prefs.lastLimitEventJson())
    }

    // ---- a missing payload -------------------------------------------------------------------

    @Test
    fun `a missing rules payload is rejected like any malformed one and keeps the old rules`() {
        prefs.saveBlockedApps(ONE_APP)

        assertThrows(ConfigFormatException::class.java) { prefs.saveBlockedApps(null) }

        assertEquals(listOf("com.instagram.android"), prefs.blockedApps().map { it.packageName })
    }

    @Test
    fun `a missing goals payload is rejected and keeps the old goals`() {
        prefs.saveGoals(ONE_GOAL)

        assertThrows(ConfigFormatException::class.java) { prefs.saveGoals(null) }

        assertEquals(listOf("g1"), prefs.goals().map { it.id })
    }

    // ---- when the last stop happened ---------------------------------------------------------

    @Test
    fun `a stop reason is stored with the time it was recorded`() {
        prefs.recordStopReason("destroyed_while_enabled")

        assertEquals(T0, prefs.lastStopReasonAt())
    }

    @Test
    fun `the same reason recorded later gets a later time, so it can be told apart`() {
        prefs.recordStopReason("destroyed_while_enabled")
        now = T0 + 3_600_000L

        prefs.recordStopReason("destroyed_while_enabled")

        assertEquals(T0 + 3_600_000L, prefs.lastStopReasonAt())
    }

    @Test
    fun `there is no stop time before any stop`() {
        assertNull(prefs.lastStopReasonAt())
    }

    // ---- quotes fetched online -----------------------------------------------------------------

    @Test
    fun `there are no extra quotes until some are saved`() {
        assertTrue(prefs.extraQuotes().isEmpty())
    }

    @Test
    fun `saved extra quotes survive a restart`() {
        prefs.saveExtraQuotes("""[{"text":"A fine quote from the internet.","author":"Someone"}]""")

        assertEquals("A fine quote from the internet.", restarted().extraQuotes().single().text)
    }

    @Test
    fun `saving replaces the earlier extras, and an empty list clears them`() {
        prefs.saveExtraQuotes("""[{"text":"First extra quote is here.","author":"A"}]""")
        prefs.saveExtraQuotes("""[{"text":"Second extra quote is here.","author":"B"}]""")
        assertEquals(listOf("Second extra quote is here."), prefs.extraQuotes().map { it.text })

        prefs.saveExtraQuotes("[]")

        assertTrue(prefs.extraQuotes().isEmpty())
    }

    @Test
    fun `a malformed extras payload is rejected and the earlier extras stay`() {
        prefs.saveExtraQuotes("""[{"text":"Kept extra quote stays.","author":"A"}]""")

        assertThrows(ConfigFormatException::class.java) { prefs.saveExtraQuotes("{not a list") }
        assertThrows(ConfigFormatException::class.java) { prefs.saveExtraQuotes(null) }

        assertEquals(listOf("Kept extra quote stays."), prefs.extraQuotes().map { it.text })
    }

    @Test
    fun `corrupt stored extras read as none instead of crashing`() {
        store.putString("extraQuotesJson", "{corrupt")

        assertTrue(prefs.extraQuotes().isEmpty())
    }
}
