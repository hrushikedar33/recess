package com.appblocker.engine

import com.appblocker.engine.EngineAction.BlockEnded
import com.appblocker.engine.EngineAction.EjectToHome
import com.appblocker.engine.EngineAction.NotifyLimitReached
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

private const val SECOND = 1_000L
private const val MINUTE = 60 * SECOND
private const val HOUR = 60 * MINUTE
private const val DAY = 24 * HOUR

private const val INSTA = "com.instagram.android"
private const val REELS_APP = "com.example.reels"

/** Day 100, 10:00. Days are plain 24 h buckets since the epoch: deterministic, no timezone. */
private const val T0 = 100 * DAY + 10 * HOUR

private class FakeDayClock : DayClock {
    override fun dayKey(nowMs: Long) = "day-${nowMs / DAY}"

    override fun nextDayStartMs(nowMs: Long) = (nowMs / DAY + 1) * DAY
}

private fun rule(
    pkg: String = INSTA,
    session: Long = 10 * SECOND,
    cooldown: Long = 5 * MINUTE,
    daily: Long? = null,
    active: Boolean = true,
) = AppRule(pkg, "App $pkg", session, cooldown, daily, active)

class EnforcementEngineTest {
    private val engine =
        EnforcementEngine(FakeDayClock(), EngineConfig(maxCreditMs = 3 * SECOND))

    /** One tick per second from [startMs] for [seconds] seconds (so seconds + 1 ticks). */
    private fun ticks(
        startMs: Long,
        seconds: Int,
        foreground: String?,
        vararg rules: AppRule,
    ): List<EngineAction> =
        (0..seconds).flatMap { i ->
            engine.tick(startMs + i * SECOND, foreground, rules.toList())
        }

    private fun sessionUsedMs(pkg: String = INSTA): Long =
        engine.snapshot().apps[pkg]?.sessionUsedMs ?: 0L

    private fun dailyUsedMs(pkg: String = INSTA): Long =
        engine.snapshot().apps[pkg]?.dailyUsedMs ?: 0L

    private fun blockedUntilMs(pkg: String = INSTA): Long? =
        engine.snapshot().apps[pkg]?.blockedUntilMs

    private fun List<EngineAction>.notifications() = filterIsInstance<NotifyLimitReached>()

    private fun List<EngineAction>.ejections() = filterIsInstance<EjectToHome>()

    // ---- accruing usage --------------------------------------------------------------------

    @Test
    fun `first tick after the app appears credits nothing`() {
        engine.tick(T0, INSTA, listOf(rule()))

        assertEquals(0L, sessionUsedMs())
    }

    @Test
    fun `contiguous ticks credit both the session and the day`() {
        ticks(T0, 5, INSTA, rule(daily = HOUR))

        assertEquals(5 * SECOND, sessionUsedMs())
        assertEquals(5 * SECOND, dailyUsedMs())
    }

    @Test
    fun `a gap longer than the cap is credited only up to the cap`() {
        engine.tick(T0, INSTA, listOf(rule()))
        engine.tick(T0 + MINUTE, INSTA, listOf(rule()))

        assertEquals(3 * SECOND, sessionUsedMs())
    }

    @Test
    fun `leaving the app and coming back does not credit the time away`() {
        engine.tick(T0, INSTA, listOf(rule()))
        engine.tick(T0 + 1 * SECOND, null, listOf(rule()))
        engine.tick(T0 + 2 * SECOND, INSTA, listOf(rule()))

        assertEquals(0L, sessionUsedMs())
    }

    @Test
    fun `switching between two limited apps credits neither for the switch`() {
        val rules = listOf(rule(INSTA), rule(REELS_APP))
        engine.tick(T0, INSTA, rules)
        engine.tick(T0 + 1 * SECOND, REELS_APP, rules)
        engine.tick(T0 + 2 * SECOND, REELS_APP, rules)

        assertEquals(0L, sessionUsedMs(INSTA))
        assertEquals(1 * SECOND, sessionUsedMs(REELS_APP))
    }

    @Test
    fun `an inactive rule causes no actions and no counting`() {
        val actions = ticks(T0, 30, INSTA, rule(active = false))

        assertTrue(actions.isEmpty())
        assertNull(engine.snapshot().apps[INSTA])
    }

    // ---- session limit and cooldown --------------------------------------------------------

    @Test
    fun `reaching the session limit ejects then notifies once with the cooldown end`() {
        val actions = ticks(T0, 10, INSTA, rule(session = 10 * SECOND, cooldown = 5 * MINUTE))

        assertEquals(2, actions.size)
        assertEquals(EjectToHome(INSTA), actions[0])
        val notify = actions[1] as NotifyLimitReached
        assertEquals(BlockReason.SESSION_COOLDOWN, notify.reason)
        assertEquals(T0 + 10 * SECOND + 5 * MINUTE, notify.blockedUntilMs)
    }

    @Test
    fun `sixty more ticks in the blocked app eject every time but never notify again`() {
        val rule = rule()
        ticks(T0, 10, INSTA, rule)

        val actions = ticks(T0 + 11 * SECOND, 59, INSTA, rule)

        assertEquals(60, actions.ejections().size)
        assertEquals(0, actions.notifications().size)
    }

    @Test
    fun `another app or no app in front while blocked does nothing and counts nothing`() {
        val rule = rule(daily = HOUR)
        ticks(T0, 10, INSTA, rule)
        val dailyBefore = dailyUsedMs()

        val other = engine.tick(T0 + 11 * SECOND, "com.example.other", listOf(rule))
        val nothing = engine.tick(T0 + 12 * SECOND, null, listOf(rule))

        assertTrue(other.isEmpty())
        assertTrue(nothing.isEmpty())
        assertEquals(dailyBefore, dailyUsedMs())
    }

    @Test
    fun `when the cooldown ends the block ends once, the session resets and the day total stays`() {
        val rule = rule(cooldown = 5 * MINUTE, daily = HOUR)
        ticks(T0, 10, INSTA, rule)
        val blockedUntil = T0 + 10 * SECOND + 5 * MINUTE

        val ended = engine.tick(blockedUntil, null, listOf(rule))
        val afterwards = engine.tick(blockedUntil + SECOND, null, listOf(rule))

        assertEquals(listOf<EngineAction>(BlockEnded(INSTA, BlockReason.SESSION_COOLDOWN)), ended)
        assertTrue(afterwards.isEmpty())
        assertEquals(0L, sessionUsedMs())
        assertEquals(10 * SECOND, dailyUsedMs())
    }

    @Test
    fun `after a cooldown the next session limit notifies again`() {
        val rule = rule(cooldown = 5 * MINUTE, daily = HOUR)
        ticks(T0, 10, INSTA, rule)
        val resume = T0 + 10 * SECOND + 5 * MINUTE

        val actions = ticks(resume, 10, INSTA, rule)

        assertEquals(1, actions.notifications().size)
        assertEquals(BlockReason.SESSION_COOLDOWN, actions.notifications().single().reason)
    }

    @Test
    fun `a zero cooldown notifies and ejects once without blocking`() {
        val actions = ticks(T0, 10, INSTA, rule(session = 10 * SECOND, cooldown = 0))

        assertEquals(1, actions.notifications().size)
        assertEquals(1, actions.ejections().size)
        assertNull(blockedUntilMs())
        assertEquals(0L, sessionUsedMs())
    }

    @Test
    fun `a cooldown that spans midnight keeps blocking until it ends`() {
        val rule = rule(session = 10 * SECOND, cooldown = 30 * MINUTE)
        val start = 101 * DAY - 20 * SECOND
        ticks(start, 10, INSTA, rule)
        val blockedUntil = blockedUntilMs()!!

        val afterMidnight = engine.tick(101 * DAY + 5 * MINUTE, INSTA, listOf(rule))
        val ended = engine.tick(blockedUntil, null, listOf(rule))

        assertEquals(listOf<EngineAction>(EjectToHome(INSTA)), afterMidnight)
        assertEquals(listOf<EngineAction>(BlockEnded(INSTA, BlockReason.SESSION_COOLDOWN)), ended)
    }

    // ---- daily budget ----------------------------------------------------------------------

    @Test
    fun `spending the daily budget blocks until the next local midnight`() {
        val actions = ticks(T0, 10, INSTA, rule(session = HOUR, daily = 10 * SECOND))

        val notify = actions.notifications().single()
        assertEquals(BlockReason.DAILY_LIMIT, notify.reason)
        assertEquals(101 * DAY, notify.blockedUntilMs)
    }

    @Test
    fun `the daily block ignores the cooldown setting`() {
        val actions =
            ticks(T0, 10, INSTA, rule(session = HOUR, cooldown = 1 * MINUTE, daily = 10 * SECOND))

        assertEquals(101 * DAY, actions.notifications().single().blockedUntilMs)
    }

    @Test
    fun `when both limits trip on the same tick the daily block wins with one notification`() {
        val actions =
            ticks(T0, 10, INSTA, rule(session = 10 * SECOND, daily = 10 * SECOND))

        assertEquals(BlockReason.DAILY_LIMIT, actions.notifications().single().reason)
    }

    @Test
    fun `a daily budget smaller than the session limit ends the session early with the daily reason`() {
        val actions = ticks(T0, 10, INSTA, rule(session = MINUTE, daily = 10 * SECOND))

        assertEquals(BlockReason.DAILY_LIMIT, actions.notifications().single().reason)
    }

    @Test
    fun `at midnight the daily block ends once and the budget starts over`() {
        val rule = rule(session = HOUR, daily = 10 * SECOND)
        ticks(T0, 10, INSTA, rule)

        val ended = engine.tick(101 * DAY + SECOND, null, listOf(rule))
        val nextDay = ticks(101 * DAY + 10 * HOUR, 10, INSTA, rule)

        assertEquals(listOf<EngineAction>(BlockEnded(INSTA, BlockReason.DAILY_LIMIT)), ended)
        assertEquals(BlockReason.DAILY_LIMIT, nextDay.notifications().single().reason)
    }

    @Test
    fun `the daily budget only counts the current day`() {
        val actions = ticks(101 * DAY - 5 * SECOND, 10, INSTA, rule(session = HOUR, daily = 10 * SECOND))

        assertTrue(actions.notifications().isEmpty())
    }

    @Test
    fun `without a daily budget only the session limit applies`() {
        val actions = ticks(T0, 10, INSTA, rule(session = 10 * SECOND, daily = null))

        assertEquals(BlockReason.SESSION_COOLDOWN, actions.notifications().single().reason)
        assertEquals(10 * SECOND, dailyUsedMs())
    }

    // ---- rule changes ----------------------------------------------------------------------

    @Test
    fun `turning a rule off and on keeps the day total`() {
        ticks(T0, 5, INSTA, rule(session = HOUR, daily = HOUR))

        val whileOff = engine.tick(T0 + 6 * SECOND, INSTA, listOf(rule(active = false)))
        engine.tick(T0 + 7 * SECOND, INSTA, listOf(rule(session = HOUR, daily = HOUR)))

        assertTrue(whileOff.isEmpty())
        assertEquals(6 * SECOND, dailyUsedMs())
    }

    @Test
    fun `turning a rule off and on does not lift an active block`() {
        val rule = rule()
        ticks(T0, 10, INSTA, rule)
        val blockedUntil = blockedUntilMs()

        val whileOff = engine.tick(T0 + 11 * SECOND, INSTA, listOf(rule(active = false)))
        val backOn = engine.tick(T0 + 12 * SECOND, INSTA, listOf(rule))

        assertTrue(whileOff.isEmpty())
        assertEquals(listOf<EngineAction>(EjectToHome(INSTA)), backOn)
        assertEquals(blockedUntil, blockedUntilMs())
    }

    @Test
    fun `lowering the session limit mid-session applies on the next tick`() {
        ticks(T0, 5, INSTA, rule(session = MINUTE))

        val actions = engine.tick(T0 + 6 * SECOND, INSTA, listOf(rule(session = 5 * SECOND)))

        assertEquals(1, actions.notifications().size)
    }

    // ---- clock oddities and deliberate assumptions -----------------------------------------

    @Test
    fun `a clock that jumps backwards credits nothing and does not corrupt the counters`() {
        engine.tick(T0 + 10 * SECOND, INSTA, listOf(rule(daily = HOUR)))

        engine.tick(T0 + 5 * SECOND, INSTA, listOf(rule(daily = HOUR)))
        engine.tick(T0 + 6 * SECOND, INSTA, listOf(rule(daily = HOUR)))

        assertEquals(1 * SECOND, sessionUsedMs())
        assertEquals(1 * SECOND, dailyUsedMs())
    }

    @Test
    fun `changing timezone so it becomes another local day starts a fresh daily count`() {
        var zoneOffsetDays = 0L
        val movingClock =
            object : DayClock {
                override fun dayKey(nowMs: Long) = "day-${nowMs / DAY + zoneOffsetDays}"

                override fun nextDayStartMs(nowMs: Long) = (nowMs / DAY + 1) * DAY
            }
        val local = EnforcementEngine(movingClock, EngineConfig(maxCreditMs = 3 * SECOND))
        val rules = listOf(rule(session = HOUR, daily = HOUR))
        repeat(6) { local.tick(T0 + it * SECOND, INSTA, rules) }
        assertEquals(5 * SECOND, local.snapshot().apps.getValue(INSTA).dailyUsedMs)

        zoneOffsetDays = 1 // the phone moved to a timezone where it is already the next day
        local.tick(T0 + 6 * SECOND, INSTA, rules)
        local.tick(T0 + 7 * SECOND, INSTA, rules)

        assertEquals(2 * SECOND, local.snapshot().apps.getValue(INSTA).dailyUsedMs)
        assertEquals(7 * SECOND, local.snapshot().apps.getValue(INSTA).sessionUsedMs)
    }

    @Test
    fun `a session that is not blocked carries across midnight while the day total starts over`() {
        val rules = listOf(rule(session = 30 * SECOND, cooldown = 5 * MINUTE, daily = HOUR))
        ticks(101 * DAY - 10 * SECOND, 15, INSTA, *rules.toTypedArray())

        assertEquals(15 * SECOND, sessionUsedMs())
        // The tick at exactly midnight already belongs to the new day: ticks at 0..5 s, six credits.
        assertEquals(6 * SECOND, dailyUsedMs())
    }
}
