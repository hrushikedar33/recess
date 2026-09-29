package com.appblocker.store

import android.content.SharedPreferences

/**
 * The few storage operations [RecessPrefs] needs. A seam so the store logic can be unit-tested
 * with an in-memory fake instead of Android's SharedPreferences.
 */
interface KeyValueStore {
    fun getString(key: String): String?

    fun getBoolean(key: String, default: Boolean): Boolean

    /** Null when the key was never written. */
    fun getLong(key: String): Long?

    fun putString(key: String, value: String)

    /** Written synchronously, so a process kill right after cannot lose it. False if it was not saved. */
    fun putStringDurable(key: String, value: String): Boolean

    /** Flags are written synchronously: losing one to a process kill is the bug being fixed. False if not saved. */
    fun putBoolean(key: String, value: Boolean): Boolean

    fun putLong(key: String, value: Long)

    /** Removes the key synchronously, like [putStringDurable]. False if that could not be saved. */
    fun removeDurable(key: String): Boolean
}

class SharedPreferencesStore(private val prefs: SharedPreferences) : KeyValueStore {
    override fun getString(key: String): String? = prefs.getString(key, null)

    override fun getBoolean(key: String, default: Boolean): Boolean = prefs.getBoolean(key, default)

    override fun getLong(key: String): Long? = if (prefs.contains(key)) prefs.getLong(key, 0L) else null

    override fun putString(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
    }

    override fun putStringDurable(key: String, value: String): Boolean =
        prefs.edit().putString(key, value).commit()

    override fun putBoolean(key: String, value: Boolean): Boolean =
        prefs.edit().putBoolean(key, value).commit()

    override fun putLong(key: String, value: Long) {
        prefs.edit().putLong(key, value).apply()
    }

    override fun removeDurable(key: String): Boolean = prefs.edit().remove(key).commit()
}
