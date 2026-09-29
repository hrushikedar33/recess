package com.appblocker.quotes

import org.json.JSONArray
import org.json.JSONException

data class Quote(
    val text: String,
    val author: String,
    val source: String? = null,
)

/** Reads the bundled quote list. Lenient: a bad entry is skipped, and bad input yields no quotes. */
object QuoteCodec {
    fun parse(json: String?): List<Quote> {
        if (json.isNullOrBlank()) return emptyList()
        val array =
            try {
                JSONArray(json)
            } catch (e: JSONException) {
                return emptyList()
            }
        return (0 until array.length()).mapNotNull { index ->
            val entry = array.optJSONObject(index) ?: return@mapNotNull null
            val text = (entry.opt("text") as? String)?.trim()
            val author = (entry.opt("author") as? String)?.trim()
            if (text.isNullOrEmpty() || author.isNullOrEmpty()) return@mapNotNull null
            Quote(text, author, (entry.opt("source") as? String)?.trim()?.takeIf { it.isNotEmpty() })
        }
    }
}
