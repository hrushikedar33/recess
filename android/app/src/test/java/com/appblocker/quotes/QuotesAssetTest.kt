package com.appblocker.quotes

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Checks the real bundled file, so a bad edit to it fails the build instead of a notification. */
class QuotesAssetTest {
    private val raw = File("src/main/assets/quotes.json").readText()
    private val quotes = QuoteCodec.parse(raw)

    @Test
    fun `at least one hundred quotes are bundled`() {
        assertTrue("only ${quotes.size} quotes", quotes.size >= 100)
    }

    @Test
    fun `no entry in the file was silently dropped as malformed`() {
        val entries = org.json.JSONArray(raw).length()

        assertEquals(entries, quotes.size)
    }

    @Test
    fun `every quote fits a notification`() {
        quotes.forEach { assertTrue("too long: ${it.text}", it.text.length <= 220) }
    }

    @Test
    fun `every author is a short name`() {
        quotes.forEach { assertTrue("bad author: ${it.author}", it.author.length in 2..40) }
    }

    @Test
    fun `no quote is duplicated`() {
        val normalized = quotes.map { it.text.lowercase().replace(Regex("[^a-z0-9]"), "") }

        assertEquals(normalized.size, normalized.toSet().size)
    }

    @Test
    fun `no quote carries markup, links or stray symbols`() {
        val forbidden = listOf("<", ">", "@", "http", "&#", "&quot;")
        quotes.forEach { quote ->
            forbidden.forEach { assertTrue("'$it' in: ${quote.text}", !quote.text.contains(it)) }
        }
    }

    @Test
    fun `every quote ends like a sentence`() {
        quotes.forEach { assertTrue("no ending: ${it.text}", it.text.last() in ".?!’”") }
    }
}
