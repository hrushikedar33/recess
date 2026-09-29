package com.appblocker.quotes

import com.appblocker.store.KeyValueStore
import java.util.Random
import org.json.JSONArray
import org.json.JSONException

/**
 * Serves quotes from a shuffled "bag": every quote once before any repeats, and never the same
 * quote twice in a row (also across a reshuffle and across restarts, because the bag is saved).
 * With no quotes at all it serves a built-in one, so a limit notification is never empty.
 */
class QuoteRepository(
    quotes: List<Quote>,
    private val store: KeyValueStore,
    private val random: Random = Random(),
) {
    private val pool = quotes.ifEmpty { FALLBACK_QUOTES }

    fun next(): Quote {
        val bag = loadBag().ifEmpty { newBag() }
        val index = bag.first()
        store.putString(KEY_BAG, JSONArray(bag.drop(1)).toString())
        store.putLong(KEY_LAST_INDEX, index.toLong())
        return pool[index]
    }

    /** The saved remainder of the current cycle, or empty if there is none or it no longer fits. */
    private fun loadBag(): List<Int> {
        val saved = store.getString(KEY_BAG) ?: return emptyList()
        val bag =
            try {
                val array = JSONArray(saved)
                (0 until array.length()).map { array.getInt(it) }
            } catch (e: JSONException) {
                return emptyList()
            }
        val fits = bag.all { it in pool.indices } && bag.toSet().size == bag.size
        return if (fits) bag else emptyList()
    }

    private fun newBag(): List<Int> {
        val order = pool.indices.shuffled(random)
        val last = store.getLong(KEY_LAST_INDEX)?.toInt()
        // Don't open the new cycle with the quote that just closed the previous one.
        return if (pool.size > 1 && order.first() == last) order.drop(1) + order.first() else order
    }

    private companion object {
        const val KEY_BAG = "quoteBagJson"
        const val KEY_LAST_INDEX = "quoteLastIndex"

        val FALLBACK_QUOTES =
            listOf(
                Quote("What stands in the way becomes the way.", "Marcus Aurelius", "Meditations 5.20"),
                Quote("We suffer more often in imagination than in reality.", "Seneca", "Letters 13"),
                Quote("First say to yourself what you would be; then do what you have to do.", "Epictetus", "Discourses 3.23"),
            )
    }
}
