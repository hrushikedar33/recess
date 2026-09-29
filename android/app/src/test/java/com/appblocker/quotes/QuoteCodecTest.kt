package com.appblocker.quotes

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class QuoteCodecTest {
    @Test
    fun `a quote is parsed with its author and optional source`() {
        val quotes =
            QuoteCodec.parse(
                """[{"text":"Confine yourself to the present.","author":"Marcus Aurelius","source":"Meditations 7.29"}]""",
            )

        assertEquals(listOf(Quote("Confine yourself to the present.", "Marcus Aurelius", "Meditations 7.29")), quotes)
    }

    @Test
    fun `the source is optional`() {
        val quote = QuoteCodec.parse("""[{"text":"Simplify.","author":"Thoreau"}]""").single()

        assertEquals(null, quote.source)
    }

    @Test
    fun `text and author are trimmed`() {
        val quote = QuoteCodec.parse("""[{"text":"  Begin.  ","author":"  Seneca "}]""").single()

        assertEquals(Quote("Begin.", "Seneca"), quote)
    }

    @Test
    fun `unknown fields are ignored`() {
        val quotes = QuoteCodec.parse("""[{"text":"Begin.","author":"Seneca","tags":["x"]}]""")

        assertEquals(1, quotes.size)
    }

    @Test
    fun `entries without usable text or author are skipped and the rest kept`() {
        val quotes =
            QuoteCodec.parse(
                """[{"text":"","author":"A"},{"text":"No author"},{"text":"Good","author":"B"},42,{"text":"Also good","author":"  "}]""",
            )

        assertEquals(listOf("Good"), quotes.map { it.text })
    }

    @Test
    fun `missing, blank or corrupt json gives no quotes instead of throwing`() {
        assertTrue(QuoteCodec.parse(null).isEmpty())
        assertTrue(QuoteCodec.parse("").isEmpty())
        assertTrue(QuoteCodec.parse("{not json").isEmpty())
        assertTrue(QuoteCodec.parse("""{"quotes":[]}""").isEmpty())
    }
}
