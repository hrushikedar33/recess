package com.appblocker.service

import android.content.Context
import android.content.Intent
import android.util.Log
import com.appblocker.engine.EngineAction
import com.appblocker.notify.BreakIntents
import com.appblocker.notify.LimitAlerts
import com.appblocker.notify.LimitNotifier
import com.appblocker.notify.LimitPresenter
import com.appblocker.notify.TakeoverOverlay

/** Carries out the engine's decisions on a real device. Failures propagate: the ticker reports them. */
class AndroidActionSink(
    context: Context,
    private val notifier: LimitNotifier,
    private val alerts: LimitAlerts,
    private val takeover: TakeoverOverlay,
) : ActionSink {
    private val context = context.applicationContext

    private val presenter =
        LimitPresenter(
            notify = notifier::post,
            takeover = takeover::show,
            fallback = { this.context.startActivity(BreakIntents.intent(this.context)) },
            onError = { what, error -> Log.w("Recess", what, error) },
        )

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
     * and goals. The notification goes first so it exists whatever the takeover does; if the
     * takeover window cannot be drawn, the Break screen is opened instead.
     */
    override fun limitReached(event: EngineAction.NotifyLimitReached) {
        presenter.present(event.packageName, alerts.compose(event))
    }

    override fun blockEnded(event: EngineAction.BlockEnded) {
        notifier.cancel(event.packageName)
        takeover.dismiss(event.packageName)
    }
}
