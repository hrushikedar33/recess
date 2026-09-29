package com.appblocker.quotes

import com.appblocker.store.InMemoryKeyValueStore
import java.util.Random
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

private fun quotes(count: Int) = (1..count).map { Quote("Quote number $it", "Author $it") }

class QuoteRepositoryTest {
    private val store = InMemoryKeyValueStore()

    private fun repository(count: Int = 5, seed: Long = 42L, over: InMemoryKeyValueStore = store) =
        QuoteRepository(quotes(count), over, Random(seed))

    @Test
    fun `every quote is served once before any repeats`() {
        val repository = repository(count = 7)

        val firstCycle = (1..7).map { repository.next().text }

        assertEquals(quotes(7).map { it.text }.toSet(), firstCycle.toSet())
        assertEquals(7, firstCycle.size)
    }

    @Test
    fun `the order is shuffled, and differs between seeds`() {
        val cycleA = repository(count = 10, seed = 1L, over = InMemoryKeyValueStore()).let { r -> (1..10).map { r.next().text } }
        val cycleB = repository(count = 10, seed = 2L, over = InMemoryKeyValueStore()).let { r -> (1..10).map { r.next().text } }

        assertNotEquals(quotes(10).map { it.text }, cycleA)
        assertNotEquals(cycleA, cycleB)
    }

    @Test
    fun `the second cycle also serves every quote once`() {
        val repository = repository(count = 6)
        repeat(6) { repository.next() }

        val secondCycle = (1..6).map { repository.next().text }

        assertEquals(6, secondCycle.toSet().size)
    }

    @Test
    fun `the same quote never comes twice in a row, even across many reshuffles`() {
        for (seed in 1L..40L) {
            val repository = repository(count = 3, seed = seed, over = InMemoryKeyValueStore())

            val draws = (1..60).map { repository.next().text }

            draws.zipWithNext().forEach { (a, b) -> assertNotEquals("seed $seed", a, b) }
        }
    }

    @Test
    fun `a restart continues the same cycle instead of starting over`() {
        val first = repository(count = 8, seed = 7L)
        val served = (1..3).map { first.next().text }

        val afterRestart = repository(count = 8, seed = 999L)
        val rest = (1..5).map { afterRestart.next().text }

        assertEquals(8, (served + rest).toSet().size)
    }

    @Test
    fun `the last quote before a restart is not repeated straight away after it`() {
        for (seed in 1L..40L) {
            val shared = InMemoryKeyValueStore()
            val before = repository(count = 4, seed = seed, over = shared)
            val lastBefore = (1..4).map { before.next().text }.last()

            val after = repository(count = 4, seed = seed + 1000, over = shared)

            assertNotEquals("seed $seed", lastBefore, after.next().text)
        }
    }

    @Test
    fun `a corrupt saved cycle is replaced instead of crashing`() {
        store.putString("quoteBagJson", "{corrupt")

        val quote = repository(count = 4).next()

        assertTrue(quote.text.startsWith("Quote number"))
    }

    @Test
    fun `a saved cycle that no longer fits the quote list is replaced`() {
        store.putString("quoteBagJson", "[0,1,2,99]")

        val draws = (1..4).map { repository(count = 4, over = store).next().text }

        assertTrue(draws.all { it.startsWith("Quote number") })
    }

    @Test
    fun `a saved cycle with duplicates is replaced`() {
        store.putString("quoteBagJson", "[1,1,1]")

        val repository = repository(count = 4)
        val cycle = (1..4).map { repository.next().text }

        assertEquals(4, cycle.toSet().size)
    }

    @Test
    fun `a single quote is served every time without looping forever`() {
        val repository = repository(count = 1)

        val draws = (1..5).map { repository.next().text }

        assertEquals(List(5) { "Quote number 1" }, draws)
    }

    @Test
    fun `with no quotes a built-in quote is served instead`() {
        val quote = QuoteRepository(emptyList(), store, Random(1L)).next()

        assertTrue(quote.text.isNotBlank())
        assertTrue(quote.author.isNotBlank())
    }
}
