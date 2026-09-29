package com.appblocker.notify

import com.appblocker.engine.AppUsage
import com.appblocker.engine.BlockReason
import com.appblocker.engine.EngineState
import com.appblocker.engine.EngineAction.NotifyLimitReached
import com.appblocker.quotes.Quote
import com.appblocker.quotes.QuoteRepository
import com.appblocker.store.InMemoryKeyValueStore
import com.appblocker.store.RecessPrefs
import java.util.Random
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

private const val T0 = 1_700_000_000_000L

private val EVENT = NotifyLimitReached("com.instagram.android", "Instagram", BlockReason.SESSION_COOLDOWN, T0 + 300_000L, 600_000L, 3_600_000L)

private const val INSTAGRAM = "com.instagram.android"
private const val INSTAGRAM_RULE =
    """[{"packageName":"com.instagram.android","appName":"Instagram","limitMinutes":10,"cooldownMinutes":5,"isActive":true}]"""
private const val TWO_RULES =
    """[{"packageName":"com.instagram.android","appName":"Instagram","limitMinutes":10,"cooldownMinutes":5,"isActive":true},
        {"packageName":"com.example.reels","appName":"Reels","limitMinutes":10,"cooldownMinutes":5,"isActive":true}]"""

private fun blockedState(
    packageName: String = INSTAGRAM,
    until: Long? = T0 + 300_000L,
    reason: BlockReason = BlockReason.SESSION_COOLDOWN,
) = EngineState(mapOf(packageName to AppUsage("day", 0L, 0L, until, if (until == null) null else reason)), T0, packageName)

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

    // ---- the message for an app that is already blocked and opened again --------------------

    @Test
    fun `an app that is not blocked has nothing to show`() {
        prefs.saveBlockedApps(INSTAGRAM_RULE)

        assertNull(alerts.composeForBlock(INSTAGRAM))
    }

    @Test
    fun `a block that has already ended has nothing to show`() {
        prefs.saveBlockedApps(INSTAGRAM_RULE)
        prefs.saveEngineState(blockedState(until = T0 - 1L))

        assertNull(alerts.composeForBlock(INSTAGRAM))
    }

    @Test
    fun `a blocked app gets its name and when it opens again`() {
        prefs.saveBlockedApps(INSTAGRAM_RULE)
        prefs.saveEngineState(blockedState(until = T0 + 300_000L))

        val message = alerts.composeForBlock(INSTAGRAM)!!

        assertEquals("Time's up on Instagram", message.title)
        assertTrue(message.status.contains("at ${T0 + 300_000L}"))
    }

    @Test
    fun `a daily block says the app is done for today`() {
        prefs.saveBlockedApps(INSTAGRAM_RULE)
        prefs.saveEngineState(blockedState(reason = BlockReason.DAILY_LIMIT))

        assertEquals("Instagram is done for today", alerts.composeForBlock(INSTAGRAM)!!.title)
    }

    @Test
    fun `it shows the same quote the notification showed`() {
        prefs.saveBlockedApps(INSTAGRAM_RULE)
        val first = alerts.compose(EVENT)
        prefs.saveEngineState(blockedState())

        assertEquals(first.quote, alerts.composeForBlock(INSTAGRAM)!!.quote)
        assertEquals(first.quote, alerts.composeForBlock(INSTAGRAM)!!.quote)
    }

    @Test
    fun `it leaves the saved limit event alone, so the Break screen keeps showing that one`() {
        prefs.saveBlockedApps(INSTAGRAM_RULE)
        alerts.compose(EVENT)
        val saved = prefs.lastLimitEventJson()
        prefs.saveEngineState(blockedState())

        alerts.composeForBlock(INSTAGRAM)

        assertEquals(saved, prefs.lastLimitEventJson())
    }

    @Test
    fun `another blocked app gets a quote of its own without disturbing the saved event`() {
        prefs.saveBlockedApps(TWO_RULES)
        val instagramQuote = alerts.compose(EVENT).quote
        val saved = prefs.lastLimitEventJson()
        prefs.saveEngineState(blockedState(packageName = "com.example.reels"))

        val message = alerts.composeForBlock("com.example.reels")!!

        assertEquals("Time's up on Reels", message.title)
        assertTrue(quotes.any { message.quote.contains(it.text) })
        assertNotEquals(instagramQuote, message.quote)
        assertEquals(saved, prefs.lastLimitEventJson())
    }

    @Test
    fun `it lists the goals as they are now`() {
        prefs.saveBlockedApps(INSTAGRAM_RULE)
        alerts.compose(EVENT)
        prefs.saveGoals("""[{"id":"a","title":"Added later","done":false}]""")
        prefs.saveEngineState(blockedState())

        assertTrue(alerts.composeForBlock(INSTAGRAM)!!.goals.contains("Added later"))
    }

    @Test
    fun `an app whose rule has since been removed is still covered, under its package name`() {
        prefs.saveEngineState(blockedState())

        assertEquals("Time's up on $INSTAGRAM", alerts.composeForBlock(INSTAGRAM)!!.title)
    }
}
