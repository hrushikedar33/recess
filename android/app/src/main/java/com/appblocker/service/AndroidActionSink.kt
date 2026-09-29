package com.appblocker.service

import android.content.Context
import android.content.Intent
import com.appblocker.engine.EngineAction
import com.appblocker.notify.LimitNotifier

/** Carries out the engine's decisions on a real device. Failures propagate: the ticker reports them. */
class AndroidActionSink(
    context: Context,
    private val notifier: LimitNotifier,
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

    override fun limitReached(event: EngineAction.NotifyLimitReached) = notifier.post(event)

    override fun blockEnded(event: EngineAction.BlockEnded) = notifier.cancel(event.packageName)
}
