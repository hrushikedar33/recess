package com.appblocker.service

/** What to record when the service is destroyed: a stop the user asked for is not an interruption. */
object StopReasonPolicy {
    const val STOPPED_BY_USER = "stopped_by_user"
    const val DESTROYED_WHILE_ENABLED = "destroyed_while_enabled"

    /**
     * [userStopRequested] is set by our own stop call, so it stays true even if the user has already
     * turned monitoring back on (a quick off-on) by the time the old service is torn down.
     */
    fun onDestroy(userStopRequested: Boolean, intentEnabled: Boolean): String =
        if (userStopRequested || !intentEnabled) STOPPED_BY_USER else DESTROYED_WHILE_ENABLED
}
