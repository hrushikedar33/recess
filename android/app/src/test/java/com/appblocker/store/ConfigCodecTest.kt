package com.appblocker.store

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

private const val MINUTE_MS = 60_000L

private fun app(
    pkg: String = "com.instagram.android",
    name: String = "Instagram",
    limit: String = "10",
    cooldown: String = "5",
    daily: String? = "60",
    active: String = "true",
): String =
    buildString {
        append("""{"packageName":"$pkg","appName":"$name","limitMinutes":$limit,""")
        append(""""cooldownMinutes":$cooldown,""")
        if (daily != null) append(""""dailyLimitMinutes":$daily,""")
        append(""""isActive":$active}""")
    }

private fun goal(
    id: String = "g1",
    title: String = "Finish the report",
    done: String = "false",
): String = """{"id":"$id","title":"$title","done":$done}"""

private fun assertRejected(json: String) {
    assertThrows(ConfigFormatException::class.java) { ConfigCodec.parseBlockedApps(json) }
}

private fun assertGoalsRejected(json: String) {
    assertThrows(ConfigFormatException::class.java) { ConfigCodec.parseGoals(json) }
}

class ConfigCodecTest {
    // ---- blocked apps: accepted input ------------------------------------------------------

    @Test
    fun `a complete rule is parsed field by field`() {
        val apps = ConfigCodec.parseBlockedApps("[${app()}]")

        assertEquals(
            listOf(BlockedAppConfig("com.instagram.android", "Instagram", 10, 5, 60, true)),
            apps,
        )
    }

    @Test
    fun `a rule without a daily budget has none`() {
        val apps = ConfigCodec.parseBlockedApps("[${app(daily = null)}]")

        assertNull(apps.single().dailyLimitMinutes)
    }

    @Test
    fun `an explicit null daily budget means none`() {
        val apps = ConfigCodec.parseBlockedApps("[${app(daily = "null")}]")

        assertNull(apps.single().dailyLimitMinutes)
    }

    @Test
    fun `unknown fields such as an icon are ignored`() {
        val withIcon = app().dropLast(1) + ""","iconBase64":"data:image/png;base64,AAAA"}"""

        assertEquals(1, ConfigCodec.parseBlockedApps("[$withIcon]").size)
    }

    @Test
    fun `an empty list is valid`() {
        assertTrue(ConfigCodec.parseBlockedApps("[]").isEmpty())
    }

    @Test
    fun `a zero cooldown is accepted`() {
        assertEquals(0, ConfigCodec.parseBlockedApps("[${app(cooldown = "0")}]").single().cooldownMinutes)
    }

    @Test
    fun `a rule converts to engine milliseconds`() {
        val rule = ConfigCodec.parseBlockedApps("[${app(limit = "10", cooldown = "5", daily = "60")}]")
            .single()
            .toRule()

        assertEquals(10 * MINUTE_MS, rule.sessionLimitMs)
        assertEquals(5 * MINUTE_MS, rule.cooldownMs)
        assertEquals(60 * MINUTE_MS, rule.dailyLimitMs)
        assertEquals("Instagram", rule.appName)
        assertTrue(rule.isActive)
    }

    @Test
    fun `a rule with no daily budget converts to no daily limit`() {
        val rule = ConfigCodec.parseBlockedApps("[${app(daily = null)}]").single().toRule()

        assertNull(rule.dailyLimitMs)
    }

    @Test
    fun `an inactive rule stays inactive after conversion`() {
        val rule = ConfigCodec.parseBlockedApps("[${app(active = "false")}]").single().toRule()

        assertEquals(false, rule.isActive)
    }

    @Test
    fun `encoded rules parse back to the same rules`() {
        val original =
            listOf(
                BlockedAppConfig("com.a", "A", 10, 5, 60, true),
                BlockedAppConfig("com.b", "B", 3, 0, null, false),
            )

        assertEquals(original, ConfigCodec.parseBlockedApps(ConfigCodec.encodeBlockedApps(original)))
    }

    // ---- blocked apps: rejected input ------------------------------------------------------

    @Test
    fun `text that is not json is rejected`() = assertRejected("{not json")

    @Test
    fun `a json object instead of a list is rejected`() = assertRejected("""{"apps":[]}""")

    @Test
    fun `an entry that is not an object is rejected`() = assertRejected("[42]")

    @Test
    fun `a blank package name is rejected`() = assertRejected("[${app(pkg = "  ")}]")

    @Test
    fun `a blank app name is rejected`() = assertRejected("[${app(name = "")}]")

    @Test
    fun `a missing session limit is rejected`() =
        assertRejected("""[{"packageName":"a","appName":"A","cooldownMinutes":5,"isActive":true}]""")

    @Test
    fun `a zero session limit is rejected`() = assertRejected("[${app(limit = "0")}]")

    @Test
    fun `a negative session limit is rejected`() = assertRejected("[${app(limit = "-5")}]")

    @Test
    fun `a fractional session limit is rejected`() = assertRejected("[${app(limit = "2.5")}]")

    @Test
    fun `a session limit that is not a number is rejected`() = assertRejected("[${app(limit = "\"ten\"")}]")

    @Test
    fun `a negative cooldown is rejected`() = assertRejected("[${app(cooldown = "-1")}]")

    @Test
    fun `a zero daily budget is rejected`() = assertRejected("[${app(daily = "0")}]")

    @Test
    fun `a daily budget that is not a number is rejected`() = assertRejected("[${app(daily = "\"lots\"")}]")

    @Test
    fun `an active flag that is not a boolean is rejected`() = assertRejected("[${app(active = "\"yes\"")}]")

    @Test
    fun `a missing active flag is rejected`() =
        assertRejected("""[{"packageName":"a","appName":"A","limitMinutes":5,"cooldownMinutes":5}]""")

    @Test
    fun `the same package listed twice is rejected`() = assertRejected("[${app()},${app()}]")

    @Test
    fun `more rules than the cap are rejected`() {
        val tooMany = (1..ConfigCodec.MAX_APPS + 1).joinToString(",", "[", "]") { app(pkg = "com.app$it") }

        assertRejected(tooMany)
    }

    @Test
    fun `exactly the cap of rules is accepted`() {
        val atCap = (1..ConfigCodec.MAX_APPS).joinToString(",", "[", "]") { app(pkg = "com.app$it") }

        assertEquals(ConfigCodec.MAX_APPS, ConfigCodec.parseBlockedApps(atCap).size)
    }

    // ---- goals -----------------------------------------------------------------------------

    @Test
    fun `goals are parsed field by field`() {
        val goals = ConfigCodec.parseGoals("[${goal(done = "true")}]")

        assertEquals(listOf(GoalConfig("g1", "Finish the report", true)), goals)
    }

    @Test
    fun `a goal title is trimmed`() {
        assertEquals("Read", ConfigCodec.parseGoals("[${goal(title = "  Read  ")}]").single().title)
    }

    @Test
    fun `an empty goal list is valid`() {
        assertTrue(ConfigCodec.parseGoals("[]").isEmpty())
    }

    @Test
    fun `encoded goals parse back to the same goals`() {
        val original = listOf(GoalConfig("a", "One", false), GoalConfig("b", "Two", true))

        assertEquals(original, ConfigCodec.parseGoals(ConfigCodec.encodeGoals(original)))
    }

    @Test
    fun `a blank goal title is rejected`() = assertGoalsRejected("[${goal(title = "   ")}]")

    @Test
    fun `a goal title over the length cap is rejected`() =
        assertGoalsRejected("[${goal(title = "x".repeat(ConfigCodec.MAX_GOAL_TITLE_LENGTH + 1))}]")

    @Test
    fun `a goal title at the length cap is accepted`() {
        val title = "x".repeat(ConfigCodec.MAX_GOAL_TITLE_LENGTH)

        assertEquals(title, ConfigCodec.parseGoals("[${goal(title = title)}]").single().title)
    }

    @Test
    fun `a goal without an id is rejected`() =
        assertGoalsRejected("""[{"title":"No id","done":false}]""")

    @Test
    fun `a done flag that is not a boolean is rejected`() = assertGoalsRejected("[${goal(done = "1")}]")

    @Test
    fun `duplicate goal ids are rejected`() = assertGoalsRejected("[${goal()},${goal()}]")

    @Test
    fun `more goals than the cap are rejected`() {
        val tooMany = (1..ConfigCodec.MAX_GOALS + 1).joinToString(",", "[", "]") { goal(id = "g$it") }

        assertGoalsRejected(tooMany)
    }

    @Test
    fun `goals that are not a list are rejected`() = assertGoalsRejected("""{"goals":[]}""")
}
