package com.appblocker.store

/** A fake [KeyValueStore]. Sharing one instance between two [RecessPrefs] simulates a restart. */
class InMemoryKeyValueStore : KeyValueStore {
    private val values = mutableMapOf<String, Any>()

    override fun getString(key: String): String? = values[key] as String?

    override fun getBoolean(key: String, default: Boolean): Boolean = values[key] as Boolean? ?: default

    override fun getLong(key: String): Long? = values[key] as Long?

    override fun putString(key: String, value: String) {
        values[key] = value
    }

    override fun putBoolean(key: String, value: Boolean) {
        values[key] = value
    }

    override fun putLong(key: String, value: Long) {
        values[key] = value
    }
}
