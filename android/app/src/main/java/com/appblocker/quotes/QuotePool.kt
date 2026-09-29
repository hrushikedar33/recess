package com.appblocker.quotes

/**
 * The quotes the app may show: the bundled ones, plus (only if the user opted in to online quotes)
 * a capped set fetched from the internet. Anything from the internet is untrusted, so it is checked
 * here again even though the JS side already filtered it.
 *
 * The check is an ALLOWLIST, not a list of known-bad things: Latin letters (with accents), spaces
 * and ordinary punctuation only. No digits (which is how phone numbers get in), no symbols or
 * slashes (links, amounts), no emoji, no other scripts, and none of the invisible or
 * direction-changing characters used to spoof text. The rules must stay identical to
 * src/domain/quotes/quote-validation.ts; both are tested against the same cases in
 * __tests__/fixtures/quote-validation-cases.json.
 */
object QuotePool {
    private const val MAX_EXTRAS = 200
    private const val MIN_TEXT = 10
    private const val MAX_TEXT = 220
    private const val MAX_AUTHOR = 40

    private const val LETTERS = "A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F"
    private val TEXT_ALLOWED = Regex("[$LETTERS '\u2018\u2019\"\u201C\u201D(),.;:!?\\-\u2013\u2014\u2026]+")
    private val AUTHOR_ALLOWED = Regex("[$LETTERS .'\u2019\\-]+")
    private const val SENTENCE_ENDINGS = ".?!\u2019\u201D"

    // A dot straight between letters looks like a web address ("example.com").
    private val WEB_ADDRESS = Regex("[A-Za-z]\\.[A-Za-z]{2,}")
    private val RATE_LIMIT = Regex("too many requests|auth key|unlimited access", RegexOption.IGNORE_CASE)
    private val SERVICE_AUTHOR = Regex("zenquotes|\\.io|\\.com", RegexOption.IGNORE_CASE)
    private val UNATTRIBUTED = setOf("unknown", "anonymous", "anon")

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
                TEXT_ALLOWED.matches(text) &&
                text.last() in SENTENCE_ENDINGS &&
                !WEB_ADDRESS.containsMatchIn(text) &&
                !RATE_LIMIT.containsMatchIn(text)
        val authorOk =
            author.isNotEmpty() &&
                author.length <= MAX_AUTHOR &&
                AUTHOR_ALLOWED.matches(author) &&
                !WEB_ADDRESS.containsMatchIn(author) &&
                !SERVICE_AUTHOR.containsMatchIn(author) &&
                author.lowercase() !in UNATTRIBUTED
        return textOk && authorOk
    }

    private fun normalize(text: String): String = text.lowercase().filter { it in 'a'..'z' || it in '0'..'9' }
}
