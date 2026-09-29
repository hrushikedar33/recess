package com.appblocker.notify

import com.appblocker.engine.BlockReason
import com.appblocker.engine.EngineAction.NotifyLimitReached
import com.appblocker.quotes.Quote
import com.appblocker.quotes.QuoteRepository
import com.appblocker.store.InMemoryKeyValueStore
import com.appblocker.store.RecessPrefs
import java.util.Random
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

private const val T0 = 1_700_000_000_000L

private val EVENT = NotifyLimitReached("com.instagram.android", "Instagram", BlockReason.SESSION_COOLDOWN, T0 + 300_000L, 600_000L, 3_600_000L)

class LimitAlertsTest {
    private val store = InMemoryKeyValueStore()
    private val prefs = RecessPrefs(store) { T0 }
    private val quotes = listOf(Quote("First quote.", "Author One"), Quote("Second quote.", "Author Two"))
    private val alerts = LimitAlerts({ QuoteRepository(quotes, store, Random(3L)) }, prefs, { T0 }) { "at $it" }

    private fun snapshot() = LimitEventSnapshotCodec.decode(prefs.lastLimitEventJson())

    @Test
    fun `the message carries a quote and the unfinished goals`() {
        prefs.saveGoals("""[{"id":"a","title":"Finish the report","done":false},{"id":"b","title":"Done thing","done":true}]""")

        val message = alerts.compose(EVENT)

        assertTrue(quotes.any { message.bigText.contains(it.text) })
        assertTrue(message.bigText.contains("Finish the report"))
        assertTrue(!message.bigText.contains("Done thing"))
    }

    @Test
    fun `the saved snapshot holds the same quote the message shows`() {
        val message = alerts.compose(EVENT)

        val saved = snapshot()
        assertNotNull(saved)
        assertTrue(message.bigText.contains(saved!!.quote.text))
    }

    @Test
    fun `the saved snapshot names the app, the reason and when the block ends`() {
        alerts.compose(EVENT)

        val saved = snapshot()!!
        assertEquals("com.instagram.android", saved.packageName)
        assertEquals("Instagram", saved.appName)
        assertEquals(BlockReason.SESSION_COOLDOWN, saved.reason)
        assertEquals(T0 + 300_000L, saved.blockedUntilMs)
        assertEquals(T0, saved.createdAtMs)
    }

    @Test
    fun `a second limit event gets a different quote`() {
        alerts.compose(EVENT)
        val first = snapshot()!!.quote

        alerts.compose(EVENT)
        val second = snapshot()!!.quote

        assertNotEquals(first, second)
    }

    @Test
    fun `the newest event replaces the saved one`() {
        alerts.compose(EVENT)
        alerts.compose(EVENT.copy(appName = "YouTube", packageName = "com.google.android.youtube"))

        assertEquals("YouTube", snapshot()!!.appName)
    }

    @Test
    fun `with no goals the message still has a quote and a nudge`() {
        val message = alerts.compose(EVENT)

        assertTrue(message.bigText.contains("Add a goal"))
    }
}
