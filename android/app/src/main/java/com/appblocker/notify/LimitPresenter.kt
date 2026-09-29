package com.appblocker.notify

/**
 * Shows a limit event to the user in every way we have, most reliable first: the notification (which
 * works whatever the OS allows), then the full-screen takeover, and if the takeover cannot be drawn
 * the Break screen is opened instead. One surface failing never costs the others.
 */
class LimitPresenter(
    private val notify: (packageName: String, message: LimitMessage) -> Unit,
    /** Returns whether the takeover is now on screen. */
    private val takeover: (packageName: String, message: LimitMessage) -> Boolean,
    private val fallback: () -> Unit,
    private val onError: (what: String, error: Throwable) -> Unit,
) {
    fun present(packageName: String, message: LimitMessage) {
        attempt("Could not post the limit notification") { notify(packageName, message) }
        val shown = attempt("Could not draw the takeover") { takeover(packageName, message) } ?: false
        if (!shown) attempt("Could not open the Break screen") { fallback() }
    }

    private fun <T> attempt(what: String, block: () -> T): T? =
        try {
            block()
        } catch (e: Exception) {
            onError(what, e)
            null
        }
}
