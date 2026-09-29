package com.appblocker.notify

import com.appblocker.engine.BlockReason
import com.appblocker.quotes.Quote
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

private val SNAPSHOT =
    LimitEventSnapshot(
        packageName = "com.instagram.android",
        appName = "Instagram",
        reason = BlockReason.SESSION_COOLDOWN,
        blockedUntilMs = 1_700_000_300_000L,
        quote = Quote("Confine yourself to the present.", "Marcus Aurelius", "Meditations 7.29"),
        createdAtMs = 1_700_000_000_000L,
    )

class LimitEventSnapshotCodecTest {
    @Test
    fun `a snapshot survives an encode and decode round trip`() {
        assertEquals(SNAPSHOT, LimitEventSnapshotCodec.decode(LimitEventSnapshotCodec.encode(SNAPSHOT)))
    }

    @Test
    fun `a quote without a source round trips`() {
        val plain = SNAPSHOT.copy(quote = Quote("Begin.", "Seneca"))

        assertEquals(plain, LimitEventSnapshotCodec.decode(LimitEventSnapshotCodec.encode(plain)))
    }

    @Test
    fun `missing, blank or corrupt json decodes to nothing instead of throwing`() {
        assertNull(LimitEventSnapshotCodec.decode(null))
        assertNull(LimitEventSnapshotCodec.decode(""))
        assertNull(LimitEventSnapshotCodec.decode("{corrupt"))
        assertNull(LimitEventSnapshotCodec.decode("[]"))
    }

    @Test
    fun `a snapshot missing a required field decodes to nothing`() {
        assertNull(LimitEventSnapshotCodec.decode("""{"packageName":"a","appName":"A"}"""))
    }

    @Test
    fun `a snapshot with an unknown reason decodes to nothing`() {
        val json = LimitEventSnapshotCodec.encode(SNAPSHOT).replace("SESSION_COOLDOWN", "FROM_THE_FUTURE")

        assertNull(LimitEventSnapshotCodec.decode(json))
    }
}
