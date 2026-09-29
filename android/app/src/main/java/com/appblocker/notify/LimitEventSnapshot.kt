package com.appblocker.notify

import com.appblocker.engine.BlockReason
import com.appblocker.quotes.Quote
import org.json.JSONException
import org.json.JSONObject

/** What the Break screen needs to show the same thing the notification showed. */
data class LimitEventSnapshot(
    val packageName: String,
    val appName: String,
    val reason: BlockReason,
    val blockedUntilMs: Long,
    val quote: Quote,
    val createdAtMs: Long,
)

object LimitEventSnapshotCodec {
    fun encode(snapshot: LimitEventSnapshot): String =
        JSONObject()
            .put("packageName", snapshot.packageName)
            .put("appName", snapshot.appName)
            .put("reason", snapshot.reason.name)
            .put("blockedUntilMs", snapshot.blockedUntilMs)
            .put("createdAtMs", snapshot.createdAtMs)
            .put(
                "quote",
                JSONObject()
                    .put("text", snapshot.quote.text)
                    .put("author", snapshot.quote.author)
                    .apply { snapshot.quote.source?.let { put("source", it) } },
            )
            .toString()

    /** Anything unreadable or incomplete decodes to null, never an exception. */
    fun decode(json: String?): LimitEventSnapshot? {
        if (json.isNullOrBlank()) return null
        return try {
            val root = JSONObject(json)
            val quote = root.getJSONObject("quote")
            LimitEventSnapshot(
                packageName = root.getString("packageName"),
                appName = root.getString("appName"),
                reason = BlockReason.valueOf(root.getString("reason")),
                blockedUntilMs = root.getLong("blockedUntilMs"),
                quote =
                    Quote(
                        text = quote.getString("text"),
                        author = quote.getString("author"),
                        source = if (quote.has("source")) quote.getString("source") else null,
                    ),
                createdAtMs = root.getLong("createdAtMs"),
            )
        } catch (e: JSONException) {
            null
        } catch (e: IllegalArgumentException) {
            null
        }
    }
}
