package com.appblocker.service

import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
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
    private val main = Handler(Looper.getMainLooper())

    private val presenter =
        LimitPresenter(
            notify = notifier::post,
            takeover = takeover::show,
            fallback = { this.context.startActivity(BreakIntents.intent(this.context)) },
            onError = { what, error -> Log.w("Recess", what, error) },
        )

    /**
     * Asks for the home screen. Best effort: many phones (this project was developed on a OnePlus
     * running Android 16) refuse to let a background service start any activity, HOME included, and
     * say so only in the system log. The ticker notices when it keeps not working and backs off;
     * [blockedAppInFront] is what actually keeps the app unusable.
     */
    override fun ejectToHome(packageName: String) {
        val home =
            Intent(Intent.ACTION_MAIN)
                .addCategory(Intent.CATEGORY_HOME)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(home)
    }

    /** Covers the blocked app on screen, unless a cover is already up for it. */
    override fun blockedAppInFront(packageName: String) {
        if (takeover.isShowingFor(packageName)) return
        val message = alerts.composeForBlock(packageName) ?: return
        takeover.show(packageName, message)
    }

    override fun foregroundChanged(packageName: String?) = takeover.onForeground(packageName)

    /**
     * Starts the Break screen on the main thread after [delayMs], giving the cover window time to be
     * drawn first: the phone only accepts a background activity start while a window of ours is
     * visible (its log says BAL_ALLOW_NON_APP_VISIBLE_WINDOW when that is what let it through).
     */
    override fun launchBreak(delayMs: Long) {
        main.postDelayed(
            {
                try {
                    context.startActivity(BreakIntents.intent(context))
                    Log.i("Recess", "Break screen requested")
                } catch (e: Exception) {
                    Log.w("Recess", "Could not start the Break screen", e)
                }
            },
            delayMs,
        )
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
