package com.appblocker.detector

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.PowerManager
import android.util.Log

/** [UsageEventSource] backed by the real UsageStatsManager. Needs the Usage Access permission. */
class AndroidUsageEventSource(context: Context) : UsageEventSource {
    private val usageStats = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    private val power = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
    private var loggedSteadyWindow = false

    // Same as before the extraction: only a screen that is known to be off counts as "not interactive".
    override fun isInteractive(): Boolean = power?.isInteractive != false

    override fun queryEvents(beginMs: Long, endMs: Long): List<UsageEventRecord> {
        logSteadyStateWindowOnce(endMs - beginMs)
        val events = usageStats.queryEvents(beginMs, endMs) ?: return emptyList()
        val records = mutableListOf<UsageEventRecord>()
        val event = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val packageName = event.packageName ?: continue
            val kind =
                if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) UsageEventKind.RESUMED else UsageEventKind.OTHER
            records += UsageEventRecord(kind, packageName, event.timeStamp)
        }
        return records
    }

    override fun mostRecentlyUsedPackage(beginMs: Long, endMs: Long): String? =
        usageStats
            .queryUsageStats(UsageStatsManager.INTERVAL_BEST, beginMs, endMs)
            ?.filter { it.lastTimeUsed > 0 }
            ?.maxByOrNull { it.lastTimeUsed }
            ?.packageName

    /** One line proving polls no longer scan the whole bootstrap window. */
    private fun logSteadyStateWindowOnce(windowMs: Long) {
        if (loggedSteadyWindow || windowMs >= ForegroundReducer.BOOTSTRAP_LOOKBACK_MS) return
        loggedSteadyWindow = true
        Log.i("Recess", "Foreground query window is now ${windowMs}ms (bootstrap was ${ForegroundReducer.BOOTSTRAP_LOOKBACK_MS}ms)")
    }
}
