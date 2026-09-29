package com.appblocker.service

/**
 * Exact, in-process truth about whether the monitor loop is running. It lives in the same process
 * as the JS bridge, and process death resets it, which is the correct answer. (A heartbeat cannot
 * say this reliably: timers stall during deep sleep, so a live service can look stale.)
 */
object MonitorRuntime {
    @Volatile
    var isRunning: Boolean = false

    /**
     * Set when *we* stop the service on the user's behalf, so tearing it down is never mistaken for
     * an interruption. Cleared when it is consumed or the service is started again.
     */
    @Volatile
    var userStopRequested: Boolean = false
}
