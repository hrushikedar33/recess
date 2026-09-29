package com.appblocker.engine

import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

/** Maps an instant to a local calendar day. Injected so day rollover is testable. */
interface DayClock {
    /** Stable identifier of the local calendar day containing [nowMs], e.g. "2026-09-29". */
    fun dayKey(nowMs: Long): String

    /** The instant of the next local midnight after [nowMs]. */
    fun nextDayStartMs(nowMs: Long): Long
}

/**
 * Calendar-based [DayClock]. java.time is deliberately avoided (minSdk 21).
 *
 * The monitor asks about the day every second, so the answer for the current local day (its key and
 * its two boundaries) is kept and reused until the time leaves that day, the clock goes backwards,
 * or the device timezone changes. Not thread-safe: used from the monitor's single thread.
 */
class CalendarDayClock(
    private val zoneProvider: () -> TimeZone = { TimeZone.getDefault() },
) : DayClock {
    private class LocalDay(val zoneId: String, val startMs: Long, val endMs: Long, val key: String)

    private var cached: LocalDay? = null

    override fun dayKey(nowMs: Long): String = localDay(nowMs).key

    override fun nextDayStartMs(nowMs: Long): Long = localDay(nowMs).endMs

    private fun localDay(nowMs: Long): LocalDay {
        val zone = zoneProvider()
        cached?.let { day ->
            if (day.zoneId == zone.id && nowMs >= day.startMs && nowMs < day.endMs) return day
        }
        return compute(zone, nowMs).also { cached = it }
    }

    private fun compute(zone: TimeZone, nowMs: Long): LocalDay {
        val calendar = Calendar.getInstance(zone).apply { timeInMillis = nowMs }
        val key =
            String.format(
                Locale.ROOT,
                "%04d-%02d-%02d",
                calendar.get(Calendar.YEAR),
                calendar.get(Calendar.MONTH) + 1,
                calendar.get(Calendar.DAY_OF_MONTH),
            )
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        val start = calendar.timeInMillis
        calendar.add(Calendar.DAY_OF_MONTH, 1)
        return LocalDay(zone.id, start, calendar.timeInMillis, key)
    }
}
