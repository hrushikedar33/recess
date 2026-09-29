package com.appblocker.engine

import org.json.JSONException
import org.json.JSONObject

/**
 * JSON form of [EngineState], persisted so blocks and day totals survive a service restart.
 * Decoding never throws: unreadable input yields an empty state, and a single unreadable app
 * entry is skipped without losing the others.
 */
object EngineStateCodec {
    private const val VERSION = 1

    fun encode(state: EngineState): String {
        val apps = JSONObject()
        for ((packageName, usage) in state.apps) {
            apps.put(packageName, encodeUsage(usage))
        }
        return JSONObject()
            .put("v", VERSION)
            .apply {
                state.lastTickMs?.let { put("lastTickMs", it) }
                state.lastForegroundPackage?.let { put("lastForegroundPackage", it) }
            }
            .put("apps", apps)
            .toString()
    }

    fun decode(json: String?): EngineState {
        if (json.isNullOrBlank()) return EngineState.EMPTY
        return try {
            decodeState(JSONObject(json))
        } catch (e: JSONException) {
            EngineState.EMPTY
        }
    }

    private fun encodeUsage(usage: AppUsage): JSONObject =
        JSONObject()
            .put("dayKey", usage.dayKey)
            .put("dailyUsedMs", usage.dailyUsedMs)
            .put("sessionUsedMs", usage.sessionUsedMs)
            .apply {
                usage.blockedUntilMs?.let { put("blockedUntilMs", it) }
                usage.blockReason?.let { put("blockReason", it.name) }
            }

    private fun decodeState(root: JSONObject): EngineState {
        val apps = mutableMapOf<String, AppUsage>()
        val saved = root.optJSONObject("apps")
        if (saved != null) {
            for (packageName in saved.keys()) {
                val usage = saved.optJSONObject(packageName)?.let(::decodeUsage) ?: continue
                apps[packageName] = usage
            }
        }
        return EngineState(
            apps = apps,
            lastTickMs = if (root.has("lastTickMs")) root.optLong("lastTickMs") else null,
            lastForegroundPackage =
                if (root.has("lastForegroundPackage")) root.optString("lastForegroundPackage") else null,
        )
    }

    private fun decodeUsage(entry: JSONObject): AppUsage? =
        try {
            val blockedUntilMs = if (entry.has("blockedUntilMs")) entry.getLong("blockedUntilMs") else null
            val blockReason =
                if (entry.has("blockReason")) BlockReason.valueOf(entry.getString("blockReason")) else null
            // A block needs both halves; a lone one could never end, so treat the entry as unreadable.
            if ((blockedUntilMs == null) != (blockReason == null)) {
                null
            } else {
                AppUsage(
                    dayKey = entry.getString("dayKey"),
                    dailyUsedMs = entry.getLong("dailyUsedMs"),
                    sessionUsedMs = entry.getLong("sessionUsedMs"),
                    blockedUntilMs = blockedUntilMs,
                    blockReason = blockReason,
                )
            }
        } catch (e: JSONException) {
            null
        } catch (e: IllegalArgumentException) {
            null
        }
}
