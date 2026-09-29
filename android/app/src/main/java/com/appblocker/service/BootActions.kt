package com.appblocker.service

import android.content.Intent

/**
 * Which broadcasts may revive the monitor. The receiver is exported because the system has to
 * reach it, so anything other than the two protected system actions is ignored.
 */
object BootActions {
    fun reasonFor(action: String?): String? =
        when (action) {
            Intent.ACTION_BOOT_COMPLETED -> "boot"
            Intent.ACTION_MY_PACKAGE_REPLACED -> "package_replaced"
            else -> null
        }
}
