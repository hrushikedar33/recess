package com.appblocker.store

/** A fake [KeyValueStore]. Sharing one instance between two [RecessPrefs] simulates a restart. */
class InMemoryKeyValueStore : KeyValueStore {
    private val values = mutableMapOf<String, Any>()

    /** When true, durable writes report failure and store nothing, like a full disk. */
    var failDurableWrites = false

    override fun getString(key: String): String? = values[key] as String?

    override fun getBoolean(key: String, default: Boolean): Boolean = values[key] as Boolean? ?: default

    override fun getLong(key: String): Long? = values[key] as Long?

    override fun putString(key: String, value: String) {
        values[key] = value
    }

    override fun putStringDurable(key: String, value: String): Boolean {
        if (failDurableWrites) return false
        values[key] = value
        return true
    }

    override fun putBoolean(key: String, value: Boolean): Boolean {
        if (failDurableWrites) return false
        values[key] = value
        return true
    }

    override fun putLong(key: String, value: Long) {
        values[key] = value
    }
}
