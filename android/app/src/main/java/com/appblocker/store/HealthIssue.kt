package com.appblocker.store

/** Reasons the monitor may be running but not fully working. Shown to the user, never fatal. */
enum class HealthIssue {
    USAGE_ACCESS_MISSING,
    OVERLAY_MISSING,
    NOTIFICATIONS_BLOCKED,
    BATTERY_OPTIMIZED,
    RULES_UNREADABLE,
    INTENT_UNKNOWN,
    POLL_FAILING,
    EJECT_INEFFECTIVE,
}
