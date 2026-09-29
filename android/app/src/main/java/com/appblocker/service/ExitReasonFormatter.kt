package com.appblocker.service

/**
 * Names for ApplicationExitInfo reason codes (kept as plain numbers so this stays free of Android
 * and testable). A killed process cannot report its own death, so the next start reads the
 * previous exit and records why: that is how "why did it stop?" gets an answer.
 */
object ExitReasonFormatter {
    private val names =
        mapOf(
            0 to "UNKNOWN",
            1 to "EXIT_SELF",
            2 to "SIGNALED",
            3 to "LOW_MEMORY",
            4 to "CRASH",
            5 to "CRASH_NATIVE",
            6 to "ANR",
            7 to "INITIALIZATION_FAILURE",
            8 to "PERMISSION_CHANGE",
            9 to "EXCESSIVE_RESOURCE_USAGE",
            10 to "USER_REQUESTED",
            11 to "USER_STOPPED",
            12 to "DEPENDENCY_DIED",
            13 to "OTHER",
            14 to "FREEZER",
            15 to "PACKAGE_STATE_CHANGE",
            16 to "PACKAGE_UPDATED",
        )

    fun name(reason: Int): String = names[reason] ?: "UNKNOWN_$reason"

    fun describe(reason: Int, timestampMs: Long, formatTime: (Long) -> String): String =
        "previous process ended: ${name(reason)} at ${formatTime(timestampMs)}"
}
