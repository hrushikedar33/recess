package com.appblocker.engine

import java.util.Calendar
import java.util.TimeZone
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

private const val HOUR = 60 * 60 * 1000L

private val KOLKATA: TimeZone = TimeZone.getTimeZone("Asia/Kolkata")
private val NEW_YORK: TimeZone = TimeZone.getTimeZone("America/New_York")

/** [month] is 1-based here, unlike java.util.Calendar. */
private fun localMillis(zone: TimeZone, year: Int, month: Int, day: Int, hour: Int, minute: Int): Long =
    Calendar.getInstance(zone).apply {
        clear()
        set(year, month - 1, day, hour, minute, 0)
    }.timeInMillis

class CalendarDayClockTest {
    @Test
    fun `the day key is the zero padded local date`() {
        val clock = CalendarDayClock { KOLKATA }

        assertEquals("2026-03-08", clock.dayKey(localMillis(KOLKATA, 2026, 3, 8, 14, 5)))
    }

    @Test
    fun `the same instant can be a different local day in another timezone`() {
        val instant = localMillis(KOLKATA, 2026, 9, 29, 1, 0) // 01:00 in Kolkata, still the 28th in New York

        assertEquals("2026-09-29", CalendarDayClock { KOLKATA }.dayKey(instant))
        assertEquals("2026-09-28", CalendarDayClock { NEW_YORK }.dayKey(instant))
    }

    @Test
    fun `the timezone is read on every call so a device timezone change is picked up`() {
        var zone = KOLKATA
        val clock = CalendarDayClock { zone }
        val instant = localMillis(KOLKATA, 2026, 9, 29, 1, 0)

        val before = clock.dayKey(instant)
        zone = NEW_YORK

        assertNotEquals(before, clock.dayKey(instant))
    }

    @Test
    fun `the next day starts at the following local midnight`() {
        val clock = CalendarDayClock { KOLKATA }
        val now = localMillis(KOLKATA, 2026, 9, 29, 23, 59)

        assertEquals(localMillis(KOLKATA, 2026, 9, 30, 0, 0), clock.nextDayStartMs(now))
    }

    @Test
    fun `the day the clocks go forward is 23 hours long`() {
        val clock = CalendarDayClock { NEW_YORK }
        val now = localMillis(NEW_YORK, 2026, 3, 8, 0, 30) // US spring-forward day

        val next = clock.nextDayStartMs(now)

        assertEquals(localMillis(NEW_YORK, 2026, 3, 9, 0, 0), next)
        assertEquals(22 * HOUR + HOUR / 2, next - now)
    }

    @Test
    fun `the day the clocks go back is 25 hours long`() {
        val clock = CalendarDayClock { NEW_YORK }
        val now = localMillis(NEW_YORK, 2026, 11, 1, 0, 30) // US fall-back day

        val next = clock.nextDayStartMs(now)

        assertEquals(localMillis(NEW_YORK, 2026, 11, 2, 0, 0), next)
        assertEquals(24 * HOUR + HOUR / 2, next - now)
    }
}
