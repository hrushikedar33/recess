package com.appblocker.service

import com.appblocker.engine.AppUsage
import com.appblocker.engine.BlockReason
import com.appblocker.engine.EngineState
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

private const val T0 = 1_700_000_000_000L
private const val PKG = "com.instagram.android"

private fun state(session: Long = 0L, blockedUntil: Long? = null) =
    EngineState(
        apps =
            mapOf(
                PKG to
                    AppUsage(
                        "d",
                        session,
                        session,
                        blockedUntil,
                        if (blockedUntil != null) BlockReason.SESSION_COOLDOWN else null,
                    ),
            ),
        lastTickMs = T0,
        lastForegroundPackage = PKG,
    )

class PersistPolicyTest {
    private val policy = PersistPolicy(intervalMs = 10_000L)

    @Test
    fun `the first state is always persisted`() {
        assertTrue(policy.shouldPersist(state(), state(), T0, lastPersistMs = null))
    }

    @Test
    fun `usage that only ticks up inside the interval is not persisted`() {
        assertFalse(policy.shouldPersist(state(session = 1_000), state(session = 2_000), T0 + 1_000, lastPersistMs = T0))
    }

    @Test
    fun `usage is persisted once the interval has passed`() {
        assertTrue(policy.shouldPersist(state(session = 1_000), state(session = 11_000), T0 + 10_000, lastPersistMs = T0))
    }

    @Test
    fun `a block starting is persisted immediately`() {
        assertTrue(policy.shouldPersist(state(), state(blockedUntil = T0 + 60_000), T0 + 1_000, lastPersistMs = T0))
    }

    @Test
    fun `a block ending is persisted immediately`() {
        assertTrue(policy.shouldPersist(state(blockedUntil = T0 + 60_000), state(), T0 + 1_000, lastPersistMs = T0))
    }

    @Test
    fun `an unchanged block inside the interval is not persisted again`() {
        val blocked = state(blockedUntil = T0 + 60_000)

        assertFalse(policy.shouldPersist(blocked, blocked, T0 + 1_000, lastPersistMs = T0))
    }

    @Test
    fun `nothing is written after the interval if only the tick time moved on`() {
        val before = state(session = 5_000)
        val laterTick = before.copy(lastTickMs = T0 + 20_000, lastForegroundPackage = null)

        assertFalse(policy.shouldPersist(before, laterTick, T0 + 20_000, lastPersistMs = T0))
    }

    @Test
    fun `usage that really changed is still written once the interval has passed`() {
        assertTrue(policy.shouldPersist(state(session = 5_000), state(session = 9_000), T0 + 10_000, lastPersistMs = T0))
    }
}
