package com.appblocker.service

import android.content.Intent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class BootActionsTest {
    @Test
    fun `a reboot is a reason to revive the monitor`() {
        assertEquals("boot", BootActions.reasonFor(Intent.ACTION_BOOT_COMPLETED))
    }

    @Test
    fun `an app update is a reason to revive the monitor`() {
        assertEquals("package_replaced", BootActions.reasonFor(Intent.ACTION_MY_PACKAGE_REPLACED))
    }

    @Test
    fun `any other action, including a spoofed one, starts nothing`() {
        assertNull(BootActions.reasonFor(Intent.ACTION_SCREEN_ON))
        assertNull(BootActions.reasonFor("com.example.EVIL"))
        assertNull(BootActions.reasonFor("boot"))
        assertNull(BootActions.reasonFor(""))
        assertNull(BootActions.reasonFor(null))
    }
}
