package com.appblocker.detector

enum class UsageEventKind {
    /** An activity came to the foreground (ACTIVITY_RESUMED). */
    RESUMED,

    /** Any other usage event; irrelevant to foreground detection. */
    OTHER,
}

data class UsageEventRecord(
    val kind: UsageEventKind,
    val packageName: String,
    val timestampMs: Long,
)

/** Where the detector reads from. A seam so the detector logic is testable without Android. */
interface UsageEventSource {
    /** False while the screen is off or the device is locked to a black screen. */
    fun isInteractive(): Boolean

    /** Usage events in [beginMs, endMs], in the order the system returns them. */
    fun queryEvents(beginMs: Long, endMs: Long): List<UsageEventRecord>

    /** The most recently used package in [beginMs, endMs] according to usage stats, if any. */
    fun mostRecentlyUsedPackage(beginMs: Long, endMs: Long): String?
}
