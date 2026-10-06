package com.appblocker.service

import com.appblocker.engine.DayClock
import com.appblocker.engine.EngineAction
import com.appblocker.engine.EnforcementEngine
import com.appblocker.store.HealthIssue
import com.appblocker.store.InMemoryKeyValueStore
import com.appblocker.store.KeyValueStore
import com.appblocker.store.RecessPrefs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

private const val SECOND = 1_000L
private const val DAY = 24 * 60 * 60 * SECOND
private const val T0 = 100 * DAY + 10 * 60 * 60 * SECOND
private const val INSTAGRAM = "com.instagram.android"

/** A 1-minute session limit and a 2-minute cooldown, no daily budget. */
private const val INSTAGRAM_RULE =
    """[{"packageName":"com.instagram.android","appName":"Instagram","limitMinutes":1,"cooldownMinutes":2,"isActive":true}]"""
private const val INACTIVE_RULE =
    """[{"packageName":"com.instagram.android","appName":"Instagram","limitMinutes":1,"cooldownMinutes":2,"isActive":false}]"""

private class FakeDayClock : DayClock {
    override fun dayKey(nowMs: Long) = "day-${nowMs / DAY}"

    override fun nextDayStartMs(nowMs: Long) = (nowMs / DAY + 1) * DAY
}

private class RecordingSink : ActionSink {
    val ejected = mutableListOf<String>()
    val limits = mutableListOf<EngineAction.NotifyLimitReached>()
    val ended = mutableListOf<EngineAction.BlockEnded>()
    var failOnEject = false
    val covered = mutableListOf<String>()
    val foregrounds = mutableListOf<String?>()
    var failOnCover = false
    var failOnForegroundReport = false
    val breakLaunches = mutableListOf<Long>()
    var failOnLaunch = false

    override fun launchBreak(delayMs: Long) {
        if (failOnLaunch) throw IllegalStateException("cannot start the Break screen")
        breakLaunches += delayMs
    }

    override fun blockedAppInFront(packageName: String) {
        if (failOnCover) throw IllegalStateException("cannot draw the cover")
        covered += packageName
    }

    override fun foregroundChanged(packageName: String?) {
        if (failOnForegroundReport) throw IllegalStateException("cannot report")
        foregrounds += packageName
    }

    override fun ejectToHome(packageName: String) {
        if (failOnEject) throw IllegalStateException("cannot start home")
        ejected += packageName
    }

    override fun limitReached(event: EngineAction.NotifyLimitReached) {
        limits += event
    }

    override fun blockEnded(event: EngineAction.BlockEnded) {
        ended += event
    }
}

private class CountingStore(private val inner: KeyValueStore) : KeyValueStore by inner {
    val stringWrites = mutableMapOf<String, Int>()

    override fun putString(key: String, value: String) {
        stringWrites[key] = (stringWrites[key] ?: 0) + 1
        inner.putString(key, value)
    }

    override fun putStringDurable(key: String, value: String): Boolean {
        stringWrites[key] = (stringWrites[key] ?: 0) + 1
        return inner.putStringDurable(key, value)
    }
}

class MonitorTickerTest {
    private val store = CountingStore(InMemoryKeyValueStore())
    private var now = T0
    private val prefs = RecessPrefs(store) { now }
    private val sink = RecordingSink()
    private var foreground: String? = null
    private var screenOn = true
    private var pollFailure: Exception? = null
    private var polls = 0
    private var probeIssues = emptySet<HealthIssue>()
    private val errors = mutableListOf<String>()

    private fun newTicker() =
        MonitorTicker(
            prefs = prefs,
            engine = EnforcementEngine(FakeDayClock(), initialState = prefs.engineState()),
            pollForeground = {
                polls++
                pollFailure?.let { throw it }
                foreground
            },
            isScreenOn = { screenOn },
            healthProbe = object : HealthProbe {
                override fun issues() = probeIssues
            },
            sink = sink,
            clock = { now },
            onError = { message, _ -> errors += message },
        )

    private val ticker = newTicker()

    /** Ticks once a second for [seconds] seconds (inclusive of the first tick at the current time). */
    private fun run(seconds: Int, using: MonitorTicker = ticker) {
        repeat(seconds) {
            using.tick()
            now += SECOND
        }
    }

    private fun enableWithInstagramRule() {
        prefs.setMonitoringEnabled(true)
        prefs.saveBlockedApps(INSTAGRAM_RULE)
        foreground = INSTAGRAM
    }

    // ---- start / stop ----------------------------------------------------------------------

    @Test
    fun `it stops, without polling, once monitoring is turned off`() {
        prefs.setMonitoringEnabled(false)

        val outcome = ticker.tick()

        assertTrue(outcome.stop)
        assertEquals(0, polls)
    }

    @Test
    fun `it keeps going while monitoring is on`() {
        enableWithInstagramRule()

        assertFalse(ticker.tick().stop)
    }

    // ---- pacing ----------------------------------------------------------------------------

    @Test
    fun `it ticks fast while the screen is on and a rule is active`() {
        enableWithInstagramRule()

        assertEquals(MonitorTicker.FAST_DELAY_MS, ticker.tick().nextDelayMs)
    }

    @Test
    fun `it slows down and does not poll when no rule is active`() {
        prefs.setMonitoringEnabled(true)
        prefs.saveBlockedApps(INACTIVE_RULE)

        val outcome = ticker.tick()

        assertEquals(MonitorTicker.SLOW_DELAY_MS, outcome.nextDelayMs)
        assertEquals(0, polls)
    }

    @Test
    fun `it slows down and does not poll while the screen is off`() {
        enableWithInstagramRule()
        screenOn = false

        val outcome = ticker.tick()

        assertEquals(MonitorTicker.SLOW_DELAY_MS, outcome.nextDelayMs)
        assertEquals(0, polls)
    }

    @Test
    fun `it speeds up when JS syncs a rule after starting with none`() {
        prefs.setMonitoringEnabled(true)
        foreground = INSTAGRAM
        assertEquals(MonitorTicker.SLOW_DELAY_MS, ticker.tick().nextDelayMs)

        prefs.saveBlockedApps(INSTAGRAM_RULE)

        assertEquals(MonitorTicker.FAST_DELAY_MS, ticker.tick().nextDelayMs)
    }

    // ---- heartbeat -------------------------------------------------------------------------

    @Test
    fun `the first tick writes a heartbeat straight away`() {
        enableWithInstagramRule()

        ticker.tick()

        assertEquals(T0, prefs.lastHeartbeatAt())
    }

    @Test
    fun `the heartbeat is refreshed only every thirty seconds`() {
        enableWithInstagramRule()
        ticker.tick()

        now = T0 + 29 * SECOND
        ticker.tick()
        assertEquals(T0, prefs.lastHeartbeatAt())

        now = T0 + 30 * SECOND
        ticker.tick()
        assertEquals(T0 + 30 * SECOND, prefs.lastHeartbeatAt())
    }

    // ---- enforcing -------------------------------------------------------------------------

    @Test
    fun `hitting the limit reports it once and starts the Break screen, without sending home yet`() {
        enableWithInstagramRule()

        run(61)

        assertEquals(1, sink.limits.size)
        assertEquals(listOf(300L), sink.breakLaunches)
        assertTrue(sink.ejected.isEmpty())
    }

    @Test
    fun `if the Break screen never arrives, going home takes over, backs off when refused, and nothing is reported twice`() {
        enableWithInstagramRule()
        run(61)

        run(30)

        // Not before the Break launches have had their chance (4 s), then one every 2 s; the fifth is
        // unanswered, so the phone is refusing and further tries become rare (they only fill the log).
        assertEquals(5, sink.ejected.size)
        assertEquals(1, sink.limits.size)
    }

    // ---- covering the blocked app ------------------------------------------------------------

    @Test
    fun `the blocked app is covered on every tick it stays in front, whatever the eject throttle says`() {
        enableWithInstagramRule()
        run(61)

        run(10)

        assertEquals(11, sink.covered.size)
        assertTrue(sink.covered.all { it == INSTAGRAM })
    }

    @Test
    fun `nothing is covered while the blocked app is not in front`() {
        enableWithInstagramRule()
        run(61)
        val coveredSoFar = sink.covered.size
        foreground = "com.oneplus.launcher"

        run(10)

        assertEquals(coveredSoFar, sink.covered.size)
    }

    @Test
    fun `nothing is covered before the limit is reached`() {
        enableWithInstagramRule()

        run(30)

        assertTrue(sink.covered.isEmpty())
    }

    @Test
    fun `a cover that cannot be drawn does not stop the Break screen from being started`() {
        enableWithInstagramRule()
        sink.failOnCover = true

        run(61)

        assertEquals(listOf(300L), sink.breakLaunches)
        assertEquals(1, sink.limits.size)
        assertTrue(errors.isNotEmpty())
    }

    // ---- the Break screen takeover -------------------------------------------------------------

    @Test
    fun `a retry of the Break screen is made once if the blocked app is still in front`() {
        enableWithInstagramRule()
        run(61)

        run(10)

        assertEquals(listOf(300L, 0L), sink.breakLaunches)
    }

    @Test
    fun `going home is held back for the first seconds, then allowed`() {
        enableWithInstagramRule()
        run(61)

        run(3)
        assertTrue(sink.ejected.isEmpty())

        run(2)
        assertEquals(1, sink.ejected.size)
    }

    @Test
    fun `a home attempt never lands on top of the Break screen once it is in front`() {
        enableWithInstagramRule()
        run(61)
        foreground = "com.appblocker" // the Break screen arrived

        run(20)

        assertTrue(sink.ejected.isEmpty())
        assertEquals(listOf(300L), sink.breakLaunches)
    }

    @Test
    fun `opening the blocked app again starts the Break screen again`() {
        enableWithInstagramRule()
        run(61)
        foreground = "com.oneplus.launcher"
        run(2)
        foreground = INSTAGRAM

        run(1)

        assertEquals(listOf(300L, 300L), sink.breakLaunches)
    }

    @Test
    fun `a Break launch that fails is reported, and going home still takes over later`() {
        enableWithInstagramRule()
        sink.failOnLaunch = true

        run(61)
        run(10)

        assertTrue(errors.isNotEmpty())
        assertTrue(sink.ejected.isNotEmpty())
        assertEquals(1, sink.limits.size)
    }

    @Test
    fun `the sink is told when the app in front changes, once per change`() {
        enableWithInstagramRule()
        run(2)
        foreground = "com.oneplus.launcher"
        run(3)
        foreground = null
        run(2)
        foreground = INSTAGRAM
        run(1)

        assertEquals(listOf(INSTAGRAM, "com.oneplus.launcher", null, INSTAGRAM), sink.foregrounds)
    }

    @Test
    fun `a failing report of the front app does not stop the tick`() {
        enableWithInstagramRule()
        sink.failOnForegroundReport = true

        run(61)

        assertEquals(1, sink.limits.size)
        assertTrue(errors.isNotEmpty())
    }

    @Test
    fun `the block ends on time and is reported once, even with the screen off`() {
        enableWithInstagramRule()
        run(61)
        val blockedUntil = sink.limits.single().blockedUntilMs
        screenOn = false

        now = blockedUntil + SECOND
        ticker.tick()
        ticker.tick()

        assertEquals(1, sink.ended.size)
    }

    // ---- persistence -----------------------------------------------------------------------

    @Test
    fun `a new block is persisted immediately`() {
        enableWithInstagramRule()

        run(61)

        assertNotNull(prefs.engineState().apps[INSTAGRAM]?.blockedUntilMs)
    }

    @Test
    fun `usage ticking up is not written on every tick`() {
        enableWithInstagramRule()

        run(5)

        assertEquals(1, store.stringWrites["engineStateJson"])
    }

    @Test
    fun `a restarted monitor keeps blocking without reporting the limit again`() {
        enableWithInstagramRule()
        run(61)
        val restarted = newTicker()

        run(3, using = restarted)

        assertEquals(1, sink.limits.size)
        // The restarted monitor treats the blocked app being in front as a fresh episode: the
        // first launch, and its one retry two seconds later.
        assertEquals(listOf(300L, 300L, 0L), sink.breakLaunches)
        assertTrue(sink.ejected.isEmpty())
    }

    // ---- when things go wrong --------------------------------------------------------------

    @Test
    fun `losing usage access is survived with a backoff and a logged error`() {
        enableWithInstagramRule()
        pollFailure = SecurityException("usage access revoked")

        val outcome = ticker.tick()

        assertFalse(outcome.stop)
        assertEquals(MonitorTicker.ERROR_BACKOFF_MS, outcome.nextDelayMs)
        assertEquals(1, errors.size)
        assertTrue(sink.ejected.isEmpty())
    }

    @Test
    fun `a failing eject does not stop the report or the persistence`() {
        enableWithInstagramRule()
        sink.failOnEject = true

        run(61)
        run(10) // long enough for the first home attempt to be made, and to fail

        assertEquals(1, sink.limits.size)
        assertNotNull(prefs.engineState().apps[INSTAGRAM]?.blockedUntilMs)
        assertTrue(errors.isNotEmpty())
    }

    @Test
    fun `no rule blocks anything before any rules exist`() {
        prefs.setMonitoringEnabled(true)
        foreground = INSTAGRAM

        run(90)

        assertTrue(sink.ejected.isEmpty())
        assertNull(prefs.engineState().apps[INSTAGRAM])
    }

    // ---- surviving anything ----------------------------------------------------------------

    @Test
    fun `nothing that goes wrong inside a tick can escape it`() {
        enableWithInstagramRule()
        val brokenStore = object : KeyValueStore by InMemoryKeyValueStore() {
            override fun getBoolean(key: String, default: Boolean): Boolean = throw IllegalStateException("prefs broke")
        }
        val broken =
            MonitorTicker(
                prefs = RecessPrefs(brokenStore) { now },
                engine = EnforcementEngine(FakeDayClock()),
                pollForeground = { foreground },
                isScreenOn = { true },
                healthProbe = object : HealthProbe {
                    override fun issues() = emptySet<HealthIssue>()
                },
                sink = sink,
                clock = { now },
                onError = { message, _ -> errors += message },
            )

        val outcome = broken.tick()

        assertFalse(outcome.stop)
        assertEquals(MonitorTicker.ERROR_BACKOFF_MS, outcome.nextDelayMs)
        assertTrue(errors.isNotEmpty())
    }

    @Test
    fun `an intent that was never written keeps the monitor running instead of stopping it`() {
        // Nothing ever wrote the intent: "off" here may just mean unreadable storage.
        assertFalse(ticker.tick().stop)
    }

    @Test
    fun `an unreadable intent is reported as a health issue`() {
        ticker.tick()

        assertTrue(HealthIssue.INTENT_UNKNOWN in prefs.healthIssues())
    }

    // ---- health ----------------------------------------------------------------------------

    @Test
    fun `problems found by the probe are recorded on the first tick`() {
        enableWithInstagramRule()
        probeIssues = setOf(HealthIssue.OVERLAY_MISSING)

        ticker.tick()

        assertEquals(setOf(HealthIssue.OVERLAY_MISSING), prefs.healthIssues())
    }

    @Test
    fun `the probe is only asked again after thirty seconds`() {
        enableWithInstagramRule()
        ticker.tick()
        probeIssues = setOf(HealthIssue.USAGE_ACCESS_MISSING)

        now = T0 + 10 * SECOND
        ticker.tick()
        assertTrue(prefs.healthIssues().isEmpty())

        now = T0 + 30 * SECOND
        ticker.tick()
        assertEquals(setOf(HealthIssue.USAGE_ACCESS_MISSING), prefs.healthIssues())
    }

    @Test
    fun `an issue that is fixed is cleared`() {
        enableWithInstagramRule()
        probeIssues = setOf(HealthIssue.OVERLAY_MISSING)
        ticker.tick()

        probeIssues = emptySet()
        now = T0 + 31 * SECOND
        ticker.tick()

        assertTrue(prefs.healthIssues().isEmpty())
    }

    @Test
    fun `a failing foreground poll is reported and clears once it works again`() {
        enableWithInstagramRule()
        pollFailure = SecurityException("usage access revoked")
        ticker.tick()
        assertTrue(HealthIssue.POLL_FAILING in prefs.healthIssues())

        pollFailure = null
        now += SECOND
        ticker.tick()

        assertFalse(HealthIssue.POLL_FAILING in prefs.healthIssues())
    }

    @Test
    fun `rules that cannot be read are reported instead of silently meaning no rules`() {
        prefs.setMonitoringEnabled(true)
        store.putString("blockedAppsJson", "{corrupt")
        prefs.saveHealthIssues(emptySet())

        ticker.tick()

        assertTrue(HealthIssue.RULES_UNREADABLE in prefs.healthIssues())
    }

    @Test
    fun `an eject that keeps not working is reported`() {
        enableWithInstagramRule()
        run(61)

        run(15)

        assertTrue(HealthIssue.EJECT_INEFFECTIVE in prefs.healthIssues())
    }

    @Test
    fun `the eject warning goes away once the blocked app stops coming back`() {
        enableWithInstagramRule()
        run(61)
        run(15)
        foreground = null

        run(40)

        assertFalse(HealthIssue.EJECT_INEFFECTIVE in prefs.healthIssues())
    }

    @Test
    fun `reopening the blocked app again and again is not reported as an eject that fails`() {
        enableWithInstagramRule()
        run(61)
        repeat(8) {
            foreground = "com.oneplus.launcher" // sent home
            run(2)
            foreground = INSTAGRAM // opened again
            run(2)
        }

        assertFalse(HealthIssue.EJECT_INEFFECTIVE in prefs.healthIssues())
    }
}
