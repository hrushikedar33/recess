package com.appblocker.quotes

import android.content.Context
import android.util.Log

/** Loads the bundled quote list. A missing or unreadable asset yields none, and the repository then uses its built-in quotes. */
object QuoteAssets {
    private const val FILE_NAME = "quotes.json"

    fun load(context: Context): List<Quote> =
        try {
            context.assets.open(FILE_NAME).bufferedReader().use { QuoteCodec.parse(it.readText()) }
        } catch (e: Exception) {
            Log.w("Recess", "Could not read $FILE_NAME", e)
            emptyList()
        }
}
