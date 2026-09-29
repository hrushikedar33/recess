package com.appblocker.service

import android.content.Context
import android.content.Intent
import android.util.Log
import com.appblocker.engine.EngineAction
import com.appblocker.notify.BreakIntents
import com.appblocker.notify.LimitAlerts
import com.appblocker.notify.LimitNotifier

/** Carries out the engine's decisions on a real device. Failures propagate: the ticker reports them. */
class AndroidActionSink(
    context: Context,
    private val notifier: LimitNotifier,
    private val alerts: LimitAlerts,
) : ActionSink {
    private val context = context.applicationContext

    /**
     * Sends the user to the home screen. This relies on the "Display over other apps" permission,
     * which is what lets a background service start an activity; without it the OS silently drops
     * the intent, which the ticker's eject verification and the health probe then surface.
     */
    override fun ejectToHome(packageName: String) {
        val home =
            Intent(Intent.ACTION_MAIN)
                .addCategory(Intent.CATEGORY_HOME)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(home)
    }

    /**
     * Once per block: one notification and one full-screen takeover, both showing the same quote
     * and goals. The notification is posted first so it exists even if the takeover is refused.
     */
    override fun limitReached(event: EngineAction.NotifyLimitReached) {
        notifier.post(event.packageName, alerts.compose(event))
        try {
            context.startActivity(BreakIntents.intent(context))
        } catch (e: Exception) {
            Log.w("Recess", "Could not take over the screen; the notification remains", e)
        }
    }

    override fun blockEnded(event: EngineAction.BlockEnded) = notifier.cancel(event.packageName)
}
