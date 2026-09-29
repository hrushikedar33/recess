package com.appblocker.store

import android.content.Context

/** One [RecessPrefs] (and its storage) per process, shared by the JS bridge and the monitor service. */
object RecessPrefsFactory {
    private const val FILE_NAME = "recess_state"

    private class Holder(val store: KeyValueStore, val prefs: RecessPrefs)

    @Volatile
    private var holder: Holder? = null

    fun get(context: Context): RecessPrefs = holder(context).prefs

    /** The same storage, for collaborators that keep their own small state (the quote bag). */
    fun store(context: Context): KeyValueStore = holder(context).store

    private fun holder(context: Context): Holder =
        holder
            ?: synchronized(this) {
                holder
                    ?: SharedPreferencesStore(
                        context.applicationContext.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE),
                    ).let { Holder(it, RecessPrefs(it)) }.also { holder = it }
            }
}
