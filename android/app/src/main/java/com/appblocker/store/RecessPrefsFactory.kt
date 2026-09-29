package com.appblocker.store

import android.content.Context

/** One [RecessPrefs] per process, shared by the JS bridge and (later) the monitor service. */
object RecessPrefsFactory {
    private const val FILE_NAME = "recess_state"

    @Volatile
    private var instance: RecessPrefs? = null

    fun get(context: Context): RecessPrefs =
        instance
            ?: synchronized(this) {
                instance
                    ?: RecessPrefs(
                        SharedPreferencesStore(
                            context.applicationContext.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE),
                        ),
                    ).also { instance = it }
            }
}
