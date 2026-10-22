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

    private const val REASON_PACKAGE_STATE_CHANGE = 15
    private const val REASON_PACKAGE_UPDATED = 16

    /** How far from the moment the app was updated an exit still counts as "caused by the update". */
    const val UPDATE_WINDOW_MS = 30_000L

    /**
     * Whether a previous exit should be shown to the user as an interruption. Replacing the app
     * kills its old process, and Android records that as OTHER (on a Samsung: "INVALID START"), so an
     * update used to look like "Recess was closed by the system". An exit within
     * [UPDATE_WINDOW_MS] of the package's last update, or one the system itself blames on an update or
     * a package change, is not an interruption. A real kill long after an update still is.
     */
    fun shouldReport(reason: Int, exitMs: Long, packageUpdatedMs: Long?): Boolean {
        if (reason == REASON_PACKAGE_UPDATED || reason == REASON_PACKAGE_STATE_CHANGE) return false
        if (packageUpdatedMs != null && kotlin.math.abs(exitMs - packageUpdatedMs) < UPDATE_WINDOW_MS) return false
        return true
    }

    fun name(reason: Int): String = names[reason] ?: "UNKNOWN_$reason"

    fun describe(reason: Int, timestampMs: Long, formatTime: (Long) -> String): String =
        "previous process ended: ${name(reason)} at ${formatTime(timestampMs)}"
}
