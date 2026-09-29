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
 * The zone is read on every call so a device timezone change is picked up.
 */
class CalendarDayClock(
    private val zoneProvider: () -> TimeZone = { TimeZone.getDefault() },
) : DayClock {
    override fun dayKey(nowMs: Long): String {
        val calendar = calendarAt(nowMs)
        return String.format(
            Locale.ROOT,
            "%04d-%02d-%02d",
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH) + 1,
            calendar.get(Calendar.DAY_OF_MONTH),
        )
    }

    override fun nextDayStartMs(nowMs: Long): Long {
        val calendar = calendarAt(nowMs)
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        calendar.add(Calendar.DAY_OF_MONTH, 1)
        return calendar.timeInMillis
    }

    private fun calendarAt(nowMs: Long): Calendar =
        Calendar.getInstance(zoneProvider()).apply { timeInMillis = nowMs }
}
