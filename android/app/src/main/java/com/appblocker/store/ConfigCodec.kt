package com.appblocker.store

import com.appblocker.engine.AppRule
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

private const val MINUTE_MS = 60_000L

/** A blocked-app rule as the JS side describes it. Durations are whole minutes. */
data class BlockedAppConfig(
    val packageName: String,
    val appName: String,
    val limitMinutes: Int,
    val cooldownMinutes: Int,
    val dailyLimitMinutes: Int?,
    val isActive: Boolean,
)

data class GoalConfig(
    val id: String,
    val title: String,
    val done: Boolean,
)

/** The JS payload was not what the native side accepts. The message names the problem. */
class ConfigFormatException(message: String) : Exception(message)

fun BlockedAppConfig.toRule(): AppRule =
    AppRule(
        packageName = packageName,
        appName = appName,
        sessionLimitMs = limitMinutes * MINUTE_MS,
        cooldownMs = cooldownMinutes * MINUTE_MS,
        dailyLimitMs = dailyLimitMinutes?.let { it * MINUTE_MS },
        isActive = isActive,
    )

/**
 * Validates and (de)serializes what JS mirrors to native. Parsing is all-or-nothing: one bad
 * entry rejects the whole payload, so a half-understood config is never stored.
 */
object ConfigCodec {
    const val MAX_APPS = 50
    const val MAX_GOALS = 20
    const val MAX_GOAL_TITLE_LENGTH = 120

    fun parseBlockedApps(json: String): List<BlockedAppConfig> {
        val entries = parseList(json, "apps", MAX_APPS)
        val seen = mutableSetOf<String>()
        return entries.map { (index, entry) ->
            val app = parseApp(entry, "apps[$index]")
            if (!seen.add(app.packageName)) {
                throw ConfigFormatException("apps[$index]: duplicate package ${app.packageName}")
            }
            app
        }
    }

    fun encodeBlockedApps(apps: List<BlockedAppConfig>): String =
        JSONArray(
            apps.map { app ->
                JSONObject()
                    .put("packageName", app.packageName)
                    .put("appName", app.appName)
                    .put("limitMinutes", app.limitMinutes)
                    .put("cooldownMinutes", app.cooldownMinutes)
                    .apply { app.dailyLimitMinutes?.let { put("dailyLimitMinutes", it) } }
                    .put("isActive", app.isActive)
            },
        ).toString()

    fun parseGoals(json: String): List<GoalConfig> {
        val entries = parseList(json, "goals", MAX_GOALS)
        val seen = mutableSetOf<String>()
        return entries.map { (index, entry) ->
            val goal = parseGoal(entry, "goals[$index]")
            if (!seen.add(goal.id)) throw ConfigFormatException("goals[$index]: duplicate id ${goal.id}")
            goal
        }
    }

    fun encodeGoals(goals: List<GoalConfig>): String =
        JSONArray(
            goals.map { goal ->
                JSONObject().put("id", goal.id).put("title", goal.title).put("done", goal.done)
            },
        ).toString()

    private fun parseApp(entry: JSONObject, where: String) =
        BlockedAppConfig(
            packageName = requireText(entry, "packageName", where),
            appName = requireText(entry, "appName", where),
            limitMinutes = requireWholeNumber(entry, "limitMinutes", where, min = 1),
            cooldownMinutes = requireWholeNumber(entry, "cooldownMinutes", where, min = 0),
            dailyLimitMinutes =
                if (entry.has("dailyLimitMinutes") && !entry.isNull("dailyLimitMinutes")) {
                    requireWholeNumber(entry, "dailyLimitMinutes", where, min = 1)
                } else {
                    null
                },
            isActive = requireBoolean(entry, "isActive", where),
        )

    private fun parseGoal(entry: JSONObject, where: String): GoalConfig {
        val title = requireText(entry, "title", where)
        if (title.length > MAX_GOAL_TITLE_LENGTH) {
            throw ConfigFormatException("$where: title is longer than $MAX_GOAL_TITLE_LENGTH characters")
        }
        return GoalConfig(
            id = requireText(entry, "id", where),
            title = title,
            done = requireBoolean(entry, "done", where),
        )
    }

    /** The list's objects with their positions, or a [ConfigFormatException] if it is not a valid list. */
    private fun parseList(json: String, what: String, max: Int): List<Pair<Int, JSONObject>> {
        val array =
            try {
                JSONArray(json)
            } catch (e: JSONException) {
                throw ConfigFormatException("$what: not a JSON list")
            }
        if (array.length() > max) throw ConfigFormatException("$what: more than $max entries")
        return (0 until array.length()).map { index ->
            val entry = array.optJSONObject(index) ?: throw ConfigFormatException("$what[$index]: not an object")
            index to entry
        }
    }

    private fun requireText(entry: JSONObject, key: String, where: String): String {
        val value = entry.opt(key)
        if (value !is String || value.isBlank()) throw ConfigFormatException("$where: $key must be non-blank text")
        return value.trim()
    }

    private fun requireBoolean(entry: JSONObject, key: String, where: String): Boolean =
        entry.opt(key) as? Boolean ?: throw ConfigFormatException("$where: $key must be true or false")

    private fun requireWholeNumber(entry: JSONObject, key: String, where: String, min: Int): Int {
        val number = entry.opt(key) as? Number ?: throw ConfigFormatException("$where: $key must be a number")
        val value = number.toDouble()
        val isWhole = value.isFinite() && value % 1.0 == 0.0
        if (!isWhole || value < min || value > Int.MAX_VALUE) {
            throw ConfigFormatException("$where: $key must be a whole number of at least $min")
        }
        return value.toInt()
    }
}
