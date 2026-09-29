package com.appblocker.service

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/** The one place that starts and stops the monitor service. */
object MonitorServiceController {
    /** Throws if Android refuses to start it (for example when the app is not visible). */
    fun start(context: Context) {
        val app = context.applicationContext
        ContextCompat.startForegroundService(app, Intent(app, MonitorService::class.java))
    }

    fun stop(context: Context) {
        val app = context.applicationContext
        app.stopService(Intent(app, MonitorService::class.java))
    }
}
