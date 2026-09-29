package com.appblocker.engine

import com.appblocker.engine.EngineAction.EjectToHome
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

private const val SECOND = 1_000L
private const val MINUTE = 60 * SECOND

private val SAMPLE_STATE =
    EngineState(
        apps =
            mapOf(
                "com.instagram.android" to
                    AppUsage(
                        dayKey = "2026-09-29",
                        dailyUsedMs = 42 * MINUTE,
                        sessionUsedMs = 10 * MINUTE,
                        blockedUntilMs = 1_700_000_300_000L,
                        blockReason = BlockReason.SESSION_COOLDOWN,
                    ),
                "com.example.reels" to
                    AppUsage(
                        dayKey = "2026-09-29",
                        dailyUsedMs = 5 * MINUTE,
                        sessionUsedMs = 5 * MINUTE,
                        blockedUntilMs = null,
                        blockReason = null,
                    ),
            ),
        lastTickMs = 1_700_000_000_000L,
        lastForegroundPackage = "com.instagram.android",
    )

class EngineStateCodecTest {
    @Test
    fun `a state survives an encode and decode round trip`() {
        val decoded = EngineStateCodec.decode(EngineStateCodec.encode(SAMPLE_STATE))

        assertEquals(SAMPLE_STATE, decoded)
    }

    @Test
    fun `the empty state survives a round trip`() {
        val decoded = EngineStateCodec.decode(EngineStateCodec.encode(EngineState.EMPTY))

        assertEquals(EngineState.EMPTY, decoded)
    }

    @Test
    fun `missing, blank or corrupt json decodes to the empty state instead of throwing`() {
        assertEquals(EngineState.EMPTY, EngineStateCodec.decode(null))
        assertEquals(EngineState.EMPTY, EngineStateCodec.decode(""))
        assertEquals(EngineState.EMPTY, EngineStateCodec.decode("   "))
        assertEquals(EngineState.EMPTY, EngineStateCodec.decode("{not json"))
        assertEquals(EngineState.EMPTY, EngineStateCodec.decode("[1,2,3]"))
    }

    @Test
    fun `unknown fields are ignored and one malformed app entry does not lose the others`() {
        val json =
            """
            {"v":1,"lastTickMs":5,"lastForegroundPackage":"a","fromTheFuture":123,
             "apps":{
               "good":{"dayKey":"d","dailyUsedMs":1,"sessionUsedMs":2},
               "bad":{"dayKey":"d","dailyUsedMs":1,"sessionUsedMs":2,
                      "blockedUntilMs":9,"blockReason":"NOT_A_REASON"}}}
            """.trimIndent()

        val decoded = EngineStateCodec.decode(json)

        assertEquals(setOf("good"), decoded.apps.keys)
        assertEquals(5L, decoded.lastTickMs)
    }

    @Test
    fun `an engine restored from saved state keeps blocking until the same instant`() {
        val clock =
            object : DayClock {
                override fun dayKey(nowMs: Long) = "2026-09-29"

                override fun nextDayStartMs(nowMs: Long) = nowMs + 86_400_000L
            }
        val blockedUntil = SAMPLE_STATE.apps.getValue("com.instagram.android").blockedUntilMs!!
        val restored = EnforcementEngine(clock, initialState = EngineStateCodec.decode(EngineStateCodec.encode(SAMPLE_STATE)))
        val rule =
            AppRule("com.instagram.android", "Instagram", 10 * MINUTE, 5 * MINUTE, 60 * MINUTE)

        val duringBlock = restored.tick(blockedUntil - MINUTE, "com.instagram.android", listOf(rule))

        assertEquals(listOf<EngineAction>(EjectToHome("com.instagram.android")), duringBlock)
        assertTrue(restored.snapshot().apps.getValue("com.instagram.android").blockedUntilMs == blockedUntil)
    }
}
