package com.appblocker.service

import android.app.ActivityManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.util.Log
import com.appblocker.detector.AndroidUsageEventSource
import com.appblocker.detector.ForegroundAppDetector
import com.appblocker.engine.CalendarDayClock
import com.appblocker.engine.EnforcementEngine
import com.appblocker.notify.LimitNotifier
import com.appblocker.store.RecessPrefs
import com.appblocker.store.RecessPrefsFactory
import java.text.DateFormat
import java.util.Date

/**
 * Runs the app-limit monitor without React Native, so it keeps working when the JS runtime is
 * gone. The decisions live in [MonitorTicker]; this class only supplies Android's pieces: a
 * foreground service (type specialUse, which has no time limit and may start after boot), a timer
 * thread, and screen on/off handling.
 *
 * A start command may come from the JS bridge, the system (sticky restart with a null intent) or,
 * later, boot and watchdog paths, so everything here is idempotent.
 */
class MonitorService : Service() {
    private lateinit var prefs: RecessPrefs
    private var thread: HandlerThread? = null
    private var handler: Handler? = null
    private var ticker: MonitorTicker? = null
    private var screenReceiver: BroadcastReceiver? = null
    private var loopStarted = false

    private val tickLoop =
        object : Runnable {
            override fun run() {
                val outcome = ticker?.tick() ?: return
                if (outcome.stop) {
                    Log.i(TAG, "Monitoring turned off; stopping the service")
                    stopSelf()
                    return
                }
                handler?.postDelayed(this, outcome.nextDelayMs)
            }
        }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        prefs = RecessPrefsFactory.get(this)
        recordPreviousProcessExit()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Promote to foreground first, whatever the reason for starting: Android kills the app if
        // this is not done within a few seconds of startForegroundService.
        if (!enterForeground()) {
            stopSelf()
            return START_NOT_STICKY
        }
        // Only a *known* off stops us. A missing intent may just be unreadable storage; the ticker
        // applies the same rule and reports it.
        if (!prefs.isMonitoringEnabled() && prefs.isIntentKnown()) {
            stopSelf()
            return START_NOT_STICKY
        }
        startLoopOnce()
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        prefs.recordStopReason("task_removed")
        super.onTaskRemoved(rootIntent)
    }

    /** Called by the system on Android 15+ when a foreground service type times out. */
    override fun onTimeout(startId: Int, fgsType: Int) {
        prefs.recordStopReason("fgs_timeout")
        stopSelf()
    }

    override fun onDestroy() {
        MonitorRuntime.isRunning = false
        screenReceiver?.let { runCatching { unregisterReceiver(it) } }
        screenReceiver = null
        handler?.removeCallbacksAndMessages(null)
        thread?.quitSafely()
        // Let an old loop finish before a new service instance can start one, so two never race.
        runCatching { thread?.join(JOIN_TIMEOUT_MS) }
        thread = null
        prefs.recordStopReason(if (prefs.isMonitoringEnabled()) "destroyed_while_enabled" else "stopped_by_user")
        super.onDestroy()
    }

    private fun enterForeground(): Boolean =
        try {
            val notification = MonitorNotification.build(this)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(
                    MonitorNotification.NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
                )
            } else {
                startForeground(MonitorNotification.NOTIFICATION_ID, notification)
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Could not enter the foreground", e)
            prefs.recordStopReason("start_foreground_failed: ${e.javaClass.simpleName}")
            false
        }

    private fun startLoopOnce() {
        if (loopStarted) return
        loopStarted = true
        MonitorRuntime.isRunning = true

        val worker = HandlerThread("RecessMonitor").also { it.start() }
        thread = worker
        handler = Handler(worker.looper)
        ticker = buildTicker()
        registerScreenReceiver()
        handler?.post(tickLoop)
        Log.i(TAG, "Monitor loop started")
    }

    private fun buildTicker(): MonitorTicker {
        val source = AndroidUsageEventSource(this)
        val detector = ForegroundAppDetector(source)
        return MonitorTicker(
            prefs = prefs,
            engine = EnforcementEngine(CalendarDayClock(), initialState = prefs.engineState()),
            pollForeground = detector::poll,
            isScreenOn = source::isInteractive,
            healthProbe = AndroidHealthProbe(this),
            sink = AndroidActionSink(this, LimitNotifier(this)),
            clock = System::currentTimeMillis,
            onError = { message, error -> Log.w(TAG, message, error) },
        )
    }

    /**
     * No polling while the screen is off: timers stall in deep sleep anyway, and there is nothing to
     * watch. One last tick with the screen off tells the engine nobody is in an app, so the time
     * away is not later credited to whatever was in front.
     */
    private fun registerScreenReceiver() {
        val receiver =
            object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    when (intent.action) {
                        Intent.ACTION_SCREEN_OFF -> pauseLoop()
                        Intent.ACTION_SCREEN_ON, Intent.ACTION_USER_PRESENT -> resumeLoop()
                    }
                }
            }
        val filter =
            IntentFilter().apply {
                addAction(Intent.ACTION_SCREEN_OFF)
                addAction(Intent.ACTION_SCREEN_ON)
                addAction(Intent.ACTION_USER_PRESENT)
            }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(receiver, filter)
        }
        screenReceiver = receiver
    }

    private fun pauseLoop() {
        val h = handler ?: return
        h.removeCallbacks(tickLoop)
        h.post { ticker?.tick() }
    }

    private fun resumeLoop() {
        val h = handler ?: return
        h.removeCallbacks(tickLoop)
        h.post(tickLoop)
    }

    /**
     * A killed process cannot say why it died, so read the previous exit at the next start. Only
     * an exit after the last heartbeat means it died while monitoring.
     */
    private fun recordPreviousProcessExit() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return
        try {
            val manager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val exit = manager.getHistoricalProcessExitReasons(packageName, 0, 1).firstOrNull() ?: return
            if (exit.timestamp <= (prefs.lastHeartbeatAt() ?: 0L)) return
            prefs.recordStopReason(
                ExitReasonFormatter.describe(exit.reason, exit.timestamp) {
                    DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date(it))
                },
            )
        } catch (e: Exception) {
            Log.w(TAG, "Could not read the previous process exit", e)
        }
    }

    private companion object {
        const val TAG = "Recess"
        const val JOIN_TIMEOUT_MS = 1_000L
    }
}
