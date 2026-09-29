package com.appblocker.service

import com.appblocker.engine.DayClock
import com.appblocker.engine.EngineAction
import com.appblocker.engine.EnforcementEngine
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
    fun `hitting the limit ejects once and reports the limit once`() {
        enableWithInstagramRule()

        run(61)

        assertEquals(listOf(INSTAGRAM), sink.ejected)
        assertEquals(1, sink.limits.size)
    }

    @Test
    fun `ten more seconds in the blocked app eject every tick but never report again`() {
        enableWithInstagramRule()
        run(61)

        run(10)

        assertEquals(11, sink.ejected.size)
        assertEquals(1, sink.limits.size)
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
        assertEquals(4, sink.ejected.size)
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
}
