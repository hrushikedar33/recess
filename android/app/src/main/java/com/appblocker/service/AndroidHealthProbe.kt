package com.appblocker.service

import android.app.AppOpsManager
import android.content.Context
import android.os.Build
import android.os.PowerManager
import android.os.Process
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.appblocker.store.HealthIssue

/**
 * Asks the OS about the things it can take away without telling us. Each of these leaves the
 * service alive but blind or mute, which is worse than a visible failure.
 */
class AndroidHealthProbe(context: Context) : HealthProbe {
    private val context = context.applicationContext

    override fun issues(): Set<HealthIssue> {
        val issues = mutableSetOf<HealthIssue>()
        if (!hasUsageAccess()) issues += HealthIssue.USAGE_ACCESS_MISSING
        if (!canDrawOverlays()) issues += HealthIssue.OVERLAY_MISSING
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
            issues += HealthIssue.NOTIFICATIONS_BLOCKED
        }
        if (!isBatteryOptimizationIgnored()) issues += HealthIssue.BATTERY_OPTIMIZED
        return issues
    }

    private fun hasUsageAccess(): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
            }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    private fun canDrawOverlays(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)

    private fun isBatteryOptimizationIgnored(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
        val power = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        return power?.isIgnoringBatteryOptimizations(context.packageName) ?: true
    }
}
