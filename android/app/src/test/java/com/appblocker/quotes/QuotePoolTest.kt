package com.appblocker.quotes

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

private val BUNDLED = listOf(Quote("Confine yourself to the present.", "Marcus Aurelius"), Quote("Begin at once to live.", "Seneca"))

private fun extra(text: String, author: String = "Some Author") = Quote(text, author)

private fun texts(quotes: List<Quote>) = quotes.map { it.text }

class QuotePoolTest {
    @Test
    fun `with no extras the pool is just the bundled quotes`() {
        assertEquals(BUNDLED, QuotePool.merge(BUNDLED, emptyList()))
    }

    @Test
    fun `good extras are added after the bundled quotes`() {
        val merged = QuotePool.merge(BUNDLED, listOf(extra("A fine quote from the internet.")))

        assertEquals(texts(BUNDLED) + "A fine quote from the internet.", texts(merged))
    }

    @Test
    fun `an extra that repeats a bundled quote is dropped, ignoring case and punctuation`() {
        // Ends like a sentence, so the only reason to drop it is that it repeats a bundled quote.
        val merged = QuotePool.merge(BUNDLED, listOf(extra("CONFINE yourself to the present!")))

        assertEquals(BUNDLED, merged)
    }

    @Test
    fun `repeats among the extras are dropped`() {
        val merged = QuotePool.merge(BUNDLED, listOf(extra("Same words twice over."), extra("same words twice over!")))

        assertEquals(1, merged.size - BUNDLED.size)
    }

    @Test
    fun `extras with markup, links, at signs or entities are dropped`() {
        val unsafe =
            listOf(
                extra("Be <b>bold</b> today, friend."),
                extra("Read more at http://example.com today."),
                extra("Follow the quiet path today. @"),
                extra("Be &quot;bold&quot; today, friend."),
            )

        assertEquals(BUNDLED, QuotePool.merge(BUNDLED, unsafe))
    }

    @Test
    fun `the rate-limit message some services send in place of a quote is dropped, whoever it claims to be by`() {
        val fake = extra("Too many requests. Obtain an auth key for unlimited access.", author = "Marcus Aurelius")

        assertEquals(BUNDLED, QuotePool.merge(BUNDLED, listOf(fake)))
    }

    @Test
    fun `extras that are too short, too long or not sentences are dropped`() {
        val bad =
            listOf(
                extra("Hi."),
                extra("word ".repeat(50) + "end."),
                extra("A fragment with no ending at all"),
            )

        assertEquals(BUNDLED, QuotePool.merge(BUNDLED, bad))
    }

    @Test
    fun `extras with a missing, huge or website-like author are dropped`() {
        val bad =
            listOf(
                extra("A perfectly fine sentence here.", author = ""),
                extra("Another perfectly fine sentence.", author = "x".repeat(41)),
                extra("Yet another perfectly fine one.", author = "zenquotes.io"),
                extra("And one more fine sentence here.", author = "Anonymous"),
            )

        assertEquals(BUNDLED, QuotePool.merge(BUNDLED, bad))
    }

    @Test
    fun `control characters make an extra unusable`() {
        val merged = QuotePool.merge(BUNDLED, listOf(extra("Be bold\u0000 today, my friend.")))

        assertEquals(BUNDLED, merged)
    }

    @Test
    fun `at most 200 extras are kept, the newest ones`() {
        val many = (1..250).map { extra("Extra quote number $it is a good one.") }

        val merged = QuotePool.merge(BUNDLED, many)

        assertEquals(BUNDLED.size + 200, merged.size)
        assertTrue(texts(merged).contains("Extra quote number 250 is a good one."))
        assertTrue(!texts(merged).contains("Extra quote number 1 is a good one."))
    }

    @Test
    fun `the bundled quotes always stay, even if there are no usable extras`() {
        val merged = QuotePool.merge(BUNDLED, listOf(extra("x")))

        assertEquals(BUNDLED, merged)
    }
}
