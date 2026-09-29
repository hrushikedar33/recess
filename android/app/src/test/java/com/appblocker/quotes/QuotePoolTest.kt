package com.appblocker.quotes

import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

private val BUNDLED = listOf(Quote("Confine yourself to the present.", "Marcus Aurelius"), Quote("Begin at once to live.", "Seneca"))

private fun extra(text: String, author: String = "Some Author") = Quote(text, author)

private fun texts(quotes: List<Quote>) = quotes.map { it.text }

/** A unique, digit-free word for [n], so fixtures can be told apart without using digits. */
private fun letters(n: Int): String {
    var rest = n
    val word = StringBuilder()
    do {
        word.append('a' + rest % 26)
        rest /= 26
    } while (rest > 0)
    return word.toString()
}

private fun assertRejected(text: String, author: String = "Some Author") {
    assertEquals("expected to reject <$text> by <$author>", BUNDLED, QuotePool.merge(BUNDLED, listOf(extra(text, author))))
}

private fun assertAccepted(text: String, author: String = "Some Author") {
    assertEquals(
        "expected to accept <$text> by <$author>",
        BUNDLED + Quote(text, author),
        QuotePool.merge(BUNDLED, listOf(extra(text, author))),
    )
}

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
        val many = (1..250).map { extra("Extra quote ${letters(it)} is a good one.") }

        val merged = QuotePool.merge(BUNDLED, many)

        assertEquals(BUNDLED.size + 200, merged.size)
        assertTrue(texts(merged).contains("Extra quote ${letters(250)} is a good one."))
        assertTrue(!texts(merged).contains("Extra quote ${letters(1)} is a good one."))
    }

    @Test
    fun `the bundled quotes always stay, even if there are no usable extras`() {
        val merged = QuotePool.merge(BUNDLED, listOf(extra("x")))

        assertEquals(BUNDLED, merged)
    }

    @Test
    fun `plain sentences with accents and ordinary punctuation are accepted`() {
        assertAccepted("Ne vous en faites pas, la vie est belle!", "Jean de La Fontaine")
        assertAccepted("\u201CWe suffer more in imagination than in reality\u201D \u2013 so breathe.", "Seneca")
        assertAccepted("What we do now echoes; it doesn\u2019t fade (ever)\u2026 truly?", "Maximus O'Brien-Smith Jr.")
        assertAccepted("Der schnelle braune Fuchs, \u00E4\u00F6\u00FC \u00C4\u00D6\u00DC, springt weiter.", "Renata Kr\u00F6ger")
    }

    @Test
    fun `digits are refused, which is how phone numbers and amounts get into a quote`() {
        assertRejected("Call one eight hundred 555 0100 for a free prize.")
        assertRejected("Win 1000 rupees by sitting very still today.")
        assertRejected("A fine sentence here.", author = "Author 2")
    }

    @Test
    fun `text that changes direction or hides is refused`() {
        assertRejected("Be bold today, my \u202Efriend of old.") // right-to-left override
        assertRejected("Be bold today, my \u200Bfriend of old.") // zero-width space
        assertRejected("Be bold today, my \uFEFFfriend of old.") // byte order mark
        assertRejected("Be bold today, my \u2066friend of old.") // isolate
        assertRejected("Be bold today,\u2028my friend of old.") // line separator
        assertRejected("Be bold today,\u0085my friend of old.") // next line
        assertRejected("Be bold today, my friend of old.", author = "Marcus\u202E Aurelius")
    }

    @Test
    fun `a line break inside a sentence is refused, one around it is just trimmed`() {
        assertRejected("Be bold today,\nmy friend of old.")
        assertEquals(
            BUNDLED + Quote("Be bold today, my friend of old.", "Some Author"),
            QuotePool.merge(BUNDLED, listOf(extra("  Be bold today, my friend of old.\r\n", " Some Author "))),
        )
    }

    @Test
    fun `links in any case, and bare web addresses, are refused`() {
        assertRejected("Visit calm places like Example.COM for more.")
        assertRejected("Read more at HTTP://example.org now, friend.")
        assertRejected("Find calm at www.calm.org and stay there.")
        assertRejected("Send your thoughts to me at sage.co every day.")
    }

    @Test
    fun `symbols, slashes, emoji, other scripts and lookalikes are refused`() {
        assertRejected("Buy calm for \$ten and pay \u20AC today, friend.")
        assertRejected("Walk and/or run every day, my friend.")
        assertRejected("Be bold today, my friend \uD83D\uDE00 always.")
        assertRejected("\u0411\u0443\u0434\u044C \u0441\u043C\u0435\u043B\u044B\u043C \u0441\u0435\u0433\u043E\u0434\u043D\u044F, \u0434\u0440\u0443\u0433.")
        assertRejected("Be bold [today] and {always} my friend.")
        assertRejected("Be bold today * my friend of old.")
    }

    @Test
    fun `a name may have letters, spaces, dots, apostrophes and hyphens and nothing else`() {
        assertRejected("A fine sentence here.", author = "Seneca; DROP TABLE")
        assertRejected("A fine sentence here.", author = "Seneca <b>")
        assertRejected("A fine sentence here.", author = "Seneca/Epictetus")
        assertRejected("A fine sentence here.", author = "Sage.example")
    }

    @Test
    fun `gives the same answers as the JS validator on every shared case`() {
        // Gradle runs unit tests from android/app; the file is shared with the Jest suite.
        val file = File("../../__tests__/fixtures/quote-validation-cases.json")
        assertTrue("shared cases not found at ${file.absolutePath}", file.exists())
        val cases = JSONObject(file.readText())
        val accept = cases.getJSONArray("accept")
        val reject = cases.getJSONArray("reject")
        assertTrue(accept.length() > 0 && reject.length() > 0)

        for (i in 0 until accept.length()) {
            val case = accept.getJSONObject(i)
            assertAccepted(case.getString("text"), case.getString("author"))
        }
        for (i in 0 until reject.length()) {
            val case = reject.getJSONObject(i)
            assertRejected(case.getString("text"), case.getString("author"))
        }
    }
}
