package com.appblocker.quotes

/**
 * The quotes the app may show: the bundled ones, plus (only if the user opted in to online quotes)
 * a capped set fetched from the internet. Anything from the internet is untrusted, so it is checked
 * here again even though the JS side already filtered it: plain, attributed, sentence-length text
 * only, never a link, markup or the service's own error message, and never a repeat.
 */
object QuotePool {
    private const val MAX_EXTRAS = 200
    private const val MIN_TEXT = 10
    private const val MAX_TEXT = 220
    private const val MAX_AUTHOR = 40

    private val FORBIDDEN = listOf("<", ">", "@", "http", "&#", "&quot;", "&amp;", "&lt;")
    private val CONTROL = Regex("[\\u0000-\\u001F\\u007F]")
    private val RATE_LIMIT = Regex("too many requests|auth key|unlimited access", RegexOption.IGNORE_CASE)
    private val SERVICE_AUTHOR = Regex("zenquotes|\\.io|\\.com", RegexOption.IGNORE_CASE)
    private val UNATTRIBUTED = setOf("unknown", "anonymous", "anon")
    private val SENTENCE_END = Regex("[.?!\\u2019\\u201D]$")

    fun merge(bundled: List<Quote>, extras: List<Quote>): List<Quote> {
        val seen = bundled.map { normalize(it.text) }.toMutableSet()
        val accepted = mutableListOf<Quote>()
        for (candidate in extras) {
            val quote = Quote(candidate.text.trim(), candidate.author.trim())
            if (isUsable(quote) && seen.add(normalize(quote.text))) accepted += quote
        }
        return bundled + accepted.takeLast(MAX_EXTRAS)
    }

    private fun isUsable(quote: Quote): Boolean {
        val text = quote.text
        val author = quote.author
        val textOk =
            text.length in MIN_TEXT..MAX_TEXT &&
                SENTENCE_END.containsMatchIn(text) &&
                !CONTROL.containsMatchIn(text) &&
                !RATE_LIMIT.containsMatchIn(text) &&
                FORBIDDEN.none { text.contains(it) }
        val authorOk =
            author.isNotEmpty() &&
                author.length <= MAX_AUTHOR &&
                !CONTROL.containsMatchIn(author) &&
                !SERVICE_AUTHOR.containsMatchIn(author) &&
                author.lowercase() !in UNATTRIBUTED &&
                FORBIDDEN.none { author.contains(it) }
        return textOk && authorOk
    }

    private fun normalize(text: String): String = text.lowercase().filter { it in 'a'..'z' || it in '0'..'9' }
}
